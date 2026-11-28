import { FALLBACK_POLL_MS, TABLE_EVENTS, tableRoom, useLiveRefresh } from '../realtime';

// ============================================================
// useTableSync — keeps every phone at the table in sync while it's on the Cart / Orders tab.
// The server pings the table's room whenever its cart / orders / bill change; we then refetch over the
// authenticated API. Opening the tab and re-joining after a drop refetch once to catch up.
// Polls only while the live connection is down. `onChange` must be stable (useCallback).
// ============================================================

const TABLE_PUSHES = [TABLE_EVENTS.TABLE_SESSION_UPDATED] as const;

export const useTableSync = (tableId: string | undefined, onChange: () => unknown): void => {
  useLiveRefresh(onChange, {
    room: tableRoom(tableId),
    events: TABLE_PUSHES,
    fallbackMs: FALLBACK_POLL_MS,
  });
};
