import { APP_SETTINGS, ERROR_MESSAGES } from '../../../config/constants';
import { env } from '../../../config/env';
import { createAppError } from '../../../middlewares/error.middleware';
import { IGpsCoordinates } from '../../../interfaces/common.interface';
import { isWithinRadius } from '../../../utils/gps.util';
import { logger } from '../../../utils/logger';
import { IRestaurant } from '../../restaurant';

// ============================================================
// Proximity — a diner must be at the restaurant to join a table (checked once, on join).
// Skipped in development: browsers only share location over HTTPS on phones.
// ============================================================

export const assertNearRestaurant = (restaurant: IRestaurant, coords?: IGpsCoordinates): void => {
  if (env.NODE_ENV === APP_SETTINGS.DEVELOPMENT) return;

  if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
    throw createAppError(ERROR_MESSAGES.GPS_REQUIRED, 400);
  }

  const near = isWithinRadius(
    coords.latitude,
    coords.longitude,
    restaurant.gpsCoordinates.latitude,
    restaurant.gpsCoordinates.longitude,
    restaurant.gpsRadiusMeters
  );
  if (!near) {
    logger.warn(
      `GPS rejection: diner at (${coords.latitude}, ${coords.longitude}), restaurant ${restaurant._id.toString()} ` +
        `at (${restaurant.gpsCoordinates.latitude}, ${restaurant.gpsCoordinates.longitude}), radius ${restaurant.gpsRadiusMeters}m`
    );
    throw createAppError(ERROR_MESSAGES.GPS_OUT_OF_RANGE, 403);
  }
};
