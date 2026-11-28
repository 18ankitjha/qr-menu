import { useCallback, useEffect, useRef, useState } from 'react';
import * as TableSessionApi from '../api/table-session.api';
import { messageOf, statusOf } from '../api/http';
import { STORAGE_KEYS, SYNC } from '../constants';
import { getLocation, type LocationProblem } from '../utils/gps.util';
import type { ITableLink, ITableSession } from '../types';
import { useTableSync } from './useTableSync';

// ============================================================
// useTableSession — the diner's seat at the table.
// Resumes the session saved on this phone, otherwise joins the table's open session (or opens one).
// Every response carries the whole table view, so the latest one simply replaces the state.
// Changes are optimistic: `optimistic()` updates the screen at once, `run()` sends the call in the
// background. Calls go out one at a time, in tap order, so the server ends up exactly where the screen is.
// ============================================================

const readStored = (tableId: string): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.SESSION(tableId));
  } catch {
    return null;
  }
};

const store = (tableId: string, sessionId: string): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSION(tableId), sessionId);
  } catch {
    /* private mode — the session is simply re-joined next time */
  }
};

/** A billed/cleared table is shown (with its bill) for a while, then the next visit starts afresh. */
const isRecentlyClosed = (session: ITableSession): boolean =>
  session.status === 'CLOSED' &&
  !!session.closedAt &&
  Date.now() - new Date(session.closedAt).getTime() < SYNC.SHOW_CLOSED_FOR_MS;

export const useTableSession = (
  link: ITableLink | null,
  tableId: string | undefined,
  signedIn: boolean,
  /** The Cart / Orders tab is on screen — refetch on others' changes. On the Menu tab they only mark it stale. */
  visible: boolean,
  /** This diner's customer id — pushes caused by their own actions are skipped. */
  myId: string | undefined
) => {
  const [session, setSession] = useState<ITableSession | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  /** Set when joining failed only because we couldn't get the diner's location. */
  const [locationProblem, setLocationProblem] = useState<LocationProblem | null>(null);
  const latest = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
  /** The newest table view the server has sent (screen may be ahead of it with optimistic changes). */
  const server = useRef<ITableSession | null>(null);
  /** The table changed since we last fetched it (see useTableSync). */
  const stale = useRef(false);
  const visibleRef = useRef(visible);
  useEffect(() => {
    visibleRef.current = visible;
  });

  /** Apply a response only if nothing newer happened since (no out-of-order overwrites of the screen). */
  const track = useCallback(() => {
    const seq = ++latest.current;
    return (next: ITableSession) => {
      const known = server.current;
      if (!known || known._id !== next._id || next.cartVersion >= known.cartVersion) server.current = next;
      if (seq !== latest.current) return;
      sessionIdRef.current = next._id;
      setSession(next);
    };
  }, []);

  const join = useCallback(async () => {
    if (!link || !tableId) return;
    // Ask for location first, synchronously, so a "Share my location" tap shows the browser prompt
    const located = getLocation();
    setJoining(true);
    setError('');
    setLocationProblem(null);
    try {
      const apply = track();
      const { coords, problem } = await located;
      let joined: ITableSession;
      try {
        joined = await TableSessionApi.joinTable(link, coords);
      } catch (e) {
        // No location and the server needs it → explain how to share it instead of a bare error
        if (!coords && statusOf(e) === 400) {
          setLocationProblem(problem ?? 'UNAVAILABLE');
          return;
        }
        throw e;
      }
      store(tableId, joined._id);
      apply(joined);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setJoining(false);
    }
  }, [link, tableId, track]);

  // Sign-in finished and we know the table → resume or join
  useEffect(() => {
    if (!signedIn || !tableId) return;
    let cancelled = false;
    (async () => {
      const storedId = readStored(tableId);
      if (storedId) {
        try {
          const apply = track();
          const stored = await TableSessionApi.getSession(storedId);
          if (cancelled) return;
          if (stored.status === 'OPEN' || isRecentlyClosed(stored)) {
            apply(stored);
            return;
          }
        } catch (e) {
          if (cancelled) return;
          const status = statusOf(e);
          if (status !== 403 && status !== 404 && status !== 400) {
            setError(messageOf(e));
            return;
          }
        }
      }
      await join();
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, tableId, join, track]);

  // ---------------- changes: one at a time, in tap order

  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const inFlight = useRef(0);

  const refresh = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    // A change of ours is on its way — its response is fresher than this read could be. Catch up after.
    if (inFlight.current > 0) {
      stale.current = true;
      return;
    }
    try {
      const apply = track();
      apply(await TableSessionApi.getSession(sessionId));
    } catch (e) {
      if (statusOf(e) === 401) setError(messageOf(e));
    }
  }, [track]);

  /** Send a table action (after any earlier ones); its response — the fresh table view — replaces the state. */
  const run = useCallback(
    (action: (sessionId: string) => Promise<ITableSession>): Promise<ITableSession> => {
      inFlight.current++;
      const result = queue.current.then(async () => {
        const sessionId = sessionIdRef.current;
        if (!sessionId) throw new Error('Not at a table yet');
        const apply = track();
        const next = await action(sessionId);
        apply(next);
        return next;
      });
      queue.current = result
        .catch(() => undefined)
        .finally(() => {
          inFlight.current--;
          // Others changed the table while ours were in flight → one catch-up read (if it's on screen)
          if (inFlight.current === 0 && stale.current && visibleRef.current) {
            stale.current = false;
            void refresh();
          }
        });
      return result;
    },
    [track, refresh]
  );

  /** Show a change at once; pair it with run() — that call's response (or a refetch on error) settles it. */
  const optimistic = useCallback((update: (session: ITableSession) => ITableSession) => {
    latest.current++; // responses already on their way are older than this screen
    setSession((s) => (s ? update(s) : s));
  }, []);

  /** The newest table view from the server (real line ids, current cart version). */
  const serverView = useCallback(() => server.current, []);

  /** The screen is about to be brought up to date by a call we're making — skip the catch-up read. */
  const markFresh = useCallback(() => {
    stale.current = false;
  }, []);

  const live = useTableSync({ tableId: session ? tableId : undefined, visible, myId, staleRef: stale, refresh });

  const reset = useCallback(() => {
    latest.current++;
    sessionIdRef.current = null;
    server.current = null;
    setSession(null);
  }, []);

  return {
    session,
    joining,
    error,
    locationProblem,
    live,
    join,
    refresh,
    run,
    optimistic,
    serverView,
    markFresh,
    reset,
  };
};
