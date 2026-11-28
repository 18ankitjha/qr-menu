import { debugLog, getSocket } from './socket';

// ============================================================
// Rooms — which pushes this app listens to.
// Screens "hold" a room while mounted. Holds are counted, so five components on one page = one join.
// Rooms are re-joined after every reconnect. A room is "live" only after the server confirms the join;
// until then screens poll as a fallback (see hooks.ts). With no rooms held, the connection closes.
// Same file in admin / kitchen / menu (src/realtime) — change all three together.
// ============================================================

const JOIN_TIMEOUT_MS = 8000;
const IDLE_CLOSE_MS = 10000;

interface JoinAck {
  ok: boolean;
  error?: string;
}

interface Room {
  join: string;
  leave: string;
  id: string;
  holders: number;
  live: boolean;
  listeners: Set<() => void>;
}

const rooms = new Map<string, Room>();
let wired = false;
let idleTimer: ReturnType<typeof setTimeout> | undefined;

const keyOf = (join: string, id: string) => `${join}:${id}`;

const setLive = (room: Room, live: boolean) => {
  if (room.live === live) return;
  room.live = live;
  debugLog(live ? 'listening' : 'not listening', room.join, room.id);
  room.listeners.forEach((notify) => notify());
};

const joinRoom = (room: Room) => {
  const socket = getSocket();
  socket.timeout(JOIN_TIMEOUT_MS).emit(room.join, room.id, (err: Error | null, ack?: JoinAck) => {
    if (room.holders === 0) return;
    const ok = !err && !!ack?.ok;
    if (!ok) debugLog('join refused', room.join, room.id, err?.message ?? ack?.error);
    setLive(room, ok && socket.connected);
  });
};

const wire = () => {
  if (wired) return;
  wired = true;
  const socket = getSocket();
  socket.on('connect', () => rooms.forEach((room) => room.holders > 0 && joinRoom(room)));
  socket.on('disconnect', () => rooms.forEach((room) => setLive(room, false)));
};

const roomFor = (join: string, leave: string, id: string): Room => {
  const key = keyOf(join, id);
  let room = rooms.get(key);
  if (!room) {
    room = { join, leave, id, holders: 0, live: false, listeners: new Set() };
    rooms.set(key, room);
  }
  return room;
};

/** Listen to a room until the returned function is called. Opens the connection if needed. */
export const holdRoom = (join: string, leave: string, id: string): (() => void) => {
  wire();
  const socket = getSocket();
  const room = roomFor(join, leave, id);
  room.holders += 1;
  clearTimeout(idleTimer);
  if (room.holders === 1 && socket.connected) joinRoom(room);
  if (!socket.connected && !socket.active) socket.connect();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    room.holders -= 1;
    if (room.holders > 0) return;
    if (socket.connected) socket.emit(room.leave, room.id);
    setLive(room, false);
    if ([...rooms.values()].every((r) => r.holders === 0)) {
      idleTimer = setTimeout(() => {
        if ([...rooms.values()].every((r) => r.holders === 0)) socket.disconnect();
      }, IDLE_CLOSE_MS);
    }
  };
};

export const isRoomLive = (join: string, id: string): boolean => !!rooms.get(keyOf(join, id))?.live;

export const subscribeRoom = (join: string, leave: string, id: string, notify: () => void): (() => void) => {
  const room = roomFor(join, leave, id);
  room.listeners.add(notify);
  return () => room.listeners.delete(notify);
};

/** Nudge a dropped connection to retry now (e.g. the phone just woke up) instead of waiting for backoff. */
export const reconnectNow = (): void => {
  const socket = getSocket();
  if (!socket.connected && [...rooms.values()].some((r) => r.holders > 0)) socket.connect();
};
