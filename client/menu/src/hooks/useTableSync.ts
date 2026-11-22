import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_EVENTS, SYNC } from '../constants';

// ============================================================
// useTableSync — keeps every phone at the table in sync while it's on the Cart / Orders tab.
// The server pings the table's room whenever its cart / orders / bill change; we then refetch over the
// authenticated API. Connecting refetches once (so opening the tab shows the latest cart). Polling covers a
// dropped connection (fast) and is a slow safety net otherwise.
// ============================================================

export const useTableSync = (tableId: string | undefined, onChange: () => void): void => {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!tableId) return;

    let lastSync = Date.now();
    const sync = () => {
      lastSync = Date.now();
      onChangeRef.current();
    };

    const socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] });
    const joinRoom = () => socket.emit(SOCKET_EVENTS.JOIN_TABLE_ROOM, tableId);
    socket.on('connect', () => {
      joinRoom();
      sync(); // catch up on anything missed while disconnected
    });
    socket.on(SOCKET_EVENTS.TABLE_SESSION_UPDATED, sync);

    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const every = socket.connected ? SYNC.POLL_ONLINE_MS : SYNC.POLL_OFFLINE_MS;
      if (Date.now() - lastSync >= every) sync();
    }, 1000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') sync();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
      if (socket.connected) socket.emit(SOCKET_EVENTS.LEAVE_TABLE_ROOM, tableId);
      socket.disconnect();
    };
  }, [tableId]);
};
