import { z } from 'zod';

// ============================================================
// Staff Validators
// ============================================================

const pinSchema = z.string().trim().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits');

export const addStaffSchema = z.object({
  restaurantId: z.string().length(24, 'Invalid restaurant ID'),
  name: z.string().trim().min(2).max(60),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,30}$/, 'Username: 3-30 chars, letters, numbers, . _ -'),
  pin: pinSchema.optional(),
});

export const resetPinSchema = z.object({
  pin: pinSchema.optional(),
});

export const setStaffActiveSchema = z.object({
  isActive: z.boolean(),
});

export const staffIdParamSchema = z.object({
  id: z.string().length(24, 'Invalid staff ID'),
});

export const restaurantIdParamSchema = z.object({
  restaurantId: z.string().length(24, 'Invalid restaurant ID'),
});
