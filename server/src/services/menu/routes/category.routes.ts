import { Router } from 'express';
import { requireAuth } from '../../auth/middlewares/auth.middleware';
import {
  ALL_RESTAURANT_ROLES,
  requireApprovedOwner,
  requireRestaurantAccess,
} from '../../auth/middlewares/restaurant-access.middleware';
import {
  categoryFromParam,
  categoryFromReorderItems,
  menuFromBody,
  menuFromParam,
} from '../middlewares/menu-access.middleware';
import { validateBody, validateParams } from '../../../middlewares/validate.middleware';
import {
  addCategorySchema,
  updateCategorySchema,
  reorderCategoriesSchema,
  categoryIdParamSchema,
  menuIdParamSchema,
} from '../validators/category.validator';
import * as CategoryController from '../controllers/category.controller';

// ============================================================
// Category Routes — /api/v1/menu/category/*
// ============================================================

const router = Router();

const ownerOfCategory = requireApprovedOwner(categoryFromParam('id'));

router.use(requireAuth);

// POST /menu/category/add
router.post(
  '/add',
  validateBody(addCategorySchema),
  requireApprovedOwner(menuFromBody('menuId')),
  CategoryController.addCategory
);

// GET /menu/category/getAll/:menuId
router.get(
  '/getAll/:menuId',
  validateParams(menuIdParamSchema),
  requireRestaurantAccess(ALL_RESTAURANT_ROLES, menuFromParam('menuId')),
  CategoryController.getAllCategories
);

// PUT /menu/category/update/:id
router.put(
  '/update/:id',
  validateParams(categoryIdParamSchema),
  ownerOfCategory,
  validateBody(updateCategorySchema),
  CategoryController.updateCategory
);

// PUT /menu/category/setActive/:id
router.put(
  '/setActive/:id',
  validateParams(categoryIdParamSchema),
  ownerOfCategory,
  CategoryController.setActive
);

// DELETE /menu/category/delete/:id
router.delete(
  '/delete/:id',
  validateParams(categoryIdParamSchema),
  ownerOfCategory,
  CategoryController.deleteCategory
);

// PATCH /menu/category/reorder
router.patch(
  '/reorder',
  validateBody(reorderCategoriesSchema),
  requireApprovedOwner(categoryFromReorderItems),
  CategoryController.reorderCategories
);

export default router;
