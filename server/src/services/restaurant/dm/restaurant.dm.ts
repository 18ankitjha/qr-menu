import crypto from 'crypto';
import { RestaurantModel } from './restaurant.model';
import {
  IRestaurant,
  IBillingSettings,
  IRegisterRestaurantInput,
  IUpdateRestaurantInput,
  IListRestaurantsFilter,
  IChangeRestaurantStatusInput,
  IRestaurantStatusCounts,
} from '../interfaces/restaurant.interface';
import { IGpsCoordinates, IPaginatedResponse } from '../../../interfaces/common.interface';
import {
  ERROR_MESSAGES,
  LEGACY_RESTAURANT_STATUS,
  RESTAURANT_STATUS_TRANSITIONS,
  RestaurantStatus,
} from '../../../config/constants';
import { createAppError } from '../../../middlewares/error.middleware';

// ============================================================
// Restaurant DM Layer — Business logic + Data access
// ============================================================

/**
 * Status of a restaurant, treating pre-onboarding-era documents (no status) as ACTIVE.
 */
export const getEffectiveStatus = (restaurant: Pick<IRestaurant, 'status'>): RestaurantStatus =>
  restaurant.status ?? LEGACY_RESTAURANT_STATUS;

/**
 * A restaurant can serve its menu and take orders only when approved and not owner-deactivated.
 */
export const isRestaurantOperational = (
  restaurant: Pick<IRestaurant, 'status' | 'isActive'>
): boolean => restaurant.isActive && getEffectiveStatus(restaurant) === RestaurantStatus.ACTIVE;

/** Mongo filter for a status; `null` also matches documents that have no status field. */
const statusFilter = (status: RestaurantStatus) =>
  status === LEGACY_RESTAURANT_STATUS ? { status: { $in: [status, null] } } : { status };

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const RESTAURANT_CODE_ATTEMPTS = 10;

/** A random 6-digit code not used by any other restaurant. */
const generateUniqueRestaurantCode = async (): Promise<string> => {
  for (let i = 0; i < RESTAURANT_CODE_ATTEMPTS; i++) {
    const code = crypto.randomInt(100000, 1000000).toString();
    if (!(await RestaurantModel.exists({ restaurantCode: code }))) return code;
  }
  throw createAppError(ERROR_MESSAGES.INTERNAL_ERROR, 500);
};

/**
 * Give every restaurant created before restaurant codes existed a code. Safe to run on every start.
 */
export const backfillRestaurantCodes = async (): Promise<number> => {
  const missing = await RestaurantModel.find({ restaurantCode: { $exists: false } }).select('_id').lean();
  for (const { _id } of missing) {
    await RestaurantModel.updateOne(
      { _id, restaurantCode: { $exists: false } },
      { restaurantCode: await generateUniqueRestaurantCode() }
    );
  }
  return missing.length;
};

/**
 * Find a restaurant by the 6-digit code staff log in with.
 */
export const getRestaurantByCode = async (code: string): Promise<IRestaurant | null> =>
  RestaurantModel.findOne({ restaurantCode: code }).lean();

/**
 * Set GST / service charge percentages used for table bills.
 */
export const setBillingSettings = async (
  id: string,
  billingSettings: IBillingSettings
): Promise<IRestaurant> => {
  const updated = await RestaurantModel.findByIdAndUpdate(id, { billingSettings }, { new: true }).lean();
  if (!updated) {
    throw createAppError(ERROR_MESSAGES.RESTAURANT_NOT_FOUND, 404);
  }
  return updated;
};

/**
 * Register a new restaurant for an owner.
 * New restaurants wait for super admin approval before they can take orders.
 * Throws if the owner already has a restaurant.
 */
export const registerRestaurant = async (
  ownerId: string,
  ownerEmail: string,
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
    restaurantCode: await generateUniqueRestaurantCode(),
    status: RestaurantStatus.PENDING_APPROVAL,
    statusHistory: [
      {
        action: 'REGISTER',
        to: RestaurantStatus.PENDING_APPROVAL,
        changedBy: ownerEmail,
        changedAt: new Date(),
      },
    ],
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

/**
 * List restaurants (platform-wide) with optional status filter, name/address search and pagination.
 */
export const listRestaurants = async (
  filter: IListRestaurantsFilter
): Promise<IPaginatedResponse<IRestaurant>> => {
  const query: Record<string, unknown> = filter.status ? statusFilter(filter.status) : {};

  if (filter.search) {
    const pattern = new RegExp(escapeRegex(filter.search), 'i');
    query.$or = [{ name: pattern }, { address: pattern }];
  }

  const [items, total] = await Promise.all([
    RestaurantModel.find(query)
      .sort({ createdAt: -1 })
      .skip((filter.page - 1) * filter.limit)
      .limit(filter.limit)
      .lean(),
    RestaurantModel.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      page: filter.page,
      limit: filter.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / filter.limit)),
    },
  };
};

/**
 * Count restaurants per onboarding status (legacy documents without a status count as ACTIVE).
 */
export const countRestaurantsByStatus = async (): Promise<IRestaurantStatusCounts> => {
  const groups = await RestaurantModel.aggregate<{ _id: RestaurantStatus | null; count: number }>([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const counts = Object.values(RestaurantStatus).reduce(
    (acc, status) => ({ ...acc, [status]: 0 }),
    { TOTAL: 0 } as IRestaurantStatusCounts
  );

  for (const group of groups) {
    const status = group._id ?? LEGACY_RESTAURANT_STATUS;
    counts[status] += group.count;
    counts.TOTAL += group.count;
  }

  return counts;
};

/**
 * Apply a super admin onboarding action (approve / reject / suspend / reactivate).
 * Validates the transition and records it in the status history.
 */
export const changeRestaurantStatus = async (
  input: IChangeRestaurantStatusInput
): Promise<IRestaurant> => {
  const restaurant = await RestaurantModel.findById(input.restaurantId).lean();
  if (!restaurant) {
    throw createAppError(ERROR_MESSAGES.RESTAURANT_NOT_FOUND, 404);
  }

  const transition = RESTAURANT_STATUS_TRANSITIONS[input.action];
  const currentStatus = getEffectiveStatus(restaurant);

  if (!transition.from.includes(currentStatus)) {
    throw createAppError(
      ERROR_MESSAGES.INVALID_RESTAURANT_STATUS_TRANSITION(input.action, currentStatus),
      409
    );
  }

  const reason = input.reason?.trim();
  if (transition.reasonRequired && !reason) {
    throw createAppError(ERROR_MESSAGES.STATUS_REASON_REQUIRED, 400);
  }

  // statusReason explains the *current* blocked state (rejected/suspended) to the owner.
  // Optional notes on approve/reactivate are kept only in the history, and clear the old reason.
  const update: Record<string, unknown> = {
    $set: { status: transition.to, ...(transition.reasonRequired ? { statusReason: reason } : {}) },
    $push: {
      statusHistory: {
        action: input.action,
        from: currentStatus,
        to: transition.to,
        reason,
        changedBy: input.actorEmail,
        changedAt: new Date(),
      },
    },
  };
  if (!transition.reasonRequired) {
    update.$unset = { statusReason: 1 };
  }

  // Guard against a concurrent change between the read above and this write
  const updated = await RestaurantModel.findOneAndUpdate(
    { _id: input.restaurantId, ...statusFilter(currentStatus) },
    update,
    { new: true }
  ).lean();

  if (!updated) {
    throw createAppError(
      ERROR_MESSAGES.INVALID_RESTAURANT_STATUS_TRANSITION(input.action, 'already changed'),
      409
    );
  }

  return updated;
};
