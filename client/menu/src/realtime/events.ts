// ============================================================
// Realtime event names — must match server/src/services/realtime/constants/realtime.constants.ts
// The customer menu listens to its table's room while on the Cart / Orders tabs.
// ============================================================

export const ROOM_EVENTS = {
  JOIN_TABLE_ROOM: 'join_table_room',
  LEAVE_TABLE_ROOM: 'leave_table_room',
} as const;

export const TABLE_EVENTS = {
  TABLE_SESSION_UPDATED: 'table_session_updated',
} as const;

/** How often the table refetches while the live connection is down. */
export const FALLBACK_POLL_MS = 5000;

export const tableRoom = (tableId?: string) => ({
  join: ROOM_EVENTS.JOIN_TABLE_ROOM,
  leave: ROOM_EVENTS.LEAVE_TABLE_ROOM,
  id: tableId,
});
