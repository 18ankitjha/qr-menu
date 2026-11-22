// ============================================================
// Staff Service Constants
// ============================================================

export const STAFF_LIMITS = {
  PIN_LENGTH: 6,
  MAX_FAILED_LOGINS: 5,
  LOCK_MINUTES: 15,
} as const;

export enum StaffLoginResult {
  OK = 'OK',
  INVALID = 'INVALID',
  LOCKED = 'LOCKED',
  INACTIVE = 'INACTIVE',
}

export const STAFF_MESSAGES = {
  ADDED: 'Staff member added. Share the PIN with them — you can view it again on the Staff page.',
  FETCHED: 'Staff fetched',
  PIN_RESET: 'PIN reset. Share the new PIN with the waiter.',
  PIN_FETCHED: 'PIN fetched',
  PIN_NOT_VIEWABLE: 'This PIN was set before PINs could be viewed. Reset the PIN to set a viewable one.',
  UPDATED: 'Staff updated',
  REMOVED: 'Staff member removed',
  NOT_FOUND: 'Staff member not found.',
  USERNAME_TAKEN: 'This username is already used in your restaurant.',
} as const;
