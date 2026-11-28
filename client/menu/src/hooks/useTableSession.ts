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
  /** Keep this phone live-synced with the table (Cart / Orders tabs). Off while browsing the menu. */
  live: boolean
) => {
  const [session, setSession] = useState<ITableSession | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  /** Set when joining failed only because we couldn't get the diner's location. */
  const [locationProblem, setLocationProblem] = useState<LocationProblem | null>(null);
  const latest = useRef(0);
  const sessionIdRef = useRef<string | null>(null);

  /** Apply a response only if no newer request has been started since (avoids out-of-order overwrites). */
  const track = useCallback(() => {
    const seq = ++latest.current;
    return (next: ITableSession) => {
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

  const refresh = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    try {
      const apply = track();
      apply(await TableSessionApi.getSession(sessionId));
    } catch (e) {
      if (statusOf(e) === 401) setError(messageOf(e));
    }
  }, [track]);

  // Live only where it matters (Cart / Orders). On the Menu tab nothing polls or listens; each add/change
  // still returns the fresh table view, and opening Cart/Orders refetches at once (then live pushes).
  useTableSync(session && live ? tableId : undefined, refresh);

  /** Run a table action; on success its response (the fresh table view) replaces the state. */
  const run = useCallback(
    async (action: (sessionId: string) => Promise<ITableSession>): Promise<ITableSession> => {
      const sessionId = sessionIdRef.current;
      if (!sessionId) throw new Error('Not at a table yet');
      const apply = track();
      const next = await action(sessionId);
      apply(next);
      return next;
    },
    [track]
  );

  const reset = useCallback(() => {
    latest.current++;
    sessionIdRef.current = null;
    setSession(null);
  }, []);

  return { session, joining, error, locationProblem, join, refresh, run, reset };
};
