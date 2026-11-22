import { Request, Response } from 'express';
import { sendSuccess } from '../../../utils/response.util';
import { asyncHandler } from '../../../middlewares/error.middleware';
import * as SetupDM from '../dm/setup.dm';
import { SETUP_MESSAGES } from '../constants/setup.constants';

// ============================================================
// Setup Controller
// ============================================================

/**
 * GET /setup/getStatus/:restaurantId — Quick Setup progress for the owner's dashboard.
 */
export const getStatus = asyncHandler(async (req: Request, res: Response) => {
  const status = await SetupDM.getSetupStatus(req.params.restaurantId as string);
  sendSuccess(res, status, SETUP_MESSAGES.FETCHED);
});
