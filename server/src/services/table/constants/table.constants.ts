// ============================================================
// Table Service Constants
// ============================================================

export const TABLE_QR = {
  /** Parallel Cloudinary uploads when tables are bulk-added. */
  BULK_CONCURRENCY: 5,
  WIDTH: 400,
  MARGIN: 2,
  /** Random bytes in a table's QR token (base64url → 16 chars). */
  TOKEN_BYTES: 12,
} as const;

export const TABLE_MESSAGES = {
  CREATED_WITH_QR: 'Table added and its QR code generated.',
  CREATED_QR_FAILED: 'Table added, but its QR code could not be generated. Use "Retry QR" on the table.',
  BULK_CREATED_WITH_QR: (count: number) => `${count} tables added with QR codes.`,
  BULK_CREATED_QR_FAILED: (count: number, failed: number) =>
    `${count} tables added. ${failed} QR code(s) could not be generated — use "Retry QR" on those tables.`,
  QR_NOT_GENERATED: 'QR code has not been generated for this table',
  QR_REGENERATED: 'New QR code generated. The previous QR code for this table no longer works — reprint it.',
} as const;
