import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateBody, validateParams } from '../middlewares/validate.middleware';
import {
  createMenuSchema,
  updateMenuSchema,
  setMenuThemeSchema,
  menuIdParamSchema,
  restaurantIdParamSchema,
} from '../validators/menu.validator';
import * as MenuController from '../controllers/menu.controller';

const router = Router();

// All menu routes require auth
router.use(authMiddleware);

// POST /menu/create
router.post(
  '/create',
  validateBody(createMenuSchema),
  MenuController.createMenu
);

// GET /menu/get/:restaurantId
router.get(
  '/get/:restaurantId',
  validateParams(restaurantIdParamSchema),
  MenuController.getMenu
);

// PUT /menu/update/:menuId
router.put(
  '/update/:menuId',
  validateParams(menuIdParamSchema),
  validateBody(updateMenuSchema),
  MenuController.updateMenu
);

// PUT /menu/setTheme/:menuId
router.put(
  '/setTheme/:menuId',
  validateParams(menuIdParamSchema),
  validateBody(setMenuThemeSchema),
  MenuController.setTheme
);

export default router;
