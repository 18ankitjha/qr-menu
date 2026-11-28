// ============================================================
// Table Session Service — public surface (used by other services)
// Owns the diners at a table: Google-signed-in customers share one live cart, place orders, ask for the bill.
// Billing closes the session when the table is billed (closeForBill).
// ============================================================

export * as TableSessionDM from './dm/table-session.dm';
export {
  TableSessionStatus,
  TableAlertType,
  TABLE_SESSION_MESSAGES,
  TABLE_SESSION_LIMITS,
} from './constants/table-session.constants';
export type {
  ITableSession,
  ICartLine,
  ICartSnapshotLine,
  IDiner,
} from './interfaces/table-session.interface';
