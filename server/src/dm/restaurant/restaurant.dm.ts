import { RestaurantModel } from './restaurant.model';
import {
  IRestaurant,
  IRegisterRestaurantInput,
  IUpdateRestaurantInput,
} from '../../interfaces/restaurant.interface';
import { IGpsCoordinates } from '../../interfaces/common.interface';
import { ERROR_MESSAGES } from '../../config/constants';
import { createAppError } from '../../middlewares/error.middleware';

// ============================================================
// Restaurant DM Layer — Business logic + Data access
// ============================================================

/**
 * Register a new restaurant for an owner.
 * Throws if the owner already has a restaurant.
 */
export const registerRestaurant = async (
  ownerId: string,
  input: IRegisterRestaurantInput
): Promise<IRestaurant> => {
  // Check if owner already has a restaurant
  const existing = await RestaurantModel.findOne({ ownerId }).lean();
  if (existing) {
    throw createAppError(ERROR_MESSAGES.RESTAURANT_ALREADY_EXISTS, 409);
  }

  const restaurant = await RestaurantModel.create({
    ...input,
    ownerId,
  });

  return restaurant.toObject();
};

/**
 * Get restaurant by ID.
 */
export const getRestaurantById = async (id: string): Promise<IRestaurant | null> => {
  return RestaurantModel.findById(id).lean();
};

/**
 * Get restaurant by owner ID.
 */
export const getRestaurantByOwnerId = async (
  ownerId: string
): Promise<IRestaurant | null> => {
  return RestaurantModel.findOne({ ownerId }).lean();
};

/**
 * Update restaurant details.
 */
export const updateRestaurant = async (
  id: string,
  ownerId: string,
  input: IUpdateRestaurantInput
): Promise<IRestaurant | null> => {
  const restaurant = await RestaurantModel.findById(id).lean();
  if (!restaurant) {
    throw createAppError(ERROR_MESSAGES.RESTAURANT_NOT_FOUND, 404);
  }

  // Ensure the caller owns this restaurant
  if (restaurant.ownerId.toString() !== ownerId) {
    throw createAppError(ERROR_MESSAGES.FORBIDDEN, 403);
  }

  return RestaurantModel.findByIdAndUpdate(id, input, { new: true }).lean();
};

/**
 * Set GPS coordinates for a restaurant.
 */
export const setGpsCoordinates = async (
  id: string,
  ownerId: string,
  gpsCoordinates: IGpsCoordinates,
  gpsRadiusMeters?: number
): Promise<IRestaurant | null> => {
  const restaurant = await RestaurantModel.findById(id).lean();
  if (!restaurant) {
    throw createAppError(ERROR_MESSAGES.RESTAURANT_NOT_FOUND, 404);
  }

  if (restaurant.ownerId.toString() !== ownerId) {
    throw createAppError(ERROR_MESSAGES.FORBIDDEN, 403);
  }

  const update: Record<string, unknown> = { gpsCoordinates };
  if (gpsRadiusMeters !== undefined) {
    update.gpsRadiusMeters = gpsRadiusMeters;
  }

  return RestaurantModel.findByIdAndUpdate(id, update, { new: true }).lean();
};

/**
 * Soft-deactivate a restaurant.
 */
export const deactivateRestaurant = async (
  id: string,
  ownerId: string
): Promise<IRestaurant | null> => {
  const restaurant = await RestaurantModel.findById(id).lean();
  if (!restaurant) {
    throw createAppError(ERROR_MESSAGES.RESTAURANT_NOT_FOUND, 404);
  }

  if (restaurant.ownerId.toString() !== ownerId) {
    throw createAppError(ERROR_MESSAGES.FORBIDDEN, 403);
  }

  return RestaurantModel.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  ).lean();
};
