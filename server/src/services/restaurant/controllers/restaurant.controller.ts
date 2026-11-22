import { Request, Response } from 'express';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../../config/constants';
import { sendSuccess, sendError } from '../../../utils/response.util';
import { asyncHandler } from '../../../middlewares/error.middleware';
import * as RestaurantDM from '../dm/restaurant.dm';
import { UserDM } from '../../auth';

// ============================================================
// Restaurant Controller
// ============================================================

/**
 * POST /restaurant/register
 */
export const registerRestaurant = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = req.user!.userId;
  const restaurant = await RestaurantDM.registerRestaurant(ownerId, req.user!.email, req.body);

  // Link restaurant to user
  await UserDM.linkRestaurantToUser(ownerId, restaurant._id.toString());

  sendSuccess(res, restaurant, SUCCESS_MESSAGES.RESTAURANT_REGISTERED, 201);
});

/**
 * GET /restaurant/get/:id
 */
export const getRestaurant = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const restaurant = await RestaurantDM.getRestaurantById(id);
  if (!restaurant) {
    sendError(res, ERROR_MESSAGES.RESTAURANT_NOT_FOUND, 404);
    return;
  }
  sendSuccess(res, restaurant, 'Restaurant fetched');
});

/**
 * PUT /restaurant/update/:id
 */
export const updateRestaurant = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = req.user!.userId;
  const id = req.params.id as string;
  const restaurant = await RestaurantDM.updateRestaurant(id, ownerId, req.body);
  sendSuccess(res, restaurant, SUCCESS_MESSAGES.RESTAURANT_UPDATED);
});

/**
 * PUT /restaurant/setGps/:id
 */
export const setGps = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = req.user!.userId;
  const id = req.params.id as string;
  const { gpsCoordinates, gpsRadiusMeters } = req.body;
  const restaurant = await RestaurantDM.setGpsCoordinates(
    id,
    ownerId,
    gpsCoordinates,
    gpsRadiusMeters
  );
  sendSuccess(res, restaurant, SUCCESS_MESSAGES.RESTAURANT_UPDATED);
});

/**
 * DELETE /restaurant/deactivate/:id
 */
export const deactivateRestaurant = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = req.user!.userId;
  const id = req.params.id as string;
  const restaurant = await RestaurantDM.deactivateRestaurant(id, ownerId);
  sendSuccess(res, restaurant, SUCCESS_MESSAGES.RESTAURANT_DEACTIVATED);
});

/**
 * PUT /restaurant/setBillingSettings/:id  { gstPercent, serviceChargePercent }
 */
export const setBillingSettings = asyncHandler(async (req: Request, res: Response) => {
  const restaurant = await RestaurantDM.setBillingSettings(req.params.id as string, req.body);
  sendSuccess(res, restaurant, SUCCESS_MESSAGES.RESTAURANT_UPDATED);
});
