import { Router } from 'express';
import { requireAuth, requireUser } from '../../auth/middlewares/auth.middleware';
import {
  ALL_RESTAURANT_ROLES,
  OWNER_ONLY,
  fromParam,
  requireRestaurantAccess,
} from '../../auth/middlewares/restaurant-access.middleware';
import { validateBody, validateParams } from '../../../middlewares/validate.middleware';
import {
  registerRestaurantSchema,
  updateRestaurantSchema,
  setGpsSchema,
  setBillingSettingsSchema,
  restaurantIdParamSchema,
} from '../validators/restaurant.validator';
import * as RestaurantController from '../controllers/restaurant.controller';

// ============================================================
// Restaurant Routes — /api/v1/restaurant
// ============================================================

const router = Router();

const owner = requireRestaurantAccess(OWNER_ONLY, fromParam('id'));
const ownerOrStaff = requireRestaurantAccess(ALL_RESTAURANT_ROLES, fromParam('id'));

// POST /restaurant/register — any Google-authenticated user (one restaurant per owner)
router.post(
  '/register',
  requireUser,
  validateBody(registerRestaurantSchema),
  RestaurantController.registerRestaurant
);

router.use(requireAuth);

// GET /restaurant/get/:id — owner or staff
router.get(
  '/get/:id',
  validateParams(restaurantIdParamSchema),
  ownerOrStaff,
  RestaurantController.getRestaurant
);

// PUT /restaurant/update/:id
router.put(
  '/update/:id',
  validateParams(restaurantIdParamSchema),
  owner,
  validateBody(updateRestaurantSchema),
  RestaurantController.updateRestaurant
);

// PUT /restaurant/setGps/:id
router.put(
  '/setGps/:id',
  validateParams(restaurantIdParamSchema),
  owner,
  validateBody(setGpsSchema),
  RestaurantController.setGps
);

// PUT /restaurant/setBillingSettings/:id
router.put(
  '/setBillingSettings/:id',
  validateParams(restaurantIdParamSchema),
  owner,
  validateBody(setBillingSettingsSchema),
  RestaurantController.setBillingSettings
);

// DELETE /restaurant/deactivate/:id
router.delete(
  '/deactivate/:id',
  validateParams(restaurantIdParamSchema),
  owner,
  RestaurantController.deactivateRestaurant
);

export default router;
