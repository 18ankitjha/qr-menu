import { io, type Socket } from 'socket.io-client';

// ============================================================
// The ONE live connection this app opens to the API's realtime service (same host, path /socket.io).
// Every screen shares it; rooms.ts decides what it listens to and closes it when nothing needs it.
// Same file in admin / kitchen / menu (src/realtime) — change all three together.
//
// Debug in the browser console:  localStorage.setItem('qr:realtime-debug', '1'); location.reload()
// ============================================================

const DEBUG_KEY = 'qr:realtime-debug';

const debugEnabled = (() => {
  try {
    return localStorage.getItem(DEBUG_KEY) === '1';
  } catch {
    return false;
  }
})();

export const debugLog = (...args: unknown[]): void => {
  if (debugEnabled) console.info('[realtime]', ...args);
};

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const url: string | undefined = import.meta.env.VITE_SOCKET_URL || undefined;
    socket = io(url, { path: '/socket.io', withCredentials: true, autoConnect: false });
    socket.on('connect', () => debugLog('connected', socket?.id));
    socket.on('disconnect', (reason) => debugLog('disconnected:', reason));
    socket.on('connect_error', (err) => debugLog('connect error:', err.message));
    if (debugEnabled) socket.onAny((event, ...args) => debugLog('←', event, ...args));
  }
  return socket;
};
