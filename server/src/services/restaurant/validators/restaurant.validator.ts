import { z } from 'zod';

// ============================================================
// Restaurant Validators — Zod schemas
// ============================================================

const gpsCoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const registerRestaurantSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  address: z.string().min(5).max(500).trim(),
  gpsCoordinates: gpsCoordinatesSchema,
  gpsRadiusMeters: z.number().min(50).max(1000).optional(),
  logoUrl: z.string().url().optional(),
});

export const updateRestaurantSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  address: z.string().min(5).max(500).trim().optional(),
  gpsCoordinates: gpsCoordinatesSchema.optional(),
  gpsRadiusMeters: z.number().min(50).max(1000).optional(),
  logoUrl: z.string().url().optional(),
});

export const setGpsSchema = z.object({
  gpsCoordinates: gpsCoordinatesSchema,
  gpsRadiusMeters: z.number().min(50).max(1000).optional(),
});

export const restaurantIdParamSchema = z.object({
  id: z.string().length(24, 'Invalid restaurant ID'),
});

export const setBillingSettingsSchema = z.object({
  gstPercent: z.number().min(0).max(28),
  serviceChargePercent: z.number().min(0).max(20),
});
