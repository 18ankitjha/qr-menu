import { DishModel } from './dish.model';
import { CategoryModel } from './category.model';
import { MENU_MESSAGES } from '../constants/menu.constants';
import { IDish, IAddDishInput, IUpdateDishInput } from '../interfaces/dish.interface';
import { IReorderItem } from '../../../interfaces/common.interface';
import { ERROR_MESSAGES } from '../../../config/constants';
import { createAppError } from '../../../middlewares/error.middleware';

// ============================================================
// Dish DM Layer
// ============================================================

/**
 * Add a dish to a category.
 */
export const addDish = async (input: IAddDishInput): Promise<IDish> => {
  const category = await CategoryModel.findById(input.categoryId).select('menuId').lean();
  if (!category) {
    throw createAppError(ERROR_MESSAGES.CATEGORY_NOT_FOUND, 404);
  }
  if (category.menuId.toString() !== input.menuId) {
    throw createAppError(MENU_MESSAGES.CATEGORY_NOT_IN_MENU, 400);
  }

  const lastDish = await DishModel
    .findOne({ categoryId: input.categoryId })
    .sort({ displayOrder: -1 })
    .lean();

  const displayOrder = lastDish ? lastDish.displayOrder + 1 : 0;

  const dish = await DishModel.create({
    ...input,
    displayOrder,
  });

  return dish.toObject();
};

/**
 * Get all dishes for a category.
 */
export const getDishesByCategoryId = async (categoryId: string): Promise<IDish[]> => {
  return DishModel.find({ categoryId }).sort({ displayOrder: 1 }).lean();
};

/**
 * Get all dishes for a menu (used for public menu view).
 */
export const getDishesByMenuId = async (menuId: string): Promise<IDish[]> => {
  return DishModel.find({ menuId, isAvailable: true }).sort({ displayOrder: 1 }).lean();
};

/**
 * Get dish by ID.
 */
export const getDishById = async (id: string): Promise<IDish | null> => {
  return DishModel.findById(id).lean();
};

/**
 * Get multiple dishes by IDs (for order validation).
 */
export const getDishesByIds = async (ids: string[]): Promise<IDish[]> => {
  return DishModel.find({ _id: { $in: ids } }).lean();
};

/**
 * Update a dish.
 */
export const updateDish = async (
  id: string,
  input: IUpdateDishInput
): Promise<IDish | null> => {
  const dish = await DishModel.findById(id).lean();
  if (!dish) {
    throw createAppError(ERROR_MESSAGES.DISH_NOT_FOUND, 404);
  }

  return DishModel.findByIdAndUpdate(id, input, { new: true }).lean();
};

/**
 * Toggle dish availability.
 */
export const setAvailability = async (
  id: string,
  isAvailable: boolean
): Promise<IDish | null> => {
  const dish = await DishModel.findById(id).lean();
  if (!dish) {
    throw createAppError(ERROR_MESSAGES.DISH_NOT_FOUND, 404);
  }

  return DishModel.findByIdAndUpdate(id, { isAvailable }, { new: true }).lean();
};

/**
 * Delete a dish.
 */
export const deleteDish = async (id: string): Promise<void> => {
  const dish = await DishModel.findById(id).lean();
  if (!dish) {
    throw createAppError(ERROR_MESSAGES.DISH_NOT_FOUND, 404);
  }

  await DishModel.findByIdAndDelete(id);
};

/**
 * Reorder dishes. Only dishes in the same menu as the first item are touched,
 * so ids from another restaurant's menu are ignored.
 */
export const reorderDishes = async (items: IReorderItem[]): Promise<void> => {
  const first = await DishModel.findById(items[0].id).select('menuId').lean();
  if (!first) {
    throw createAppError(ERROR_MESSAGES.DISH_NOT_FOUND, 404);
  }

  const bulkOps = items.map((item) => ({
    updateOne: {
      filter: { _id: item.id, menuId: first.menuId },
      update: { displayOrder: item.displayOrder },
    },
  }));

  await DishModel.bulkWrite(bulkOps);
};

/**
 * Count dishes in a menu.
 */
export const countDishesByMenuId = async (menuId: string): Promise<number> => {
  return DishModel.countDocuments({ menuId });
};
