import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { cartRoom, CART_EVENTS, useRoom, useSocketEvent } from '../realtime';
import type { ICartChange, ICartLine, ICartState, IDish, ITableSession } from '../types';
import { forgetPending, LiveCartStore, type LiveCartSnapshot } from './live-cart.store';

// ============================================================
// useLiveCart — the table's live cart for React: what to show, and set / syncNow / settle.
// Holds the cart room while seated, so everyone's picks show up on every phone as they happen.
// The logic lives in LiveCartStore; this only wires it to React, the socket and the table session.
// ============================================================

interface Options {
  session: ITableSession | null;
  /** Dish details for lines this phone added that the server hasn't confirmed yet. */
  dishes: Map<string, IDish>;
  myName: string;
  /** The Cart tab is on screen (no live connection → edits go over REST). */
  cartOpen: boolean;
  restSync: (changes: ICartChange[]) => Promise<ITableSession>;
  onError: (message: string) => void;
  onSkipped: () => void;
}

const EMPTY: LiveCartSnapshot = { version: 0, lines: [], pending: {} };
const noStore = () => () => {};

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Server lines with this phone's unconfirmed edits on top (0 hides a line; new own lines are appended). */
const linesToShow = (
  { lines, pending }: LiveCartSnapshot,
  me: string,
  dishes: Map<string, IDish>,
  myName: string
): ICartLine[] => {
  const shown: ICartLine[] = [];
  for (const line of lines) {
    const quantity = pending[line.key] ?? line.quantity;
    if (quantity > 0) shown.push(quantity === line.quantity ? line : { ...line, quantity });
  }
  for (const [key, quantity] of Object.entries(pending)) {
    if (quantity <= 0 || !key.startsWith(`${me}.`) || lines.some((l) => l.key === key)) continue;
    const dish = dishes.get(key.slice(me.length + 1));
    if (dish) {
      shown.push({ key, dishId: dish._id, dishName: dish.name, price: dish.price, quantity, by: myName });
    }
  }
  return shown;
};

export const useLiveCart = ({ session, dishes, myName, cartOpen, restSync, onError, onSkipped }: Options) => {
  const sessionId = session?.status === 'OPEN' ? session._id : undefined;
  const me = session?.me;
  const store = useMemo(() => (sessionId && me ? new LiveCartStore(sessionId, me) : null), [sessionId, me]);
  const live = useRoom(cartRoom(store?.sessionId));
  const snapshot = useSyncExternalStore(store?.subscribe ?? noStore, store?.getSnapshot ?? (() => EMPTY));

  useEffect(() => {
    store?.configure({ restSync, onError, onSkipped }, live, cartOpen);
  });
  useEffect(() => () => store?.dispose(), [store]);

  // Pushes: the whole cart, applied directly (no API call)
  useSocketEvent<ICartState>(
    CART_EVENTS.CART_UPDATED,
    (state) => {
      if (store && state.sessionId === store.sessionId) store.accept(state.version, state.lines);
    },
    !!store
  );

  // Every table response (join / refresh / sync / order) carries the cart too
  useEffect(() => {
    if (store && session?._id === store.sessionId) store.accept(session.cartVersion, session.cart);
  }, [store, session]);

  // Billed / cleared: unsent edits for that session can never be used
  const closedId = session?.status === 'CLOSED' ? session._id : undefined;
  useEffect(() => {
    if (closedId) forgetPending(closedId);
  }, [closedId]);

  const lines = useMemo(
    () => (me ? linesToShow(snapshot, me, dishes, myName) : []),
    [snapshot, me, dishes, myName]
  );
  const total = useMemo(() => round2(lines.reduce((sum, l) => sum + l.price * l.quantity, 0)), [lines]);
  const count = useMemo(() => lines.reduce((sum, l) => sum + l.quantity, 0), [lines]);

  return {
    /** What to show: the live cart with this phone's taps on top. */
    lines,
    total,
    count,
    /** This diner's member key (their lines are `<me>.<dishId>`). */
    me,
    live,
    set: (key: string, quantity: number) => store?.set(key, quantity),
    syncNow: () => store?.syncNow() ?? Promise.resolve(),
    settle: () => (store ? store.settle() : Promise.reject(new Error('Not at a table'))),
  };
};
