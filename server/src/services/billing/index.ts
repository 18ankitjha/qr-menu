// ============================================================
// Billing Service — public surface
// Owns table bills (GST / service charge) and order receipts (PDF).
// ============================================================

export * as BillDM from './dm/bill.dm';
export { BillStatus, PaymentMode } from './constants/billing.constants';
export type { IBill, IBillItem, IBillPreview } from './interfaces/bill.interface';
