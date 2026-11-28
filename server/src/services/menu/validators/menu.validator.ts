import { z } from 'zod';

// ============================================================
// Menu Validators — Zod schemas
// ============================================================

export const createMenuSchema = z.object({
  restaurantId: z.string().length(24, 'Invalid restaurant ID'),
  name: z.string().min(2).max(100).trim(),
});

export const updateMenuSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  isActive: z.boolean().optional(),
  customerOrderingEnabled: z.boolean().optional(),
});

export const setMenuThemeSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  backgroundImageUrl: z.string().url().optional().or(z.literal('')),
  fontFamily: z.string().min(1).max(50).optional(),
  layout: z.enum(['grid', 'list']).optional(),
});

export const menuIdParamSchema = z.object({
  menuId: z.string().length(24, 'Invalid menu ID'),
});

export const restaurantIdParamSchema = z.object({
  restaurantId: z.string().length(24, 'Invalid restaurant ID'),
});
