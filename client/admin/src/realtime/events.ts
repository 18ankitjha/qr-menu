// ============================================================
// Realtime event names — must match server/src/services/realtime/constants/realtime.constants.ts
// The admin app (owner + waiters) listens to its restaurant room (login checked by the server).
// ============================================================

export const ROOM_EVENTS = {
  JOIN_RESTAURANT_ROOM: 'join_restaurant_room',
  LEAVE_RESTAURANT_ROOM: 'leave_restaurant_room',
} as const;

export const RESTAURANT_EVENTS = {
  NEW_ORDER: 'new_order',
  ORDER_STATUS_UPDATED: 'order_status_updated',
  BILL_UPDATED: 'bill_updated',
  TABLES_UPDATED: 'tables_updated',
  TABLE_ALERT: 'table_alert',
  RESTAURANT_UPDATED: 'restaurant_updated',
} as const;

/** How often screens poll while the live connection is down. */
export const FALLBACK_POLL_MS = {
  ORDERS: 10000,
  BILLS: 15000,
  TABLES: 15000,
  ALERTS: 30000,
  APPROVAL: 30000,
} as const;

/** The restaurant room, ready for useRoom / useLiveRefresh. */
export const restaurantRoom = (restaurantId?: string) => ({
  join: ROOM_EVENTS.JOIN_RESTAURANT_ROOM,
  leave: ROOM_EVENTS.LEAVE_RESTAURANT_ROOM,
  id: restaurantId,
});
