// ============================================================
// Auth Service Constants
// ============================================================

export const AUTH_COOKIE = {
  NAME: 'token',
  MAX_AGE_MS: 7 * 24 * 60 * 60 * 1000,
} as const;

/** Diners get their own cookie so a customer login never replaces (or acts as) an owner/staff login. */
export const CUSTOMER_COOKIE = {
  NAME: 'qr_customer_token',
  MAX_AGE_MS: 30 * 24 * 60 * 60 * 1000,
  TOKEN_EXPIRES_IN: '30d',
} as const;

/**
 * Where a diner returns after Google sign-in, relative to CLIENT_MENU_URL:
 * `/t/<qrToken>` (current QR codes) or `/<restaurantId>/<tableId>` (QR codes printed before tokens).
 */
export const MENU_RETURN_PATH = /^\/(t\/[A-Za-z0-9_-]{8,64}|[a-f0-9]{24}\/[a-f0-9]{24})$/;

export const AUTH_MESSAGES = {
  PROFILE_FETCHED: 'Profile fetched',
  LOGIN_SUCCESS: 'Login successful',
  INVALID_STAFF_CREDENTIALS: 'Invalid restaurant code, username or PIN.',
  STAFF_LOCKED: 'Too many failed attempts. Try again in a few minutes.',
  STAFF_INACTIVE: 'Your staff account is disabled. Contact the restaurant owner.',
  CUSTOMER_LOGIN_REQUIRED: 'Please sign in with Google to continue.',
  CUSTOMER_NOT_ALLOWED: 'Customer accounts cannot use restaurant tools.',
} as const;
