// ============================================================
// Table Session Constants
// ============================================================

/** A table session: everyone currently sitting at one table (shared cart + their orders until the bill). */
export enum TableSessionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum SessionCloseReason {
  /** Staff generated the bill — the session's orders are on it. */
  BILLED = 'BILLED',
  /** Nobody did anything for a long time and nothing was left unbilled. */
  IDLE = 'IDLE',
  /** Staff cleared the table (e.g. guests left without ordering). */
  STAFF = 'STAFF',
}

/** Alerts diners can raise for staff. */
export enum TableAlertType {
  BILL = 'BILL',
  WAITER = 'WAITER',
}

/** Who should be rung for a diner alert: the waiters, or the owner when the restaurant has no active waiters. */
export enum AlertAudience {
  WAITERS = 'WAITERS',
  OWNER = 'OWNER',
}

export const TABLE_SESSION_LIMITS = {
  /** An open session untouched for this long (and with nothing unbilled) is closed when someone new joins. */
  IDLE_HOURS: 4,
  /** Concurrent joins retry this many times before giving up. */
  WRITE_RETRIES: 3,
  /** A table can call a waiter (or ask for the bill) once per this window, so the button can't be spammed. */
  ALERT_COOLDOWN_MS: 5 * 60 * 1000,
} as const;

export const TABLE_SESSION_MESSAGES = {
  MENU_FETCHED: 'Menu fetched',
  JOINED: 'Joined the table',
  SESSION_FETCHED: 'Table fetched',
  CART_UPDATED: 'Cart updated',
  ORDER_PLACED: 'Order sent to the kitchen',
  BILL_REQUESTED: 'The staff have been asked for your bill',
  WAITER_CALLED: 'A waiter has been called',
  ALERT_CLEARED: 'Alert cleared',
  SESSION_CLOSED_BY_STAFF: 'Table cleared',
  OPEN_SESSIONS_FETCHED: 'Open tables fetched',
  INVALID_QR: 'This QR code is not valid. Please scan the QR code on your table again.',
  QR_REPLACED: 'This QR code has been replaced. Please scan the QR code on your table.',
  SESSION_NOT_FOUND: 'Table session not found. Please scan the QR code again.',
  NOT_A_MEMBER: 'You have not joined this table. Please scan the QR code on your table.',
  SESSION_CLOSED: 'This table has been billed. Start a new order to continue.',
  CART_CHANGED: 'Someone at your table just changed the cart. Please review it and place the order again.',
  CART_EMPTY: 'The cart is empty.',
  BUSY: 'The table is busy, please try again.',
  UNBILLED_ORDERS: 'This table still has orders that are not billed. Generate the bill first.',
  ORDERING_DISABLED: 'This restaurant takes orders through its staff. Please call a waiter to order.',
  ALERT_COOLDOWN: (type: TableAlertType, minutes: number) =>
    `${type === TableAlertType.BILL ? 'The bill was just requested' : 'A waiter was just called'}. ` +
    `You can ask again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
} as const;
