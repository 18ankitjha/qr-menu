import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateBody, validateParams } from '../middlewares/validate.middleware';
import {
  addDishSchema,
  updateDishSchema,
  setAvailabilitySchema,
  reorderDishesSchema,
  dishIdParamSchema,
  categoryIdParamSchema,
} from '../validators/dish.validator';
import * as DishController from '../controllers/dish.controller';

const router = Router();

// All dish routes require auth
router.use(authMiddleware);

// POST /dish/add
router.post(
  '/add',
  validateBody(addDishSchema),
  DishController.addDish
);

// GET /dish/getAll/:categoryId
router.get(
  '/getAll/:categoryId',
  validateParams(categoryIdParamSchema),
  DishController.getAllDishes
);

// PUT /dish/update/:id
router.put(
  '/update/:id',
  validateParams(dishIdParamSchema),
  validateBody(updateDishSchema),
  DishController.updateDish
);

// PUT /dish/setAvailability/:id
router.put(
  '/setAvailability/:id',
  validateParams(dishIdParamSchema),
  validateBody(setAvailabilitySchema),
  DishController.setAvailability
);

// DELETE /dish/delete/:id
router.delete(
  '/delete/:id',
  validateParams(dishIdParamSchema),
  DishController.deleteDish
);

// PATCH /dish/reorder
router.patch(
  '/reorder',
  validateBody(reorderDishesSchema),
  DishController.reorderDishes
);

export default router;
