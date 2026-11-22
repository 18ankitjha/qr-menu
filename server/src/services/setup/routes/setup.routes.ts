import { Router } from 'express';
import { requireAuth } from '../../auth/middlewares/auth.middleware';
import {
  OWNER_ONLY,
  fromParam,
  requireRestaurantAccess,
} from '../../auth/middlewares/restaurant-access.middleware';
import { validateParams } from '../../../middlewares/validate.middleware';
import { restaurantIdParamSchema } from '../validators/setup.validator';
import * as SetupController from '../controllers/setup.controller';

// ============================================================
// Setup Routes — /api/v1/setup (restaurant owner only)
// ============================================================

const router = Router();

router.use(requireAuth);

// GET /setup/getStatus/:restaurantId
router.get(
  '/getStatus/:restaurantId',
  validateParams(restaurantIdParamSchema),
  requireRestaurantAccess(OWNER_ONLY, fromParam('restaurantId')),
  SetupController.getStatus
);

export default router;
