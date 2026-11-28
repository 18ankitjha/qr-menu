// ============================================================
// Realtime Service — public surface
//
//   Browser apps ──(one Socket.IO connection each)──► this service (inside the API process)
//   Order / Billing / Table-session / Super-admin services ──(function call)──► publishers
//
// Services never open sockets. They say what happened (e.g. OrderPublisher.orderPlaced(order));
// the publisher decides which rooms hear it. Adding a push = add an event name in
// constants/realtime.constants.ts, a function in publishers/, and a listener in the app's src/realtime.
// ============================================================

export { initializeRealtime } from './socket/socket.server';
export type { SocketHandler } from './socket/socket.server';
export * as OrderPublisher from './publishers/order.publisher';
export * as BillPublisher from './publishers/bill.publisher';
export * as TablePublisher from './publishers/table.publisher';
export * as CartPublisher from './publishers/cart.publisher';
export * as RestaurantPublisher from './publishers/restaurant.publisher';
export {
  CLIENT_EVENTS,
  RESTAURANT_EVENTS,
  TABLE_EVENTS,
  CART_EVENTS,
  ROOMS,
  REALTIME_ERRORS,
  isRoomId,
} from './constants/realtime.constants';
export type * from './interfaces/realtime.interface';
