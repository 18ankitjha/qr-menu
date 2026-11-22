import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateBody, validateParams } from '../middlewares/validate.middleware';
import {
  addCategorySchema,
  updateCategorySchema,
  reorderCategoriesSchema,
  categoryIdParamSchema,
  menuIdParamSchema,
} from '../validators/category.validator';
import * as CategoryController from '../controllers/category.controller';

const router = Router();

// All category routes require auth
router.use(authMiddleware);

// POST /category/add
router.post(
  '/add',
  validateBody(addCategorySchema),
  CategoryController.addCategory
);

// GET /category/getAll/:menuId
router.get(
  '/getAll/:menuId',
  validateParams(menuIdParamSchema),
  CategoryController.getAllCategories
);

// PUT /category/update/:id
router.put(
  '/update/:id',
  validateParams(categoryIdParamSchema),
  validateBody(updateCategorySchema),
  CategoryController.updateCategory
);

// PUT /category/setActive/:id
router.put(
  '/setActive/:id',
  validateParams(categoryIdParamSchema),
  CategoryController.setActive
);

// DELETE /category/delete/:id
router.delete(
  '/delete/:id',
  validateParams(categoryIdParamSchema),
  CategoryController.deleteCategory
);

// PATCH /category/reorder
router.patch(
  '/reorder',
  validateBody(reorderCategoriesSchema),
  CategoryController.reorderCategories
);

export default router;
