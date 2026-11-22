import { z } from 'zod';

// ============================================================
// Setup Validators — Zod schemas
// ============================================================

export const restaurantIdParamSchema = z.object({
  restaurantId: z.string().length(24, 'Invalid restaurant ID'),
});
