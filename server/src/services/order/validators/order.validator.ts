import { z } from 'zod';
import { OrderStatus } from '../../../config/constants';

// ============================================================
// Order Validators — Zod schemas
// ============================================================

const orderItemSchema = z.object({
  dishId: z.string().length(24, 'Invalid dish ID'),
  quantity: z.number().int().min(1).max(50),
  notes: z.string().max(200).trim().optional(),
});

/** Waiter/owner ordering for a table (staff are on-site, so no GPS). Diners order via /table-session. */
export const staffPlaceOrderSchema = z.object({
  restaurantId: z.string().length(24, 'Invalid restaurant ID'),
  tableId: z.string().length(24, 'Invalid table ID'),
  items: z.array(orderItemSchema).min(1, 'Order must have at least one item'),
  specialInstructions: z.string().max(500).trim().optional(),
  customerName: z.string().max(50).trim().optional(),
});

/** Full new item list. To drop every item, cancel the order instead. */
export const updateOrderItemsSchema = z.object({
  items: z
    .array(orderItemSchema.extend({ addedBy: z.string().max(60).trim().optional() }))
    .min(1, 'Order must have at least one item. Cancel the order to remove everything.')
    .max(100),
  specialInstructions: z.string().max(500).trim().optional(),
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

export const getAllOrdersQuerySchema = z.object({
  tableId: z.string().length(24, 'Invalid table ID').optional(),
  status: z.nativeEnum(OrderStatus).optional(),
});
