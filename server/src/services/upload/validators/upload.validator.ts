import { z } from 'zod';

// ============================================================
// Upload Validators — Zod schemas
// ============================================================

/** DELETE /upload/image — discard an image that was uploaded but never saved. */
export const discardImageSchema = z.object({
  url: z.string().url().max(500),
});
