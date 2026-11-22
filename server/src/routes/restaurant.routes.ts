import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateBody, validateParams } from '../middlewares/validate.middleware';
import {
  registerRestaurantSchema,
  updateRestaurantSchema,
  setGpsSchema,
  restaurantIdParamSchema,
} from '../validators/restaurant.validator';
import * as RestaurantController from '../controllers/restaurant.controller';

const router = Router();

// All restaurant routes require auth
router.use(authMiddleware);

// POST /restaurant/register
router.post(
  '/register',
  validateBody(registerRestaurantSchema),
  RestaurantController.registerRestaurant
);

// GET /restaurant/get/:id
router.get(
  '/get/:id',
  validateParams(restaurantIdParamSchema),
  RestaurantController.getRestaurant
);

// PUT /restaurant/update/:id
router.put(
  '/update/:id',
  validateParams(restaurantIdParamSchema),
  validateBody(updateRestaurantSchema),
  RestaurantController.updateRestaurant
);

// PUT /restaurant/setGps/:id
router.put(
  '/setGps/:id',
  validateParams(restaurantIdParamSchema),
  validateBody(setGpsSchema),
  RestaurantController.setGps
);

// DELETE /restaurant/deactivate/:id
router.delete(
  '/deactivate/:id',
  validateParams(restaurantIdParamSchema),
  RestaurantController.deactivateRestaurant
);

export default router;
