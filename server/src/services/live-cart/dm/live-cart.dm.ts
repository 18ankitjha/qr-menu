import { ERROR_MESSAGES } from '../../../config/constants';
import { createAppError } from '../../../middlewares/error.middleware';
import { logger } from '../../../utils/logger';
import { CartPublisher, ICartState } from '../../realtime';
import { OrderDM, IOrder } from '../../order';
import { TableSessionDM, TableSessionStatus, TABLE_SESSION_MESSAGES, ITableSession } from '../../table-session';
import { CART_LINE_KEY, LIVE_CART_LIMITS } from '../constants/live-cart.constants';
import { ICartActor, ICartChange, ILiveCart, ILiveCartLine } from '../interfaces/live-cart.interface';
import { ICartStore, memoryCartStore } from '../store/cart.store';
import { memberKey } from '../utils/member-key.util';
import { getOrderableMenu, pruneDishCache } from './dish-cache';

// ============================================================
// Live Cart DM — the shared table cart while diners pick food.
//
//   tap +/- on a phone ──socket──► applyChanges (memory, ~1ms) ──► cart_updated to every phone at the table
//   open Cart tab      ──REST───► sync (memory + DB snapshot)
//   place order        ──REST───► placeOrder (snapshot empty cart → create order → put lines back on failure)
//
// The DB holds a snapshot (TableSession.cart): written on Cart open, before an order, every ~30s while the
// cart changes, and on shutdown. A crash loses at most ~30s of picks; phones resend what they still hold.
// Every change to one session's cart runs under that session's lock, so edits never interleave.
// ============================================================

const store: ICartStore = memoryCartStore;
const { MAX_LINE_QUANTITY, MAX_LINES } = LIVE_CART_LIMITS;

// ---------------------------------------------------------------- per-session lock

const queues = new Map<string, Promise<unknown>>();

const withLock = <T>(sessionId: string, task: () => Promise<T>): Promise<T> => {
  const run = (queues.get(sessionId) ?? Promise.resolve()).then(task);
  const tail = run.then(
    () => undefined,
    () => undefined
  );
  queues.set(sessionId, tail);
  void tail.then(() => {
    if (queues.get(sessionId) === tail) queues.delete(sessionId);
  });
  return run;
};

// ---------------------------------------------------------------- helpers

/** Time-based so it keeps growing across server restarts (phones ignore anything older than what they saw). */
const nextVersion = (version: number): number => Math.max(version + 1, Date.now());

const round2 = (n: number): number => Math.round(n * 100) / 100;

const keyOf = (cart: ILiveCart, line: ILiveCartLine): string =>
  `${memberKey(cart.sessionId, line.customerId)}.${line.dishId}`;

export const stateOf = (cart: ILiveCart, changedBy?: string): ICartState => ({
  sessionId: cart.sessionId,
  version: cart.version,
  lines: cart.lines.map((l) => ({
    key: keyOf(cart, l),
    dishId: l.dishId,
    dishName: l.dishName,
    price: l.price,
    quantity: l.quantity,
    notes: l.notes,
    by: l.name,
  })),
  total: round2(cart.lines.reduce((sum, l) => sum + l.price * l.quantity, 0)),
  changedBy,
});

const membersOf = (session: ITableSession): Record<string, string> =>
  Object.fromEntries(session.members.map((m) => [m.customerId.toString(), m.name]));

/** Build from the session's DB snapshot. One diner's lines for one dish are merged into one line. */
const fromSession = (session: ITableSession): ILiveCart => {
  const lines: ILiveCartLine[] = [];
  for (const l of session.cart) {
    const customerId = l.addedBy.customerId.toString();
    const dishId = l.dishId.toString();
    const same = lines.find((x) => x.customerId === customerId && x.dishId === dishId);
    if (same) {
      same.quantity = Math.min(MAX_LINE_QUANTITY, same.quantity + l.quantity);
      same.notes = [same.notes, l.notes].filter(Boolean).join('; ') || undefined;
      continue;
    }
    lines.push({
      customerId,
      name: l.addedBy.name,
      dishId,
      dishName: l.dishName,
      price: l.price,
      quantity: l.quantity,
      notes: l.notes || undefined,
      addedAt: new Date(l.addedAt).getTime(),
    });
  }
  return {
    sessionId: session._id.toString(),
    restaurantId: session.restaurantId.toString(),
    tableId: session.tableId.toString(),
    members: membersOf(session),
    lines,
    // A fresh load always outranks whatever phones saw before (e.g. edits lost in a crash)
    version: nextVersion(session.cartVersion ?? 0),
    dirty: false,
    touchedAt: Date.now(),
  };
};

/** The live cart of an open session, loaded from its DB snapshot the first time. Refreshes who may edit it.
 * Call under the session's lock. */
const ensure = async (session: ITableSession): Promise<ILiveCart | null> => {
  const sessionId = session._id.toString();
  if (session.status !== TableSessionStatus.OPEN) {
    await store.delete(sessionId);
    return null;
  }
  const cart = (await store.get(sessionId)) ?? fromSession(session);
  cart.members = membersOf(session);
  cart.touchedAt = Date.now();
  await store.set(cart);
  return cart;
};

/** The cart `actor` wants to edit; re-reads the session once if they joined after it was loaded. */
const cartForEdit = async (sessionId: string, actor: ICartActor): Promise<ILiveCart> => {
  const cached = await store.get(sessionId);
  if (cached?.members[actor.customerId]) return cached;
  const session = await TableSessionDM.getSessionForMember(sessionId, actor.customerId); // 404 / 403
  const cart = await ensure(session);
  if (!cart) throw createAppError(TABLE_SESSION_MESSAGES.SESSION_CLOSED, 409);
  return cart;
};

const bump = (cart: ILiveCart): void => {
  cart.version = nextVersion(cart.version);
  cart.dirty = true;
  cart.touchedAt = Date.now();
};

/** Write the cart to the DB now (if it changed). Forgets it if the session closed meanwhile → false. */
const snapshot = async (cart: ILiveCart): Promise<boolean> => {
  if (!cart.dirty) return true;
  const open = await TableSessionDM.saveCart(cart.sessionId, cart.lines, cart.version);
  if (!open) {
    await store.delete(cart.sessionId);
    return false;
  }
  cart.dirty = false;
  await store.set(cart);
  return true;
};

/**
 * Apply edits. Anyone at the table may change or remove any line (it's a shared cart); a NEW line can only
 * be added by its owner (the key's member key) and only for a dish that is on the menu and available.
 * Returns the dish ids that could not be added.
 */
const applyTo = async (
  cart: ILiveCart,
  actor: ICartActor,
  changes: ICartChange[]
): Promise<{ changed: boolean; skipped: string[] }> => {
  const mine = memberKey(cart.sessionId, actor.customerId);
  const byKey = new Map(cart.lines.map((l) => [keyOf(cart, l), l]));
  const menu = changes.some((c) => c.quantity > 0) ? await getOrderableMenu(cart.restaurantId) : null;
  if (menu && !menu.orderingEnabled) throw createAppError(TABLE_SESSION_MESSAGES.ORDERING_DISABLED, 403);

  let changed = false;
  const skipped: string[] = [];
  for (const { key, quantity } of changes) {
    const match = CART_LINE_KEY.exec(key);
    if (!match) continue;
    const [, owner, dishId] = match;
    const line = byKey.get(key);
    if (line) {
      if (line.quantity === quantity) continue;
      if (quantity === 0) {
        cart.lines = cart.lines.filter((l) => l !== line);
        byKey.delete(key);
      } else {
        line.quantity = quantity;
      }
      changed = true;
      continue;
    }
    if (quantity === 0 || owner !== mine || !menu) continue;
    const dish = menu.dishes.get(dishId);
    if (!dish || cart.lines.length >= MAX_LINES) {
      skipped.push(dishId);
      continue;
    }
    const added: ILiveCartLine = {
      customerId: actor.customerId,
      name: actor.name,
      dishId,
      dishName: dish.name,
      price: dish.price,
      quantity,
      addedAt: Date.now(),
    };
    cart.lines.push(added);
    byKey.set(key, added);
    changed = true;
  }
  return { changed, skipped };
};

export interface ICartEditResult {
  state: ICartState;
  changed: boolean;
  skipped: string[];
}

// ---------------------------------------------------------------- reading

/** The cart shown with a diner's session (join / GET / after an order). Null once the session is closed. */
export const getState = (session: ITableSession): Promise<ICartState | null> =>
  withLock(session._id.toString(), async () => {
    const cart = await ensure(session);
    return cart ? stateOf(cart) : null;
  });

/** For a phone joining the cart room: answered from memory when possible, so reconnects cost no DB read.
 * Throws 404 / 403 if the diner is not in the session; null if it is closed. */
export const getStateForMember = async (sessionId: string, customerId: string): Promise<ICartState | null> => {
  const cached = await store.get(sessionId);
  if (cached?.members[customerId]) {
    cached.touchedAt = Date.now();
    return stateOf(cached);
  }
  return getState(await TableSessionDM.getSessionForMember(sessionId, customerId));
};

// ---------------------------------------------------------------- editing

/** A diner's taps (socket): memory only, pushed to the table at once; saved to the DB within ~30s. */
export const applyChanges = (sessionId: string, actor: ICartActor, changes: ICartChange[]): Promise<ICartEditResult> =>
  withLock(sessionId, async () => {
    const cart = await cartForEdit(sessionId, actor);
    const { changed, skipped } = await applyTo(cart, actor, changes);
    if (changed) {
      bump(cart);
      await store.set(cart);
    }
    const state = stateOf(cart, memberKey(sessionId, actor.customerId));
    if (changed) CartPublisher.cartUpdated(state);
    return { state, changed, skipped };
  });

/**
 * Cart tab opened (or the socket is down): apply any edits the phone still holds, push them, and save the
 * cart to the DB now. `session` must come from getSessionForMember (proves the diner is at the table).
 * Null if the session is closed.
 */
export const sync = (session: ITableSession, actor: ICartActor, changes: ICartChange[]): Promise<ICartEditResult | null> =>
  withLock(session._id.toString(), async () => {
    const cart = await ensure(session);
    if (!cart) return null;
    const { changed, skipped } = changes.length
      ? await applyTo(cart, actor, changes)
      : { changed: false, skipped: [] as string[] };
    if (changed) bump(cart);
    await store.set(cart);
    const state = stateOf(cart, memberKey(cart.sessionId, actor.customerId));
    if (changed) CartPublisher.cartUpdated(state);
    try {
      if (!(await snapshot(cart))) return null;
    } catch (error) {
      logger.warn(`[live-cart] snapshot of ${cart.sessionId} failed (will retry)`, (error as Error).message);
    }
    return { state, changed, skipped };
  });

// ---------------------------------------------------------------- ordering

/** Put lines back after a failed order (merged with anything added meanwhile). */
const restore = (sessionId: string, lines: ILiveCartLine[], changedBy: string): Promise<void> =>
  withLock(sessionId, async () => {
    const cart = await store.get(sessionId);
    if (!cart) return;
    const merged = lines.map((l) => ({ ...l }));
    for (const l of cart.lines) {
      const same = merged.find((x) => x.customerId === l.customerId && x.dishId === l.dishId);
      if (same) same.quantity = Math.min(MAX_LINE_QUANTITY, same.quantity + l.quantity);
      else if (merged.length < MAX_LINES) merged.push(l);
    }
    cart.lines = merged;
    bump(cart);
    await store.set(cart);
    CartPublisher.cartUpdated(stateOf(cart, changedBy));
    await snapshot(cart);
  });

/**
 * Send the whole shared cart to the kitchen as one order — only if it is still at `cartVersion` (what the
 * diner reviewed), otherwise 409 and nothing is ordered. The emptied cart is saved BEFORE the order is
 * created, so a crash can never order the same food twice; if the order fails the lines are put back.
 */
export const placeOrder = async (
  session: ITableSession,
  actor: ICartActor,
  cartVersion: number,
  specialInstructions?: string
): Promise<IOrder> => {
  const sessionId = session._id.toString();
  const by = memberKey(sessionId, actor.customerId);

  const taken = await withLock(sessionId, async () => {
    const cart = await ensure(session);
    if (!cart) throw createAppError(TABLE_SESSION_MESSAGES.SESSION_CLOSED, 409);
    if (cart.lines.length === 0) throw createAppError(TABLE_SESSION_MESSAGES.CART_EMPTY, 400);
    if (cart.version !== cartVersion) throw createAppError(TABLE_SESSION_MESSAGES.CART_CHANGED, 409);
    if (!(await getOrderableMenu(cart.restaurantId)).orderingEnabled) {
      throw createAppError(TABLE_SESSION_MESSAGES.ORDERING_DISABLED, 403);
    }
    const version = nextVersion(cart.version);
    if (!(await TableSessionDM.saveCart(sessionId, [], version))) {
      await store.delete(sessionId);
      throw createAppError(TABLE_SESSION_MESSAGES.SESSION_CLOSED, 409);
    }
    const lines = cart.lines;
    cart.lines = [];
    cart.version = version;
    cart.dirty = false;
    cart.touchedAt = Date.now();
    await store.set(cart);
    CartPublisher.cartUpdated(stateOf(cart, by));
    return { lines, restaurantId: cart.restaurantId, tableId: cart.tableId };
  });

  try {
    const contributors = [...new Set(taken.lines.map((l) => l.name))];
    return await OrderDM.placeOrder({
      restaurantId: taken.restaurantId,
      tableId: taken.tableId,
      items: taken.lines.map((l) => ({ dishId: l.dishId, quantity: l.quantity, notes: l.notes, addedBy: l.name })),
      customerName: contributors.join(', ').slice(0, 200),
      specialInstructions: specialInstructions?.trim() || undefined,
    });
  } catch (error) {
    await restore(sessionId, taken.lines, by).catch((e) =>
      logger.error(`[live-cart] could not put the cart back for ${sessionId}`, (e as Error).message)
    );
    throw error;
  }
};

// ---------------------------------------------------------------- lifecycle

/** The session closed (billed / cleared by staff): forget its cart. */
export const drop = (sessionId: string): Promise<void> => withLock(sessionId, () => store.delete(sessionId));

/** Save changed carts; forget carts idle for EVICT_AFTER_MS (they reload from the DB on next use). */
const sweep = async (): Promise<void> => {
  const now = Date.now();
  for (const { sessionId } of await store.all()) {
    await withLock(sessionId, async () => {
      const cart = await store.get(sessionId);
      if (!cart) return;
      try {
        if (!(await snapshot(cart))) return;
        if (now - cart.touchedAt > LIVE_CART_LIMITS.EVICT_AFTER_MS) await store.delete(sessionId);
      } catch (error) {
        logger.warn(`[live-cart] snapshot of ${sessionId} failed (will retry)`, (error as Error).message);
      }
    });
  }
  pruneDishCache();
};

let sweeper: NodeJS.Timeout | null = null;

/** Start the write-behind timer (server.ts, at startup). */
export const start = (): void => {
  if (sweeper) return;
  sweeper = setInterval(() => void sweep(), LIVE_CART_LIMITS.FLUSH_EVERY_MS);
  sweeper.unref();
};

/** Save every changed cart now (server.ts, on shutdown). */
export const flushAll = async (): Promise<void> => {
  if (sweeper) clearInterval(sweeper);
  sweeper = null;
  await sweep().catch((error) => logger.error(ERROR_MESSAGES.INTERNAL_ERROR, (error as Error).message));
};
