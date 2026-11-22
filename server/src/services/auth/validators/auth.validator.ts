import { z } from 'zod';

// ============================================================
// Auth Validators
// ============================================================

export const staffLoginSchema = z.object({
  restaurantCode: z.string().trim().regex(/^\d{6}$/, 'Restaurant code must be 6 digits'),
  username: z.string().trim().toLowerCase().min(3).max(30),
  pin: z.string().trim().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits'),
});
