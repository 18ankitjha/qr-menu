import { z } from 'zod';
import { SpiceLevel } from '../constants/menu.constants';

// ============================================================
// Dish Validators — Zod schemas
// ============================================================

const dishDetailsSchema = {
  spiceLevel: z.nativeEnum(SpiceLevel).optional(),
  servingSize: z.string().max(50).trim().optional(),
  calories: z.number().int().min(0).max(5000).optional(),
  ingredients: z.string().max(500).trim().optional(),
  allergens: z.array(z.string().max(30).trim()).max(15).optional(),
};

export const addDishSchema = z.object({
  categoryId: z.string().length(24, 'Invalid category ID'),
  menuId: z.string().length(24, 'Invalid menu ID'),
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).trim().optional(),
  price: z.number().positive('Price must be positive'),
  imageUrl: z.string().url().optional(),
  isVeg: z.boolean(),
  preparationTime: z.number().int().positive().optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  ...dishDetailsSchema,
});

export const updateDishSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).trim().optional(),
  price: z.number().positive('Price must be positive').optional(),
  imageUrl: z.string().url().optional(),
  isVeg: z.boolean().optional(),
  preparationTime: z.number().int().positive().optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  ...dishDetailsSchema,
});

export const setAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

export const reorderDishesSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().length(24, 'Invalid dish ID'),
      displayOrder: z.number().int().min(0),
    })
  ).min(1),
});

export const dishIdParamSchema = z.object({
  id: z.string().length(24, 'Invalid dish ID'),
});

export const categoryIdParamSchema = z.object({
  categoryId: z.string().length(24, 'Invalid category ID'),
});
