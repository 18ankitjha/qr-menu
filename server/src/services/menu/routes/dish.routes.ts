import { Router } from 'express';
import { requireAuth } from '../../auth/middlewares/auth.middleware';
import {
  ALL_RESTAURANT_ROLES,
  OWNER_ONLY,
  requireRestaurantAccess,
} from '../../auth/middlewares/restaurant-access.middleware';
import {
  categoryFromParam,
  dishFromParam,
  dishFromReorderItems,
  menuFromBody,
} from '../middlewares/menu-access.middleware';
import { validateBody, validateParams } from '../../../middlewares/validate.middleware';
import {
  addDishSchema,
  updateDishSchema,
  setAvailabilitySchema,
  reorderDishesSchema,
  dishIdParamSchema,
  categoryIdParamSchema,
} from '../validators/dish.validator';
import * as DishController from '../controllers/dish.controller';

// ============================================================
// Dish (menu item) Routes — /api/v1/menu/dish/*
// ============================================================

const router = Router();

const ownerOfDish = requireRestaurantAccess(OWNER_ONLY, dishFromParam('id'));

router.use(requireAuth);

// POST /menu/dish/add
router.post(
  '/add',
  validateBody(addDishSchema),
  requireRestaurantAccess(OWNER_ONLY, menuFromBody('menuId')),
  DishController.addDish
);

// GET /menu/dish/getAll/:categoryId
router.get(
  '/getAll/:categoryId',
  validateParams(categoryIdParamSchema),
  requireRestaurantAccess(ALL_RESTAURANT_ROLES, categoryFromParam('categoryId')),
  DishController.getAllDishes
);

// GET /menu/dish/get/:id — full details of one menu item
router.get(
  '/get/:id',
  validateParams(dishIdParamSchema),
  requireRestaurantAccess(ALL_RESTAURANT_ROLES, dishFromParam('id')),
  DishController.getDish
);

// PUT /menu/dish/update/:id
router.put(
  '/update/:id',
  validateParams(dishIdParamSchema),
  ownerOfDish,
  validateBody(updateDishSchema),
  DishController.updateDish
);

// PUT /menu/dish/setAvailability/:id
router.put(
  '/setAvailability/:id',
  validateParams(dishIdParamSchema),
  ownerOfDish,
  validateBody(setAvailabilitySchema),
  DishController.setAvailability
);

// DELETE /menu/dish/delete/:id
router.delete(
  '/delete/:id',
  validateParams(dishIdParamSchema),
  ownerOfDish,
  DishController.deleteDish
);

// PATCH /menu/dish/reorder
router.patch(
  '/reorder',
  validateBody(reorderDishesSchema),
  requireRestaurantAccess(OWNER_ONLY, dishFromReorderItems),
  DishController.reorderDishes
);

export default router;
