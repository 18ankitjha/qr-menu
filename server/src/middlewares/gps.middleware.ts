import { Request, Response, NextFunction } from 'express';
import { ERROR_MESSAGES, APP_SETTINGS } from '../config/constants';
import { sendError } from '../utils/response.util';
import { isWithinRadius } from '../utils/gps.util';
import * as RestaurantDM from '../dm/restaurant/restaurant.dm';
import { logger } from '../utils/logger';
import { env } from '../config/env';

// ============================================================
// GPS Proximity Middleware — Validates customer is near restaurant
// ============================================================

/**
 * Validates that the order request includes GPS coordinates
 * and that the customer is within the restaurant's allowed radius.
 *
 * Expects `restaurantId` and `gpsCoordinates` in req.body.
 */
export const gpsMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Skip GPS validation in development — geolocation requires HTTPS on mobile
    if (env.NODE_ENV === APP_SETTINGS.DEVELOPMENT) {
      next();
      return;
    }

    const { restaurantId, gpsCoordinates } = req.body;

    if (!gpsCoordinates || !gpsCoordinates.latitude || !gpsCoordinates.longitude) {
      sendError(res, ERROR_MESSAGES.GPS_REQUIRED, 400);
      return;
    }

    const restaurant = await RestaurantDM.getRestaurantById(restaurantId);
    if (!restaurant) {
      sendError(res, ERROR_MESSAGES.RESTAURANT_NOT_FOUND, 404);
      return;
    }

    const withinRange = isWithinRadius(
      gpsCoordinates.latitude,
      gpsCoordinates.longitude,
      restaurant.gpsCoordinates.latitude,
      restaurant.gpsCoordinates.longitude,
      restaurant.gpsRadiusMeters
    );

    if (!withinRange) {
      logger.warn(
        `GPS rejection: customer at (${gpsCoordinates.latitude}, ${gpsCoordinates.longitude}), ` +
        `restaurant at (${restaurant.gpsCoordinates.latitude}, ${restaurant.gpsCoordinates.longitude}), ` +
        `radius: ${restaurant.gpsRadiusMeters}m`
      );
      sendError(res, ERROR_MESSAGES.GPS_OUT_OF_RANGE, 403);
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};
