// ============================================================
// Order Service — public surface (used by other services)
// Owns orders (diner cart checkouts via table-session, waiter orders) and their status lifecycle.
// ============================================================

export * as OrderDM from './dm/order.dm';
export type { IOrder, IOrderItem } from './interfaces/order.interface';
