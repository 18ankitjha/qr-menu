import { z } from 'zod';

// ============================================================
// Table Validators — Zod schemas
// ============================================================

export const addTableSchema = z.object({
  restaurantId: z.string().length(24, 'Invalid restaurant ID'),
  tableNumber: z.number().int().positive(),
  label: z.string().max(50).trim().optional(),
});

export const bulkAddTablesSchema = z.object({
  restaurantId: z.string().length(24, 'Invalid restaurant ID'),
  count: z.number().int().min(1).max(50, 'Maximum 50 tables at a time'),
  startNumber: z.number().int().positive().optional(),
});

export const tableIdParamSchema = z.object({
  id: z.string().length(24, 'Invalid table ID'),
});

export const restaurantIdParamSchema = z.object({
  restaurantId: z.string().length(24, 'Invalid restaurant ID'),
});
