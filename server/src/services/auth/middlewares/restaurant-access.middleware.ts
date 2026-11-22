import { Request, Response, NextFunction } from 'express';
import { AuthKind, ERROR_MESSAGES, RestaurantRole } from '../../../config/constants';
import { sendError } from '../../../utils/response.util';
import { IAuthContext } from '../interfaces/auth.interface';
import { RestaurantDM } from '../../restaurant';
import { StaffDM } from '../../staff';

// ============================================================
// Restaurant Access — "may this caller act on this restaurant, in one of these roles?"
// Must run after `requireAuth`. Each route says how to find the restaurant it touches
// (a resolver), so ownership is checked the same way everywhere.
// ============================================================

export type RestaurantIdResolver = (
  req: Request
) => Promise<string | null | undefined> | string | null | undefined;

export const fromParam = (name: string): RestaurantIdResolver => (req) => req.params[name] as string;
export const fromBody = (name: string): RestaurantIdResolver => (req) => req.body?.[name];

export const ALL_RESTAURANT_ROLES = [RestaurantRole.OWNER, RestaurantRole.WAITER];
export const OWNER_ONLY = [RestaurantRole.OWNER];

const getRoleInRestaurant = async (
  auth: IAuthContext,
  restaurantId: string
): Promise<RestaurantRole | null> => {
  if (auth.kind === AuthKind.STAFF) {
    if (auth.restaurantId !== restaurantId || !auth.staffId) return null;
    // Re-checked on every request so disabling a waiter takes effect immediately
    const staff = await StaffDM.getStaffById(auth.staffId);
    if (!staff || !staff.isActive || staff.restaurantId.toString() !== restaurantId) return null;
    return staff.role;
  }

  const restaurant = await RestaurantDM.getRestaurantById(restaurantId);
  return restaurant && restaurant.ownerId.toString() === auth.userId ? RestaurantRole.OWNER : null;
};

export const requireRestaurantAccess =
  (roles: RestaurantRole[], resolveRestaurantId: RestaurantIdResolver) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth) {
        sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
        return;
      }

      const restaurantId = await resolveRestaurantId(req);
      if (!restaurantId) {
        sendError(res, ERROR_MESSAGES.NOT_FOUND, 404);
        return;
      }

      const role = await getRoleInRestaurant(req.auth, restaurantId.toString());
      if (!role || !roles.includes(role)) {
        sendError(res, ERROR_MESSAGES.FORBIDDEN, 403);
        return;
      }

      req.auth.role = role;
      req.auth.restaurantId = restaurantId.toString();
      next();
    } catch (error) {
      next(error);
    }
  };
