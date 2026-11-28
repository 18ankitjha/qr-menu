import { CategoryModel } from './category.model';
import {
  ICategory,
  IAddCategoryInput,
  IUpdateCategoryInput,
} from '../interfaces/category.interface';
import { IReorderItem } from '../../../interfaces/common.interface';
import { ERROR_MESSAGES } from '../../../config/constants';
import { MAX_CATEGORY_DEPTH, MENU_MESSAGES } from '../constants/menu.constants';
import { createAppError } from '../../../middlewares/error.middleware';
import { ImageCleanupDM } from '../../upload';

// ============================================================
// Category DM Layer
// ============================================================

/**
 * Checks that `parentId` is a valid place for a category in `menuId`:
 * the parent is in the same menu, the move doesn't create a loop, and the tree stays ≤ MAX_CATEGORY_DEPTH.
 * `movingId` is the category being moved (omit when adding a new one).
 */
const assertValidParent = async (menuId: string, parentId: string, movingId?: string): Promise<void> => {
  const all = await CategoryModel.find({ menuId }).select('_id parentId').lean();
  const parentOf = new Map(all.map((c) => [c._id.toString(), c.parentId ? c.parentId.toString() : null]));
  if (!parentOf.has(parentId)) {
    throw createAppError(MENU_MESSAGES.PARENT_NOT_IN_MENU, 400);
  }

  // Depth of the parent (1 = top level); hitting the moving category means a loop
  let parentDepth = 0;
  for (let id: string | null = parentId; id; id = parentOf.get(id) ?? null) {
    if (id === movingId) throw createAppError(MENU_MESSAGES.CATEGORY_CYCLE, 400);
    if (++parentDepth > MAX_CATEGORY_DEPTH) break;
  }

  // Levels the moving category brings with it (itself + its deepest sub-category)
  const heightOf = (id: string): number => {
    const children = all.filter((c) => c.parentId?.toString() === id);
    return 1 + Math.max(0, ...children.map((c) => heightOf(c._id.toString())));
  };
  const height = movingId ? heightOf(movingId) : 1;

  if (parentDepth + height > MAX_CATEGORY_DEPTH) {
    throw createAppError(MENU_MESSAGES.CATEGORY_TOO_DEEP, 400);
  }
};

const nextDisplayOrder = async (menuId: string | ICategory['menuId']): Promise<number> => {
  const last = await CategoryModel.findOne({ menuId }).sort({ displayOrder: -1 }).select('displayOrder').lean();
  return last ? last.displayOrder + 1 : 0;
};

/**
 * Add a new category to a menu (optionally under a parent category).
 * Auto-assigns displayOrder to the end.
 */
export const addCategory = async (input: IAddCategoryInput): Promise<ICategory> => {
  if (input.parentId) await assertValidParent(input.menuId, input.parentId);

  const category = await CategoryModel.create({
    ...input,
    parentId: input.parentId || null,
    displayOrder: await nextDisplayOrder(input.menuId),
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

  const update: IUpdateCategoryInput & { displayOrder?: number } = { ...input };
  if ('parentId' in input) {
    const newParent = input.parentId || null;
    if (newParent) await assertValidParent(category.menuId.toString(), newParent, id);
    update.parentId = newParent;
    // Moved to another parent → goes to the end of its new siblings
    if (String(newParent) !== String(category.parentId ?? null)) {
      update.displayOrder = await nextDisplayOrder(category.menuId);
    }
  }

  const updated = await CategoryModel.findByIdAndUpdate(id, update, { new: true }).lean();
  ImageCleanupDM.releaseIfReplaced(category.imageUrl, updated?.imageUrl, 'imageUrl' in input);
  return updated;
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
 * Delete a category. Blocked while it still has sub-categories.
 */
export const deleteCategory = async (id: string): Promise<void> => {
  const category = await CategoryModel.findById(id).lean();
  if (!category) {
    throw createAppError(ERROR_MESSAGES.CATEGORY_NOT_FOUND, 404);
  }
  if (await CategoryModel.exists({ parentId: id })) {
    throw createAppError(MENU_MESSAGES.CATEGORY_HAS_CHILDREN, 409);
  }

  await CategoryModel.findByIdAndDelete(id);
  void ImageCleanupDM.releaseImage(category.imageUrl);
};

/**
 * Reorder categories. Only categories in the same menu as the first item are touched.
 */
export const reorderCategories = async (items: IReorderItem[]): Promise<void> => {
  const first = await CategoryModel.findById(items[0].id).select('menuId').lean();
  if (!first) {
    throw createAppError(ERROR_MESSAGES.CATEGORY_NOT_FOUND, 404);
  }

  const bulkOps = items.map((item) => ({
    updateOne: {
      filter: { _id: item.id, menuId: first.menuId },
      update: { displayOrder: item.displayOrder },
    },
  }));

  await CategoryModel.bulkWrite(bulkOps);
};
