import { Types } from 'mongoose';
import { TableSessionModel } from './table-session.model';
import {
  IAddToCartInput,
  ICartLine,
  IDiner,
  IMyCartItem,
  ITableRef,
  ITableSession,
} from '../interfaces/table-session.interface';
import {
  SessionCloseReason,
  TABLE_SESSION_LIMITS,
  TABLE_SESSION_MESSAGES,
  TableAlertType,
  TableSessionStatus,
} from '../constants/table-session.constants';
import { ERROR_MESSAGES } from '../../../config/constants';
import { createAppError } from '../../../middlewares/error.middleware';
import { TableDM, ITable } from '../../table';
import { DishDM, MenuDM } from '../../menu';
import { OrderDM, IOrder } from '../../order';

// ============================================================
// Table Session DM — everyone at one table shares a live cart; any of them can send it to the kitchen.
// All cart writes are single atomic updates on the session document, so two phones editing at once
// never lose an item; `cartVersion` makes "place order" fail if the cart changed after the diner looked.
// ============================================================

const isDuplicateKey = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;

const memberFilter = (sessionId: string, customerId: string) => ({
  _id: sessionId,
  status: TableSessionStatus.OPEN,
  'members.customerId': new Types.ObjectId(customerId),
});

// ---------------------------------------------------------------- tables

/**
 * The table a diner scanned. Old id-based links only work until the owner regenerates the
 * table's QR (which gives it a token) — after that the id link is rejected.
 */
export const resolveTable = async (ref: ITableRef): Promise<ITable> => {
  let table: ITable | null;
  if ('qrToken' in ref) {
    table = await TableDM.getTableByQrToken(ref.qrToken);
    if (!table) throw createAppError(TABLE_SESSION_MESSAGES.INVALID_QR, 404);
  } else {
    table = Types.ObjectId.isValid(ref.tableId) ? await TableDM.getTableById(ref.tableId) : null;
    if (!table || table.restaurantId.toString() !== ref.restaurantId) {
      throw createAppError(TABLE_SESSION_MESSAGES.INVALID_QR, 404);
    }
    if (table.qrToken) throw createAppError(TABLE_SESSION_MESSAGES.QR_REPLACED, 410);
  }
  if (!table.isActive) throw createAppError(ERROR_MESSAGES.TABLE_NOT_FOUND, 404);
  return table;
};

// ---------------------------------------------------------------- reading

export const getSessionById = async (sessionId: string): Promise<ITableSession | null> =>
  Types.ObjectId.isValid(sessionId) ? TableSessionModel.findById(sessionId).lean<ITableSession>() : null;

const isMember = (session: ITableSession, customerId: string): boolean =>
  session.members.some((m) => m.customerId.toString() === customerId);

/** The session, if this diner is in it (open or closed). */
export const getSessionForMember = async (sessionId: string, customerId: string): Promise<ITableSession> => {
  const session = await getSessionById(sessionId);
  if (!session) throw createAppError(TABLE_SESSION_MESSAGES.SESSION_NOT_FOUND, 404);
  if (!isMember(session, customerId)) throw createAppError(TABLE_SESSION_MESSAGES.NOT_A_MEMBER, 403);
  return session;
};

export const getOpenSessionForTable = async (tableId: string): Promise<ITableSession | null> =>
  TableSessionModel.findOne({ tableId, status: TableSessionStatus.OPEN }).lean<ITableSession>();

/**
 * Orders that belong to the session: while open, the table's current (unbilled) orders — including ones a
 * waiter placed for the table; once billed, exactly the orders on that bill.
 */
export const getSessionOrders = async (session: ITableSession): Promise<IOrder[]> => {
  if (session.status === TableSessionStatus.OPEN) {
    return (await OrderDM.getOrdersForTable(session.tableId.toString())).orders;
  }
  return session.billId ? OrderDM.getOrdersByBillId(session.billId.toString()) : [];
};

/** Open tables with diners for the staff screens (alerts first). */
export const getOpenSessionsForRestaurant = async (restaurantId: string): Promise<ITableSession[]> => {
  const sessions = await TableSessionModel.find({ restaurantId, status: TableSessionStatus.OPEN })
    .sort({ tableNumber: 1 })
    .lean<ITableSession[]>();
  const alertAt = (s: ITableSession) =>
    Math.min(s.billRequested?.at?.getTime() ?? Infinity, s.waiterCalled?.at?.getTime() ?? Infinity);
  return sessions.sort((a, b) => (alertAt(a) === alertAt(b) ? 0 : alertAt(a) < alertAt(b) ? -1 : 1));
};

// ---------------------------------------------------------------- joining

/** Closes an open session nobody touched for IDLE_HOURS, if nothing on the table is waiting to be billed. */
const closeIfIdle = async (session: ITableSession): Promise<boolean> => {
  const idleSince = Date.now() - TABLE_SESSION_LIMITS.IDLE_HOURS * 60 * 60 * 1000;
  if (session.lastActivityAt.getTime() > idleSince) return false;
  const { unbilledCount } = await OrderDM.getOrdersForTable(session.tableId.toString());
  if (unbilledCount > 0) return false;
  const result = await TableSessionModel.updateOne(
    { _id: session._id, status: TableSessionStatus.OPEN, lastActivityAt: session.lastActivityAt },
    { status: TableSessionStatus.CLOSED, closedAt: new Date(), closedReason: SessionCloseReason.IDLE }
  );
  return result.modifiedCount === 1;
};

/**
 * Put the diner at the table: join its open session, or open one. Everyone who scans the same table's QR
 * while it is open shares the same cart and bill.
 */
export const joinTable = async (table: ITable, diner: IDiner): Promise<ITableSession> => {
  const tableId = table._id.toString();
  const member = {
    customerId: new Types.ObjectId(diner.customerId),
    name: diner.name,
    profilePicture: diner.profilePicture,
    joinedAt: new Date(),
  };

  for (let attempt = 0; attempt < TABLE_SESSION_LIMITS.WRITE_RETRIES; attempt++) {
    const open = await getOpenSessionForTable(tableId);

    if (open && !(await closeIfIdle(open))) {
      if (isMember(open, diner.customerId)) return open;
      const joined = await TableSessionModel.findOneAndUpdate(
        { _id: open._id, status: TableSessionStatus.OPEN, 'members.customerId': { $ne: member.customerId } },
        { $push: { members: member }, $set: { lastActivityAt: new Date() } },
        { new: true }
      ).lean<ITableSession>();
      if (joined) return joined;
      continue; // closed or joined concurrently — look again
    }

    try {
      const created = await TableSessionModel.create({
        restaurantId: table.restaurantId,
        tableId: table._id,
        tableNumber: table.tableNumber,
        members: [member],
      });
      return created.toObject() as unknown as ITableSession;
    } catch (error) {
      if (!isDuplicateKey(error)) throw error; // someone else opened it first — join theirs
    }
  }
  throw createAppError(TABLE_SESSION_MESSAGES.BUSY, 503);
};

// ---------------------------------------------------------------- cart

/** Explains why a conditional update on the session matched nothing. */
const failureFor = async (sessionId: string, customerId: string) => {
  const session = await getSessionForMember(sessionId, customerId); // 404 / 403
  if (session.status !== TableSessionStatus.OPEN) {
    return createAppError(TABLE_SESSION_MESSAGES.SESSION_CLOSED, 409);
  }
  return null;
};

const loadDishForSession = async (session: ITableSession, dishId: string) => {
  const [dish, menu] = await Promise.all([
    Types.ObjectId.isValid(dishId) ? DishDM.getDishById(dishId) : null,
    MenuDM.getMenuByRestaurantId(session.restaurantId.toString()),
  ]);
  if (!dish || !menu || dish.menuId.toString() !== menu._id.toString()) {
    throw createAppError(TABLE_SESSION_MESSAGES.DISH_NOT_ON_MENU, 400);
  }
  if (!dish.isAvailable) throw createAppError(TABLE_SESSION_MESSAGES.DISH_UNAVAILABLE(dish.name), 400);
  return dish;
};

/**
 * Add a dish to the shared cart. If the same diner already has that dish (same notes) the quantity grows,
 * otherwise a new line credited to them is added.
 */
export const addToCart = async (sessionId: string, diner: IDiner, input: IAddToCartInput): Promise<void> => {
  const session = await getSessionForMember(sessionId, diner.customerId);
  if (session.status !== TableSessionStatus.OPEN) {
    throw createAppError(TABLE_SESSION_MESSAGES.SESSION_CLOSED, 409);
  }
  const dish = await loadDishForSession(session, input.dishId);
  const { MAX_LINE_QUANTITY, MAX_CART_LINES } = TABLE_SESSION_LIMITS;
  const notes = input.notes?.trim() || undefined;
  const sameLine = {
    dishId: dish._id,
    'addedBy.customerId': new Types.ObjectId(diner.customerId),
    notes: notes ?? null,
  };
  const now = new Date();

  for (let attempt = 0; attempt < TABLE_SESSION_LIMITS.WRITE_RETRIES; attempt++) {
    // arrayFilters (not `cart.$`): the filter also matches the members array, which makes `$` ambiguous
    const grown = await TableSessionModel.updateOne(
      {
        ...memberFilter(sessionId, diner.customerId),
        cart: { $elemMatch: { ...sameLine, quantity: { $lte: MAX_LINE_QUANTITY - input.quantity } } },
      },
      { $inc: { 'cart.$[line].quantity': input.quantity, cartVersion: 1 }, $set: { lastActivityAt: now } },
      {
        arrayFilters: [
          {
            'line.dishId': sameLine.dishId,
            'line.addedBy.customerId': sameLine['addedBy.customerId'],
            'line.notes': sameLine.notes,
            'line.quantity': { $lte: MAX_LINE_QUANTITY - input.quantity },
          },
        ],
      }
    );
    if (grown.modifiedCount === 1) return;

    const added = await TableSessionModel.updateOne(
      {
        ...memberFilter(sessionId, diner.customerId),
        cart: { $not: { $elemMatch: sameLine } },
        [`cart.${MAX_CART_LINES - 1}`]: { $exists: false },
      },
      {
        $push: {
          cart: {
            dishId: dish._id,
            dishName: dish.name,
            price: dish.price,
            quantity: input.quantity,
            notes,
            addedBy: { customerId: new Types.ObjectId(diner.customerId), name: diner.name },
            addedAt: now,
          },
        },
        $inc: { cartVersion: 1 },
        $set: { lastActivityAt: now },
      }
    );
    if (added.modifiedCount === 1) return;

    // Neither matched: closed, line at max, cart full — or a concurrent write; re-check and retry
    const failure = await failureFor(sessionId, diner.customerId);
    if (failure) throw failure;
    const current = (await getSessionById(sessionId))!;
    const line = current.cart.find(
      (l) =>
        l.dishId.toString() === dish._id.toString() &&
        l.addedBy.customerId.toString() === diner.customerId &&
        (l.notes ?? null) === (notes ?? null)
    );
    if (line && line.quantity + input.quantity > MAX_LINE_QUANTITY) {
      throw createAppError(TABLE_SESSION_MESSAGES.MAX_QUANTITY(MAX_LINE_QUANTITY), 400);
    }
    if (!line && current.cart.length >= MAX_CART_LINES) {
      throw createAppError(TABLE_SESSION_MESSAGES.CART_FULL, 400);
    }
  }
  throw createAppError(TABLE_SESSION_MESSAGES.BUSY, 503);
};

/** Change any line's quantity (it's a shared cart — anyone at the table may edit it). 0 removes the line. */
export const setCartLineQuantity = async (
  sessionId: string,
  diner: IDiner,
  lineId: string,
  quantity: number
): Promise<void> => {
  const lineObjectId = new Types.ObjectId(lineId);
  const now = new Date();
  const result =
    quantity === 0
      ? await TableSessionModel.updateOne(
          { ...memberFilter(sessionId, diner.customerId), 'cart._id': lineObjectId },
          { $pull: { cart: { _id: lineObjectId } }, $inc: { cartVersion: 1 }, $set: { lastActivityAt: now } }
        )
      : await TableSessionModel.updateOne(
          { ...memberFilter(sessionId, diner.customerId), 'cart._id': lineObjectId },
          { $set: { 'cart.$[line].quantity': quantity, lastActivityAt: now }, $inc: { cartVersion: 1 } },
          { arrayFilters: [{ 'line._id': lineObjectId }] }
        );
  if (result.matchedCount === 1) return;

  const failure = await failureFor(sessionId, diner.customerId);
  throw failure ?? createAppError(TABLE_SESSION_MESSAGES.CART_ITEM_NOT_FOUND, 404);
};

/**
 * Apply a diner's menu-page picks in one go: for each dish, set the quantity of their own plain line
 * (0 removes it, a new dish adds a line). Dishes that are no longer on the menu / available are left out.
 * Read-modify-write guarded by `cartVersion`, so a concurrent edit by someone else is retried, never lost.
 */
export const setMyCartQuantities = async (
  sessionId: string,
  diner: IDiner,
  items: IMyCartItem[]
): Promise<void> => {
  const wanted = new Map(items.map((i) => [i.dishId, i.quantity]));
  const isMinePlain = (l: ICartLine) => l.addedBy.customerId.toString() === diner.customerId && !l.notes;
  let orderable: Map<string, { _id: Types.ObjectId; name: string; price: number }> | null = null;

  for (let attempt = 0; attempt < TABLE_SESSION_LIMITS.WRITE_RETRIES; attempt++) {
    const session = await getSessionForMember(sessionId, diner.customerId);
    if (session.status !== TableSessionStatus.OPEN) {
      throw createAppError(TABLE_SESSION_MESSAGES.SESSION_CLOSED, 409);
    }
    if (!orderable) {
      const ids = [...wanted.keys()].filter((id) => Types.ObjectId.isValid(id));
      const [dishes, menu] = await Promise.all([
        DishDM.getDishesByIds(ids),
        MenuDM.getMenuByRestaurantId(session.restaurantId.toString()),
      ]);
      orderable = new Map(
        dishes
          .filter((d) => menu && d.isAvailable && d.menuId.toString() === menu._id.toString())
          .map((d) => [d._id.toString(), { _id: d._id as Types.ObjectId, name: d.name, price: d.price }])
      );
    }

    const now = new Date();
    const handled = new Set<string>();
    let changed = false;
    const cart: ICartLine[] = [];
    for (const line of session.cart) {
      const dishId = line.dishId.toString();
      if (!isMinePlain(line) || !wanted.has(dishId) || handled.has(dishId)) {
        cart.push(line);
        continue;
      }
      handled.add(dishId);
      const quantity = wanted.get(dishId)!;
      if (quantity !== line.quantity) changed = true;
      if (quantity > 0) cart.push({ ...line, quantity });
    }
    for (const [dishId, quantity] of wanted) {
      const dish = orderable.get(dishId);
      if (handled.has(dishId) || quantity <= 0 || !dish) continue;
      changed = true;
      cart.push({
        _id: new Types.ObjectId(),
        dishId: dish._id,
        dishName: dish.name,
        price: dish.price,
        quantity,
        addedBy: { customerId: new Types.ObjectId(diner.customerId), name: diner.name },
        addedAt: now,
      });
    }
    if (!changed) return;
    if (cart.length > TABLE_SESSION_LIMITS.MAX_CART_LINES) {
      throw createAppError(TABLE_SESSION_MESSAGES.CART_FULL, 400);
    }

    const result = await TableSessionModel.updateOne(
      { ...memberFilter(sessionId, diner.customerId), cartVersion: session.cartVersion },
      { $set: { cart, lastActivityAt: now }, $inc: { cartVersion: 1 } }
    );
    if (result.modifiedCount === 1) return;
  }
  throw createAppError(TABLE_SESSION_MESSAGES.BUSY, 503);
};

/**
 * Send the whole shared cart to the kitchen as one order. The cart is taken atomically and only if it is
 * still at `cartVersion` (what the diner reviewed) — otherwise 409 and nothing is ordered. If the order
 * can't be created (e.g. a dish just ran out) the cart lines are put back.
 */
export const placeCartOrder = async (
  sessionId: string,
  diner: IDiner,
  cartVersion: number,
  specialInstructions?: string
): Promise<IOrder> => {
  const taken = await TableSessionModel.findOneAndUpdate(
    { ...memberFilter(sessionId, diner.customerId), cartVersion, 'cart.0': { $exists: true } },
    { $set: { cart: [], lastActivityAt: new Date() }, $inc: { cartVersion: 1 } },
    { new: false }
  ).lean<ITableSession>();

  if (!taken) {
    const failure = await failureFor(sessionId, diner.customerId);
    if (failure) throw failure;
    const current = (await getSessionById(sessionId))!;
    throw current.cart.length === 0
      ? createAppError(TABLE_SESSION_MESSAGES.CART_EMPTY, 400)
      : createAppError(TABLE_SESSION_MESSAGES.CART_CHANGED, 409);
  }

  const contributors = [...new Set(taken.cart.map((l) => l.addedBy.name))];
  try {
    return await OrderDM.placeOrder({
      restaurantId: taken.restaurantId.toString(),
      tableId: taken.tableId.toString(),
      items: taken.cart.map((l: ICartLine) => ({
        dishId: l.dishId.toString(),
        quantity: l.quantity,
        notes: l.notes,
        addedBy: l.addedBy.name,
      })),
      customerName: contributors.join(', ').slice(0, 200),
      specialInstructions: specialInstructions?.trim() || undefined,
    });
  } catch (error) {
    await TableSessionModel.updateOne(
      { _id: sessionId, status: TableSessionStatus.OPEN },
      { $push: { cart: { $each: taken.cart } }, $inc: { cartVersion: 1 } }
    );
    throw error;
  }
};

// ---------------------------------------------------------------- alerts

const alertField = (type: TableAlertType) => (type === TableAlertType.BILL ? 'billRequested' : 'waiterCalled');
const lastAlertField = (type: TableAlertType) =>
  type === TableAlertType.BILL ? 'lastBillRequestAt' : 'lastWaiterCallAt';

/** How long until this table may raise `type` again (0 = now). */
export const alertCooldownLeftMs = (session: ITableSession, type: TableAlertType, now = Date.now()): number => {
  const last = session[lastAlertField(type)];
  return last ? Math.max(0, new Date(last).getTime() + TABLE_SESSION_LIMITS.ALERT_COOLDOWN_MS - now) : 0;
};

/** Diner asks for the bill / calls a waiter — at most once per cooldown window per table. */
export const raiseAlert = async (sessionId: string, diner: IDiner, type: TableAlertType): Promise<ITableSession> => {
  const now = new Date();
  const last = lastAlertField(type);
  const cutoff = new Date(now.getTime() - TABLE_SESSION_LIMITS.ALERT_COOLDOWN_MS);
  const session = await TableSessionModel.findOneAndUpdate(
    { ...memberFilter(sessionId, diner.customerId), $or: [{ [last]: null }, { [last]: { $lte: cutoff } }] },
    { $set: { [alertField(type)]: { at: now, by: diner.name }, [last]: now, lastActivityAt: now } },
    { new: true }
  ).lean<ITableSession>();
  if (session) return session;

  const failure = await failureFor(sessionId, diner.customerId);
  if (failure) throw failure;
  const current = await getSessionById(sessionId);
  const leftMs = current ? alertCooldownLeftMs(current, type, now.getTime()) : 0;
  if (leftMs > 0) {
    throw createAppError(TABLE_SESSION_MESSAGES.ALERT_COOLDOWN(type, Math.ceil(leftMs / 60000)), 429);
  }
  throw createAppError(TABLE_SESSION_MESSAGES.BUSY, 503);
};

/** Staff dismiss an alert. */
export const clearAlert = async (sessionId: string, type: TableAlertType): Promise<ITableSession> => {
  const session = await TableSessionModel.findByIdAndUpdate(
    sessionId,
    { $set: { [alertField(type)]: null } },
    { new: true }
  ).lean<ITableSession>();
  if (!session) throw createAppError(TABLE_SESSION_MESSAGES.SESSION_NOT_FOUND, 404);
  return session;
};

// ---------------------------------------------------------------- closing

/**
 * Billing calls this right after a table bill is created: the diners' session ends with that bill.
 * The next scan of the table's QR starts a fresh session (new cart, new orders).
 */
export const closeForBill = async (tableId: string, billId: string): Promise<ITableSession | null> =>
  TableSessionModel.findOneAndUpdate(
    { tableId, status: TableSessionStatus.OPEN },
    {
      $set: {
        status: TableSessionStatus.CLOSED,
        billId: new Types.ObjectId(billId),
        closedAt: new Date(),
        closedReason: SessionCloseReason.BILLED,
        billRequested: null,
        waiterCalled: null,
      },
    },
    { new: true }
  ).lean<ITableSession>();

/** Staff clear a table whose guests left without anything to bill. */
export const closeByStaff = async (sessionId: string): Promise<ITableSession> => {
  const session = await getSessionById(sessionId);
  if (!session || session.status !== TableSessionStatus.OPEN) {
    throw createAppError(TABLE_SESSION_MESSAGES.SESSION_NOT_FOUND, 404);
  }
  const { unbilledCount } = await OrderDM.getOrdersForTable(session.tableId.toString());
  if (unbilledCount > 0) throw createAppError(TABLE_SESSION_MESSAGES.UNBILLED_ORDERS, 409);

  const closed = await TableSessionModel.findOneAndUpdate(
    { _id: sessionId, status: TableSessionStatus.OPEN },
    {
      $set: {
        status: TableSessionStatus.CLOSED,
        closedAt: new Date(),
        closedReason: SessionCloseReason.STAFF,
        billRequested: null,
        waiterCalled: null,
      },
    },
    { new: true }
  ).lean<ITableSession>();
  if (!closed) throw createAppError(TABLE_SESSION_MESSAGES.SESSION_NOT_FOUND, 404);
  return closed;
};
