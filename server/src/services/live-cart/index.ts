// ============================================================
// Live Cart Service — public surface
// The shared table cart while diners pick food: kept in memory, edited over the socket, pushed to every
// phone at the table, snapshotted to the table session document. See dm/live-cart.dm.ts for the flow.
// ============================================================

export * as LiveCartDM from './dm/live-cart.dm';
export { registerCartHandlers } from './socket/cart.handlers';
export { memberKey } from './utils/member-key.util';
export { cartSyncSchema } from './validators/live-cart.validator';
export type { ICartChange, ICartActor } from './interfaces/live-cart.interface';
