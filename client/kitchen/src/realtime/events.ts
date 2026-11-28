// ============================================================
// Realtime event names — must match server/src/services/realtime/constants/realtime.constants.ts
// The kitchen board listens to its kitchen room (order signals only; no login today).
// ============================================================

export const ROOM_EVENTS = {
  JOIN_KITCHEN_ROOM: 'join_kitchen_room',
  LEAVE_KITCHEN_ROOM: 'leave_kitchen_room',
} as const;

export const KITCHEN_EVENTS = {
  NEW_ORDER: 'new_order',
  ORDER_STATUS_UPDATED: 'order_status_updated',
} as const;

/** How often the board polls while the live connection is down. */
export const FALLBACK_POLL_MS = 15000;

export const kitchenRoom = (restaurantId?: string) => ({
  join: ROOM_EVENTS.JOIN_KITCHEN_ROOM,
  leave: ROOM_EVENTS.LEAVE_KITCHEN_ROOM,
  id: restaurantId,
});
