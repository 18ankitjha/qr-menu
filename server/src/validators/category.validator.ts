import { z } from 'zod';

// ============================================================
// Category Validators — Zod schemas
// ============================================================

export const addCategorySchema = z.object({
  menuId: z.string().length(24, 'Invalid menu ID'),
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).trim().optional(),
  imageUrl: z.string().url().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).trim().optional(),
  imageUrl: z.string().url().optional(),
});

export const reorderCategoriesSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().length(24, 'Invalid category ID'),
      displayOrder: z.number().int().min(0),
    })
  ).min(1),
});

export const categoryIdParamSchema = z.object({
  id: z.string().length(24, 'Invalid category ID'),
});

export const menuIdParamSchema = z.object({
  menuId: z.string().length(24, 'Invalid menu ID'),
});
