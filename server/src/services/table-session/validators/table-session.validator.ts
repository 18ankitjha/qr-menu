import { z } from 'zod';
import { TableAlertType } from '../constants/table-session.constants';

// ============================================================
// Table Session Validators — Zod schemas
// ============================================================

const objectId = (label: string) => z.string().regex(/^[a-f0-9]{24}$/, `Invalid ${label}`);
const qrToken = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, 'Invalid QR code');

const gpsCoordinates = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  })
  .optional();

export const qrTokenParamSchema = z.object({ qrToken });

export const legacyTableParamSchema = z.object({
  restaurantId: objectId('restaurant ID'),
  tableId: objectId('table ID'),
});

/** Join by QR token, or (QR codes printed before tokens) by restaurant + table id. */
export const joinSessionSchema = z.union([
  z.object({ qrToken, gpsCoordinates }),
  z.object({ restaurantId: objectId('restaurant ID'), tableId: objectId('table ID'), gpsCoordinates }),
]);

export const sessionIdParamSchema = z.object({ sessionId: objectId('session ID') });

export const restaurantIdParamSchema = z.object({ restaurantId: objectId('restaurant ID') });

export const addToCartSchema = z.object({
  dishId: objectId('dish ID'),
  quantity: z.number().int().min(1).max(50).default(1),
  notes: z.string().trim().max(200).optional(),
});

export const setCartQuantitySchema = z.object({
  itemId: objectId('cart item ID'),
  quantity: z.number().int().min(0).max(50),
});

export const setMyCartSchema = z.object({
  items: z
    .array(z.object({ dishId: objectId('dish ID'), quantity: z.number().int().min(0).max(50) }))
    .min(1)
    .max(60),
});

export const placeCartOrderSchema = z.object({
  cartVersion: z.number().int().min(0),
  specialInstructions: z.string().trim().max(500).optional(),
});

export const clearAlertSchema = z.object({
  type: z.nativeEnum(TableAlertType),
});
