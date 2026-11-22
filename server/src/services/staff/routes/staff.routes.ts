import { Router, Request } from 'express';
import { requireAuth } from '../../auth/middlewares/auth.middleware';
import {
  OWNER_ONLY,
  fromBody,
  fromParam,
  requireRestaurantAccess,
} from '../../auth/middlewares/restaurant-access.middleware';
import { validateBody, validateParams } from '../../../middlewares/validate.middleware';
import {
  addStaffSchema,
  resetPinSchema,
  restaurantIdParamSchema,
  setStaffActiveSchema,
  staffIdParamSchema,
} from '../validators/staff.validator';
import * as StaffDM from '../dm/staff.dm';
import * as StaffController from '../controllers/staff.controller';

// ============================================================
// Staff Routes — /api/v1/staff (restaurant owner only)
// ============================================================

const router = Router();

const restaurantOfStaff = async (req: Request) =>
  (await StaffDM.getStaffById(req.params.id as string))?.restaurantId.toString();

router.use(requireAuth);

// POST /staff/add
router.post(
  '/add',
  validateBody(addStaffSchema),
  requireRestaurantAccess(OWNER_ONLY, fromBody('restaurantId')),
  StaffController.addStaff
);

// GET /staff/getAll/:restaurantId
router.get(
  '/getAll/:restaurantId',
  validateParams(restaurantIdParamSchema),
  requireRestaurantAccess(OWNER_ONLY, fromParam('restaurantId')),
  StaffController.getAllStaff
);

// POST /staff/resetPin/:id
router.post(
  '/resetPin/:id',
  validateParams(staffIdParamSchema),
  validateBody(resetPinSchema),
  requireRestaurantAccess(OWNER_ONLY, restaurantOfStaff),
  StaffController.resetPin
);

// GET /staff/getPin/:id — owner views a waiter's PIN
router.get(
  '/getPin/:id',
  validateParams(staffIdParamSchema),
  requireRestaurantAccess(OWNER_ONLY, restaurantOfStaff),
  StaffController.getPin
);

// PATCH /staff/setActive/:id
router.patch(
  '/setActive/:id',
  validateParams(staffIdParamSchema),
  validateBody(setStaffActiveSchema),
  requireRestaurantAccess(OWNER_ONLY, restaurantOfStaff),
  StaffController.setActive
);

// DELETE /staff/remove/:id
router.delete(
  '/remove/:id',
  validateParams(staffIdParamSchema),
  requireRestaurantAccess(OWNER_ONLY, restaurantOfStaff),
  StaffController.removeStaff
);

export default router;
