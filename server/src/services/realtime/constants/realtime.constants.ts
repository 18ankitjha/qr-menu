// ============================================================
// Realtime — event names and rooms (the contract shared with every web app)
//
// Rooms (a room = a group of open connections that receive the same pushes):
//   restaurant:<restaurantId>  → signed-in staff of one restaurant (owner, waiters). Checked on join.
//   kitchen:<restaurantId>     → the kitchen board (no login today): order signals only.
//   table:<tableId>            → diners' phones at one table (while on the Cart / Orders tabs).
//
// Pushes are tiny "something changed" signals. Screens refetch details over the normal REST API,
// so permissions live in one place (the API) and a missed push is fixed by the next refetch.
// The client copies of these names live in each app's src/realtime/events.ts — keep them in sync.
// ============================================================

/** Sent by browsers to the server. Each takes an id and an optional ack callback: ({ ok, error? }). */
export const CLIENT_EVENTS = {
  JOIN_RESTAURANT_ROOM: 'join_restaurant_room',
  LEAVE_RESTAURANT_ROOM: 'leave_restaurant_room',
  JOIN_KITCHEN_ROOM: 'join_kitchen_room',
  LEAVE_KITCHEN_ROOM: 'leave_kitchen_room',
  JOIN_TABLE_ROOM: 'join_table_room',
  LEAVE_TABLE_ROOM: 'leave_table_room',
} as const;

/** Sent by the server to staff (restaurant room); order events also go to the kitchen room. */
export const RESTAURANT_EVENTS = {
  /** A new order was placed (by diners or staff). Payload: IOrderSignal. */
  NEW_ORDER: 'new_order',
  /** An order's status or items changed. Payload: IOrderSignal. */
  ORDER_STATUS_UPDATED: 'order_status_updated',
  /** A bill was generated or paid. Payload: IBillSignal. */
  BILL_UPDATED: 'bill_updated',
  /** Something changed at a table: diners joined, cart, alert cleared, table cleared. Payload: ITableSignal. */
  TABLES_UPDATED: 'tables_updated',
  /** A diner called a waiter or asked for the bill. Payload: ITableAlertSignal (rings on staff phones). */
  TABLE_ALERT: 'table_alert',
  /** The super admin approved / rejected / suspended / reactivated the restaurant. Payload: IRestaurantSignal. */
  RESTAURANT_UPDATED: 'restaurant_updated',
} as const;

/** Sent by the server to a table room (diners' phones). */
export const TABLE_EVENTS = {
  /** The table's cart, orders or bill changed — refetch. Payload: ITableSignal. */
  TABLE_SESSION_UPDATED: 'table_session_updated',
} as const;

export const ROOMS = {
  restaurant: (restaurantId: string) => `restaurant:${restaurantId}`,
  kitchen: (restaurantId: string) => `kitchen:${restaurantId}`,
  table: (tableId: string) => `table:${tableId}`,
} as const;

export const REALTIME_ERRORS = {
  INVALID_ID: 'INVALID_ID',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
} as const;

const OBJECT_ID = /^[a-f0-9]{24}$/;
export const isRoomId = (id: unknown): id is string => typeof id === 'string' && OBJECT_ID.test(id);
