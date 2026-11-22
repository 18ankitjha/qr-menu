import { z } from 'zod';
import { OrderStatus } from '../config/constants';

// ============================================================
// Order Validators — Zod schemas
// ============================================================

export const placeOrderSchema = z.object({
  restaurantId: z.string().length(24, 'Invalid restaurant ID'),
  tableId: z.string().length(24, 'Invalid table ID'),
  items: z.array(
    z.object({
      dishId: z.string().length(24, 'Invalid dish ID'),
      quantity: z.number().int().min(1).max(50),
      notes: z.string().max(200).trim().optional(),
    })
  ).min(1, 'Order must have at least one item'),
  specialInstructions: z.string().max(500).trim().optional(),
  customerName: z.string().max(50).trim().optional(),
  gpsCoordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

export const orderIdParamSchema = z.object({
  orderId: z.string().length(24, 'Invalid order ID'),
});

export const tableIdParamSchema = z.object({
  tableId: z.string().length(24, 'Invalid table ID'),
});

export const restaurantIdParamSchema = z.object({
  restaurantId: z.string().length(24, 'Invalid restaurant ID'),
});
