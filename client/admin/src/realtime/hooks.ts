import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { getSocket } from './socket';
import { holdRoom, isRoomLive, reconnectNow, subscribeRoom } from './rooms';

// ============================================================
// React hooks over the shared connection. Pattern for every live screen:
//   1. load once when it opens,
//   2. refetch when a push says something changed (bursts are merged),
//   3. refetch when the connection (re)joins or the tab comes back — catches anything missed,
//   4. poll ONLY while the live connection is down (fallback).
// Same file in admin / kitchen / menu (src/realtime) — change all three together.
// ============================================================

export interface RoomRef {
  join: string;
  leave: string;
  /** No id → not listening (e.g. still loading). */
  id?: string;
}

/** Holds the room while mounted. Returns true while pushes are actually arriving. */
export const useRoom = ({ join, leave, id }: RoomRef): boolean => {
  useEffect(() => (id ? holdRoom(join, leave, id) : undefined), [join, leave, id]);
  const subscribe = useCallback(
    (notify: () => void) => (id ? subscribeRoom(join, leave, id, notify) : () => {}),
    [join, leave, id]
  );
  return useSyncExternalStore(subscribe, () => !!id && isRoomLive(join, id));
};

/** Calls `handler` for every push named `event` (latest handler is always used). */
export const useSocketEvent = <T,>(event: string, handler: (payload: T) => void, enabled = true): void => {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });
  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();
    const listener = (payload: T) => handlerRef.current(payload);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [event, enabled]);
};

export interface LiveRefreshOptions {
  room: RoomRef;
  /** Pushes that mean "your data changed". */
  events: readonly string[];
  /** Poll interval used only while the live connection is down. */
  fallbackMs: number;
  /** Merge a burst of pushes into one refetch. */
  debounceMs?: number;
}

/** Keeps a screen's data fresh with pushes; polls only as a fallback. Returns whether it is live. */
export const useLiveRefresh = (
  refresh: () => unknown,
  { room, events, fallbackMs, debounceMs = 300 }: LiveRefreshOptions
): boolean => {
  const live = useRoom(room);
  const active = !!room.id;
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });

  // 1. First load (and again whenever the data source itself changes, e.g. a filter)
  useEffect(() => {
    if (active) void refresh();
  }, [active, refresh]);

  // 2. Pushes
  const eventsKey = events.join('|');
  useEffect(() => {
    if (!active || !eventsKey) return;
    const socket = getSocket();
    const names = eventsKey.split('|');
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onPush = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void refreshRef.current(), debounceMs);
    };
    names.forEach((name) => socket.on(name, onPush));
    return () => {
      clearTimeout(timer);
      names.forEach((name) => socket.off(name, onPush));
    };
  }, [active, eventsKey, debounceMs]);

  // 3. Catch up after (re)joining, and when the tab / network comes back
  useEffect(() => {
    if (live) void refreshRef.current();
  }, [live]);
  useEffect(() => {
    if (!active) return;
    const onBack = () => {
      if (document.visibilityState !== 'visible') return;
      reconnectNow();
      void refreshRef.current();
    };
    document.addEventListener('visibilitychange', onBack);
    window.addEventListener('online', onBack);
    return () => {
      document.removeEventListener('visibilitychange', onBack);
      window.removeEventListener('online', onBack);
    };
  }, [active]);

  // 4. Fallback polling — only while not live, only while visible
  useEffect(() => {
    if (!active || live) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshRef.current();
    }, fallbackMs);
    return () => window.clearInterval(timer);
  }, [active, live, fallbackMs]);

  return live;
};
