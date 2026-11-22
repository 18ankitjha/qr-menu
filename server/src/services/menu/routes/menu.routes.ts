import { Router } from 'express';
import { requireAuth } from '../../auth/middlewares/auth.middleware';
import {
  ALL_RESTAURANT_ROLES,
  fromBody,
  fromParam,
  requireApprovedOwner,
  requireRestaurantAccess,
} from '../../auth/middlewares/restaurant-access.middleware';
import { menuFromParam } from '../middlewares/menu-access.middleware';
import { validateBody, validateParams } from '../../../middlewares/validate.middleware';
import {
  createMenuSchema,
  updateMenuSchema,
  setMenuThemeSchema,
  menuIdParamSchema,
  restaurantIdParamSchema,
} from '../validators/menu.validator';
import * as MenuController from '../controllers/menu.controller';

// ============================================================
// Menu Routes — /api/v1/menu/*
// ============================================================

const router = Router();

router.use(requireAuth);

// POST /menu/create
router.post(
  '/create',
  validateBody(createMenuSchema),
  requireApprovedOwner(fromBody('restaurantId')),
  MenuController.createMenu
);

// GET /menu/get/:restaurantId — owner or staff
router.get(
  '/get/:restaurantId',
  validateParams(restaurantIdParamSchema),
  requireRestaurantAccess(ALL_RESTAURANT_ROLES, fromParam('restaurantId')),
  MenuController.getMenu
);

// PUT /menu/update/:menuId
router.put(
  '/update/:menuId',
  validateParams(menuIdParamSchema),
  requireApprovedOwner(menuFromParam('menuId')),
  validateBody(updateMenuSchema),
  MenuController.updateMenu
);

// PUT /menu/setTheme/:menuId
router.put(
  '/setTheme/:menuId',
  validateParams(menuIdParamSchema),
  requireApprovedOwner(menuFromParam('menuId')),
  validateBody(setMenuThemeSchema),
  MenuController.setTheme
);

export default router;
