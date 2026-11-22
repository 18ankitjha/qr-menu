// ============================================================
// Billing Service Constants
// ============================================================

export enum BillStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
}

export enum PaymentMode {
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD',
}

export const BILL_NUMBER = {
  PREFIX: 'B-',
  PAD: 6,
  COUNTER_KEY_PREFIX: 'bill:',
} as const;

export const BILLING_MESSAGES = {
  NOTHING_TO_BILL: 'There are no unbilled orders on this table.',
  BILL_NOT_FOUND: 'Bill not found',
  BILL_ALREADY_PAID: 'This bill is already paid.',
  BILL_CONFLICT: 'Some orders were billed by someone else just now. Refresh and try again.',
  BILL_PREVIEWED: 'Bill preview',
  BILL_GENERATED: 'Bill generated',
  BILL_FETCHED: 'Bill fetched',
  BILLS_FETCHED: 'Bills fetched',
  BILL_PAID: 'Bill marked as paid',
} as const;
