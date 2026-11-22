import { Request, Response } from 'express';
import { SUCCESS_MESSAGES } from '../config/constants';
import { sendSuccess } from '../utils/response.util';
import { asyncHandler } from '../middlewares/error.middleware';
import * as CategoryDM from '../dm/category/category.dm';

// ============================================================
// Category Controller
// ============================================================

export const addCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await CategoryDM.addCategory(req.body);
  sendSuccess(res, category, SUCCESS_MESSAGES.CATEGORY_ADDED, 201);
});

export const getAllCategories = asyncHandler(async (req: Request, res: Response) => {
  const menuId = req.params.menuId as string;
  const categories = await CategoryDM.getCategoriesByMenuId(menuId);
  sendSuccess(res, categories, 'Categories fetched');
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const category = await CategoryDM.updateCategory(id, req.body);
  sendSuccess(res, category, SUCCESS_MESSAGES.CATEGORY_UPDATED);
});

export const setActive = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { isActive } = req.body;
  const category = await CategoryDM.setActive(id, isActive);
  sendSuccess(res, category, SUCCESS_MESSAGES.AVAILABILITY_UPDATED);
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await CategoryDM.deleteCategory(id);
  sendSuccess(res, null, SUCCESS_MESSAGES.CATEGORY_DELETED);
});

export const reorderCategories = asyncHandler(async (req: Request, res: Response) => {
  await CategoryDM.reorderCategories(req.body.items);
  sendSuccess(res, null, SUCCESS_MESSAGES.CATEGORIES_REORDERED);
});
