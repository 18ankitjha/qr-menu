import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { FALLBACK_POLL_MS, TABLE_EVENTS, tableRoom, useRoom, useSocketEvent } from '../realtime';
import { reconnectNow } from '../realtime/rooms';

// ============================================================
// useTableSync — keeps this phone in step with the rest of the table, with as few API calls as possible.
//   • The table's room is held while the diner is at a table (pushes are free — no API call).
//   • A push from SOMEONE ELSE → refetch if the Cart / Orders tab is on screen; on the Menu tab it only
//     marks the table "stale", and opening Cart / Orders refetches once.
//   • A push caused by THIS diner is skipped — the response to their own action already updated the screen.
//   • (Re)joining the room / coming back to the tab / network back → catch up the same way.
//   • Polls only while the live connection is down, and only while the table is on screen.
// ============================================================

/** What the server pushes to a table's room (server: ITableSignal). */
interface TableSignal {
  tableId?: string;
  /** The diner (customer id) whose action caused it. */
  by?: string;
}

interface Options {
  /** The table we're seated at — undefined while not at a table. */
  tableId?: string;
  /** The Cart / Orders tab is on screen. */
  visible: boolean;
  /** This diner's customer id — their own pushes are skipped. */
  myId?: string;
  /** Shared with useTableSession: true = the table changed since we last fetched it. */
  staleRef: RefObject<boolean>;
  /** Refetch the table (stable). */
  refresh: () => unknown;
}

const DEBOUNCE_MS = 300;

/** Returns whether pushes are arriving (live) for this table. */
export const useTableSync = ({ tableId, visible, myId, staleRef, refresh }: Options): boolean => {
  const live = useRoom(tableRoom(tableId));
  const latest = useRef({ visible, myId, refresh });
  useEffect(() => {
    latest.current = { visible, myId, refresh };
  });

  /** Refetch now if the diner is looking at the table, otherwise just remember it is out of date. */
  const pull = useCallback(() => {
    if (latest.current.visible && document.visibilityState === 'visible') {
      staleRef.current = false;
      void latest.current.refresh();
    } else {
      staleRef.current = true;
    }
  }, [staleRef]);

  // Pushes (a burst is merged into one refetch; our own echoes never reset the timer)
  const timer = useRef<number | undefined>(undefined);
  useSocketEvent<TableSignal | undefined>(
    TABLE_EVENTS.TABLE_SESSION_UPDATED,
    (signal) => {
      if (signal?.tableId && signal.tableId !== tableId) return;
      if (signal?.by && signal.by === latest.current.myId) return;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(pull, DEBOUNCE_MS);
    },
    !!tableId
  );
  useEffect(() => () => window.clearTimeout(timer.current), [tableId]);

  // Catch up after (re)joining the room — something may have changed while we weren't listening
  useEffect(() => {
    if (live) pull();
  }, [live, pull]);

  // Cart / Orders opened → refetch only if something changed meanwhile
  useEffect(() => {
    if (!visible || !tableId || !staleRef.current) return;
    staleRef.current = false;
    void latest.current.refresh();
  }, [visible, tableId, staleRef]);

  // Tab / network came back
  useEffect(() => {
    if (!tableId) return;
    const onBack = () => {
      if (document.visibilityState !== 'visible') return;
      reconnectNow();
      pull();
    };
    document.addEventListener('visibilitychange', onBack);
    window.addEventListener('online', onBack);
    return () => {
      document.removeEventListener('visibilitychange', onBack);
      window.removeEventListener('online', onBack);
    };
  }, [tableId, pull]);

  // Fallback — only while the live connection is down (pull() makes no call unless the table is on screen)
  useEffect(() => {
    if (!tableId || live) return;
    const poll = window.setInterval(pull, FALLBACK_POLL_MS);
    return () => window.clearInterval(poll);
  }, [tableId, live, pull]);

  return live;
};
