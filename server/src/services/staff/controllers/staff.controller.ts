import { Request, Response } from 'express';
import { sendSuccess } from '../../../utils/response.util';
import { asyncHandler } from '../../../middlewares/error.middleware';
import { STAFF_MESSAGES } from '../constants/staff.constants';
import * as StaffDM from '../dm/staff.dm';

// ============================================================
// Staff Controller — owner manages waiters
// ============================================================

/** POST /staff/add  { restaurantId, name, username, pin? } → { staff, pin } */
export const addStaff = asyncHandler(async (req: Request, res: Response) => {
  const result = await StaffDM.addStaff(req.body);
  sendSuccess(res, result, STAFF_MESSAGES.ADDED, 201);
});

/** GET /staff/getAll/:restaurantId */
export const getAllStaff = asyncHandler(async (req: Request, res: Response) => {
  const staff = await StaffDM.getStaffByRestaurantId(req.params.restaurantId as string);
  sendSuccess(res, staff, STAFF_MESSAGES.FETCHED);
});

/** POST /staff/resetPin/:id  { pin? } → { staff, pin } */
export const resetPin = asyncHandler(async (req: Request, res: Response) => {
  const result = await StaffDM.resetPin(req.params.id as string, req.body?.pin);
  sendSuccess(res, result, STAFF_MESSAGES.PIN_RESET);
});

/** GET /staff/getPin/:id → { pin } */
export const getPin = asyncHandler(async (req: Request, res: Response) => {
  const pin = await StaffDM.getPin(req.params.id as string);
  sendSuccess(res, { pin }, STAFF_MESSAGES.PIN_FETCHED);
});

/** PATCH /staff/setActive/:id  { isActive } */
export const setActive = asyncHandler(async (req: Request, res: Response) => {
  const staff = await StaffDM.setActive(req.params.id as string, req.body.isActive);
  sendSuccess(res, staff, STAFF_MESSAGES.UPDATED);
});

/** DELETE /staff/remove/:id */
export const removeStaff = asyncHandler(async (req: Request, res: Response) => {
  await StaffDM.removeStaff(req.params.id as string);
  sendSuccess(res, null, STAFF_MESSAGES.REMOVED);
});
