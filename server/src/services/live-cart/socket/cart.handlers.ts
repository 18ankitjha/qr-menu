import { Socket } from 'socket.io';
import { AppError } from '../../../middlewares/error.middleware';
import {
  CART_EVENTS,
  CLIENT_EVENTS,
  REALTIME_ERRORS,
  ROOMS,
  isRoomId,
  ICartSetAck,
  IJoinAck,
  ISocketData,
  SocketHandler,
} from '../../realtime';
import { LIVE_CART_LIMITS } from '../constants/live-cart.constants';
import * as LiveCartDM from '../dm/live-cart.dm';
import { cartSetSchema } from '../validators/live-cart.validator';

// ============================================================
// Cart socket events — a diner's phone ⇄ the live cart of their table session.
//   join_cart_room(sessionId)        → must be signed in (diner cookie) and in that session; then the phone
//                                      gets the whole cart (cart_updated) and every change after it
//   cart_set({ sessionId, changes }) → edits; only after joining that room; ack { ok, version, skipped }
// ============================================================

const reply = <T>(ack: unknown, result: T) => typeof ack === 'function' && (ack as (r: T) => void)(result);

/** User-facing message for known errors (e.g. "ordering is off"); a code for anything unexpected. */
const errorOf = (error: unknown): string =>
  (error as AppError)?.isOperational ? (error as AppError).message : REALTIME_ERRORS.FORBIDDEN;

const joinCart = async (socket: Socket, sessionId: unknown, ack: unknown) => {
  if (!isRoomId(sessionId)) return reply<IJoinAck>(ack, { ok: false, error: REALTIME_ERRORS.INVALID_ID });
  const customer = (socket.data as ISocketData).customer;
  if (!customer) return reply<IJoinAck>(ack, { ok: false, error: REALTIME_ERRORS.UNAUTHORIZED });
  try {
    const state = await LiveCartDM.getStateForMember(sessionId, customer.customerId);
    if (!state) return reply<IJoinAck>(ack, { ok: false, error: REALTIME_ERRORS.FORBIDDEN });
    await socket.join(ROOMS.cart(sessionId));
    reply<IJoinAck>(ack, { ok: true });
    socket.emit(CART_EVENTS.CART_UPDATED, state);
  } catch (error) {
    reply<IJoinAck>(ack, { ok: false, error: errorOf(error) });
  }
};

const setCart = async (socket: Socket, payload: unknown, ack: unknown) => {
  const parsed = cartSetSchema.safeParse(payload);
  if (!parsed.success) return reply<ICartSetAck>(ack, { ok: false, error: REALTIME_ERRORS.INVALID_REQUEST });
  const { sessionId, changes } = parsed.data;
  const customer = (socket.data as ISocketData).customer;
  // Joining the room is what checked membership
  if (!customer || !socket.rooms.has(ROOMS.cart(sessionId))) {
    return reply<ICartSetAck>(ack, { ok: false, error: REALTIME_ERRORS.FORBIDDEN });
  }
  try {
    const result = await LiveCartDM.applyChanges(sessionId, customer, changes);
    reply<ICartSetAck>(ack, { ok: true, version: result.state.version, skipped: result.skipped });
  } catch (error) {
    reply<ICartSetAck>(ack, { ok: false, error: errorOf(error) });
  }
};

export const registerCartHandlers: SocketHandler = (socket) => {
  let windowStart = 0;
  let edits = 0;
  const withinRate = (): boolean => {
    const now = Date.now();
    if (now - windowStart >= 1000) {
      windowStart = now;
      edits = 0;
    }
    return ++edits <= LIVE_CART_LIMITS.MAX_EDITS_PER_SECOND;
  };

  socket.on(CLIENT_EVENTS.JOIN_CART_ROOM, (sessionId, ack) => void joinCart(socket, sessionId, ack));
  socket.on(CLIENT_EVENTS.LEAVE_CART_ROOM, (sessionId) => {
    if (isRoomId(sessionId)) void socket.leave(ROOMS.cart(sessionId));
  });
  socket.on(CLIENT_EVENTS.CART_SET, (payload, ack) => {
    if (!withinRate()) return reply<ICartSetAck>(ack, { ok: false, error: REALTIME_ERRORS.TOO_MANY_REQUESTS });
    void setCart(socket, payload, ack);
  });
};
