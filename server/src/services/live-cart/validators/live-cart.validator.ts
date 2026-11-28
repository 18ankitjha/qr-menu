import { z } from 'zod';
import { CART_LINE_KEY, LIVE_CART_LIMITS } from '../constants/live-cart.constants';

// ============================================================
// Live Cart Validators — used by both the socket edit and the REST sync
// ============================================================

export const cartChangesSchema = z
  .array(
    z.object({
      key: z.string().regex(CART_LINE_KEY, 'Invalid cart line'),
      quantity: z.number().int().min(0).max(LIVE_CART_LIMITS.MAX_LINE_QUANTITY),
    })
  )
  .max(LIVE_CART_LIMITS.MAX_CHANGES_PER_MESSAGE);

/** Socket `cart_set` payload. */
export const cartSetSchema = z.object({
  sessionId: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid session ID'),
  changes: cartChangesSchema.min(1),
});

/** REST `PUT /table-session/cart/sync/:sessionId` body (empty = just save + return the cart). */
export const cartSyncSchema = z.object({
  changes: cartChangesSchema.default([]),
});
