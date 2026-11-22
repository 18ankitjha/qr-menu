import { Router } from 'express';
import { authMiddleware } from '../../auth/middlewares/auth.middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../../middlewares/validate.middleware';
import { requireSuperAdmin } from '../middlewares/super-admin.middleware';
import {
  listRestaurantsQuerySchema,
  optionalReasonBodySchema,
  requiredReasonBodySchema,
  restaurantIdParamSchema,
} from '../validators/super-admin.validator';
import { SUPER_ADMIN_ROUTES } from '../constants/super-admin.constants';
import * as SuperAdminController from '../controllers/super-admin.controller';

const router = Router();

// Every super admin route requires a logged-in user on the SUPER_ADMIN_EMAILS allowlist
router.use(authMiddleware, requireSuperAdmin);

router.get(SUPER_ADMIN_ROUTES.GET_ME, SuperAdminController.getMe);

router.get(SUPER_ADMIN_ROUTES.GET_STATS, SuperAdminController.getStats);

router.get(
  SUPER_ADMIN_ROUTES.GET_RESTAURANTS,
  validateQuery(listRestaurantsQuerySchema),
  SuperAdminController.getRestaurants
);

router.get(
  SUPER_ADMIN_ROUTES.GET_RESTAURANT,
  validateParams(restaurantIdParamSchema),
  SuperAdminController.getRestaurant
);

router.patch(
  SUPER_ADMIN_ROUTES.APPROVE_RESTAURANT,
  validateParams(restaurantIdParamSchema),
  validateBody(optionalReasonBodySchema),
  SuperAdminController.approveRestaurant
);

router.patch(
  SUPER_ADMIN_ROUTES.REJECT_RESTAURANT,
  validateParams(restaurantIdParamSchema),
  validateBody(requiredReasonBodySchema),
  SuperAdminController.rejectRestaurant
);

router.patch(
  SUPER_ADMIN_ROUTES.SUSPEND_RESTAURANT,
  validateParams(restaurantIdParamSchema),
  validateBody(requiredReasonBodySchema),
  SuperAdminController.suspendRestaurant
);

router.patch(
  SUPER_ADMIN_ROUTES.REACTIVATE_RESTAURANT,
  validateParams(restaurantIdParamSchema),
  validateBody(optionalReasonBodySchema),
  SuperAdminController.reactivateRestaurant
);

export default router;
