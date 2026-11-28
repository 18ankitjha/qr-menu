import { Socket } from 'socket.io';
import { RestaurantRole } from '../../../config/constants';
import { logger } from '../../../utils/logger';
import { getRoleInRestaurant } from '../../auth/middlewares/restaurant-access.middleware';
import { CLIENT_EVENTS, REALTIME_ERRORS, ROOMS, isRoomId } from '../constants/realtime.constants';
import { IJoinAck, ISocketData } from '../interfaces/realtime.interface';

// ============================================================
// Room handlers — what a browser may listen to.
//   restaurant room : owner or an active waiter of THAT restaurant (checked against the DB on every join)
//   kitchen room    : anyone with the restaurant id (same as the kitchen REST endpoint); order signals only
//   table room      : anyone with the table id; it only ever receives "refetch" pings, no data
// Every join answers with an ack ({ ok, error }) so the browser can tell "connected" from "really listening".
// ============================================================

type Ack = (result: IJoinAck) => void;
const reply = (ack: unknown, result: IJoinAck) => typeof ack === 'function' && (ack as Ack)(result);

const STAFF_ROLES: RestaurantRole[] = [RestaurantRole.OWNER, RestaurantRole.WAITER];

const joinRestaurant = async (socket: Socket, restaurantId: unknown, ack: unknown) => {
  if (!isRoomId(restaurantId)) return reply(ack, { ok: false, error: REALTIME_ERRORS.INVALID_ID });
  const auth = (socket.data as ISocketData).auth;
  if (!auth) return reply(ack, { ok: false, error: REALTIME_ERRORS.UNAUTHORIZED });
  try {
    const role = await getRoleInRestaurant(auth, restaurantId);
    if (!role || !STAFF_ROLES.includes(role)) return reply(ack, { ok: false, error: REALTIME_ERRORS.FORBIDDEN });
    await socket.join(ROOMS.restaurant(restaurantId));
    logger.debug(`[realtime] ${socket.id} joined ${ROOMS.restaurant(restaurantId)} as ${role}`);
    reply(ack, { ok: true });
  } catch (error) {
    logger.error(`[realtime] join ${ROOMS.restaurant(restaurantId)} failed`, (error as Error).message);
    reply(ack, { ok: false, error: REALTIME_ERRORS.FORBIDDEN });
  }
};

/** A room anyone with the id may join. */
const joinOpenRoom = async (socket: Socket, room: (id: string) => string, id: unknown, ack: unknown) => {
  if (!isRoomId(id)) return reply(ack, { ok: false, error: REALTIME_ERRORS.INVALID_ID });
  await socket.join(room(id));
  logger.debug(`[realtime] ${socket.id} joined ${room(id)}`);
  reply(ack, { ok: true });
};

const leave = (socket: Socket, room: (id: string) => string, id: unknown) => {
  if (isRoomId(id)) void socket.leave(room(id));
};

export const registerRoomHandlers = (socket: Socket): void => {
  socket.on(CLIENT_EVENTS.JOIN_RESTAURANT_ROOM, (id, ack) => void joinRestaurant(socket, id, ack));
  socket.on(CLIENT_EVENTS.LEAVE_RESTAURANT_ROOM, (id) => leave(socket, ROOMS.restaurant, id));
  socket.on(CLIENT_EVENTS.JOIN_KITCHEN_ROOM, (id, ack) => void joinOpenRoom(socket, ROOMS.kitchen, id, ack));
  socket.on(CLIENT_EVENTS.LEAVE_KITCHEN_ROOM, (id) => leave(socket, ROOMS.kitchen, id));
  socket.on(CLIENT_EVENTS.JOIN_TABLE_ROOM, (id, ack) => void joinOpenRoom(socket, ROOMS.table, id, ack));
  socket.on(CLIENT_EVENTS.LEAVE_TABLE_ROOM, (id) => leave(socket, ROOMS.table, id));
};
