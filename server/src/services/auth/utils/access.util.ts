import { env } from '../../../config/env';

// ============================================================
// Access helpers — platform-level roles
// ============================================================

/**
 * Super admins are identified by an email allowlist (SUPER_ADMIN_EMAILS).
 * The email comes from our signed JWT, which was issued after Google verified it.
 */
export const isSuperAdminEmail = (email?: string): boolean =>
  !!email && env.SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
