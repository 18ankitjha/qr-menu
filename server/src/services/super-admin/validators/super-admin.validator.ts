import { z } from 'zod';
import { PAGINATION_DEFAULTS, RestaurantStatus } from '../../../config/constants';
import { SUPER_ADMIN_LIMITS } from '../constants/super-admin.constants';

// ============================================================
// Super Admin Validators — Zod schemas
// ============================================================

export const restaurantIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid restaurant ID'),
});

export const listRestaurantsQuerySchema = z.object({
  status: z.nativeEnum(RestaurantStatus).optional(),
  search: z.string().trim().max(SUPER_ADMIN_LIMITS.SEARCH_MAX).optional(),
  page: z.coerce.number().int().min(1).default(PAGINATION_DEFAULTS.PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION_DEFAULTS.MAX_LIMIT)
    .default(PAGINATION_DEFAULTS.LIMIT),
});

const reasonSchema = z
  .string()
  .trim()
  .min(SUPER_ADMIN_LIMITS.REASON_MIN)
  .max(SUPER_ADMIN_LIMITS.REASON_MAX);

/** Approve / reactivate — reason optional. */
export const optionalReasonBodySchema = z.object({
  reason: reasonSchema.optional(),
});

/** Reject / suspend — reason required so the owner knows why. */
export const requiredReasonBodySchema = z.object({
  reason: reasonSchema,
});

/** Delete — the caller re-types the restaurant name; checked against the DB in the controller. */
export const deleteRestaurantBodySchema = z.object({
  confirmName: z.string().trim().min(1, 'Type the restaurant name to confirm'),
});

export type IListRestaurantsQuery = z.infer<typeof listRestaurantsQuerySchema>;
