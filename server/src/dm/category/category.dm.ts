import { CategoryModel } from './category.model';
import {
  ICategory,
  IAddCategoryInput,
  IUpdateCategoryInput,
} from '../../interfaces/category.interface';
import { IReorderItem } from '../../interfaces/common.interface';
import { ERROR_MESSAGES } from '../../config/constants';
import { createAppError } from '../../middlewares/error.middleware';

// ============================================================
// Category DM Layer
// ============================================================

/**
 * Add a new category to a menu.
 * Auto-assigns displayOrder to the end.
 */
export const addCategory = async (input: IAddCategoryInput): Promise<ICategory> => {
  // Get current max displayOrder
  const lastCategory = await CategoryModel
    .findOne({ menuId: input.menuId })
    .sort({ displayOrder: -1 })
    .lean();

  const displayOrder = lastCategory ? lastCategory.displayOrder + 1 : 0;

  const category = await CategoryModel.create({
    ...input,
    displayOrder,
  });

  return category.toObject();
};

/**
 * Get all categories for a menu, sorted by displayOrder.
 */
export const getCategoriesByMenuId = async (menuId: string): Promise<ICategory[]> => {
  return CategoryModel.find({ menuId }).sort({ displayOrder: 1 }).lean();
};

/**
 * Get category by ID.
 */
export const getCategoryById = async (id: string): Promise<ICategory | null> => {
  return CategoryModel.findById(id).lean();
};

/**
 * Update a category.
 */
export const updateCategory = async (
  id: string,
  input: IUpdateCategoryInput
): Promise<ICategory | null> => {
  const category = await CategoryModel.findById(id).lean();
  if (!category) {
    throw createAppError(ERROR_MESSAGES.CATEGORY_NOT_FOUND, 404);
  }

  return CategoryModel.findByIdAndUpdate(id, input, { new: true }).lean();
};

/**
 * Toggle category active/inactive.
 */
export const setActive = async (
  id: string,
  isActive: boolean
): Promise<ICategory | null> => {
  const category = await CategoryModel.findById(id).lean();
  if (!category) {
    throw createAppError(ERROR_MESSAGES.CATEGORY_NOT_FOUND, 404);
  }

  return CategoryModel.findByIdAndUpdate(id, { isActive }, { new: true }).lean();
};

/**
 * Delete a category.
 */
export const deleteCategory = async (id: string): Promise<void> => {
  const category = await CategoryModel.findById(id).lean();
  if (!category) {
    throw createAppError(ERROR_MESSAGES.CATEGORY_NOT_FOUND, 404);
  }

  await CategoryModel.findByIdAndDelete(id);
};

/**
 * Reorder categories.
 */
export const reorderCategories = async (items: IReorderItem[]): Promise<void> => {
  const bulkOps = items.map((item) => ({
    updateOne: {
      filter: { _id: item.id },
      update: { displayOrder: item.displayOrder },
    },
  }));

  await CategoryModel.bulkWrite(bulkOps);
};
