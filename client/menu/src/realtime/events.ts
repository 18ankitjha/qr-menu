// ============================================================
// Realtime event names — must match server/src/services/realtime/constants/realtime.constants.ts
// The customer menu holds two rooms while seated:
//   table room → "the table changed" signals (members, alerts, orders, bill) → refetch when on screen
//   cart room  → the live cart itself (cart_updated carries the data; cart_set sends this phone's taps)
// ============================================================

export const ROOM_EVENTS = {
  JOIN_TABLE_ROOM: 'join_table_room',
  LEAVE_TABLE_ROOM: 'leave_table_room',
  JOIN_CART_ROOM: 'join_cart_room',
  LEAVE_CART_ROOM: 'leave_cart_room',
} as const;

export const TABLE_EVENTS = {
  TABLE_SESSION_UPDATED: 'table_session_updated',
} as const;

export const CART_EVENTS = {
  /** server → phones: the whole cart (ICartState) */
  CART_UPDATED: 'cart_updated',
  /** phone → server: { sessionId, changes }, ack { ok, version, skipped } | { ok: false, error } */
  CART_SET: 'cart_set',
} as const;

/** Server errors on the socket that mean "slow down / try again" rather than "rejected". */
export const RETRYABLE_SOCKET_ERRORS: readonly string[] = ['TOO_MANY_REQUESTS'];

/** How often the table refetches while the live connection is down. */
export const FALLBACK_POLL_MS = 5000;

export const tableRoom = (tableId?: string) => ({
  join: ROOM_EVENTS.JOIN_TABLE_ROOM,
  leave: ROOM_EVENTS.LEAVE_TABLE_ROOM,
  id: tableId,
});

export const cartRoom = (sessionId?: string) => ({
  join: ROOM_EVENTS.JOIN_CART_ROOM,
  leave: ROOM_EVENTS.LEAVE_CART_ROOM,
  id: sessionId,
});
