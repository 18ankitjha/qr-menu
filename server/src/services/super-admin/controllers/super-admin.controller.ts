import { Request, Response } from 'express';
import {
  ERROR_MESSAGES,
  RestaurantStatus,
  RestaurantStatusAction,
  SUCCESS_MESSAGES,
} from '../../../config/constants';
import { asyncHandler } from '../../../middlewares/error.middleware';
import { sendError, sendSuccess } from '../../../utils/response.util';
import { IRestaurant } from '../../restaurant/interfaces/restaurant.interface';
import { IUser } from '../../auth/interfaces/user.interface';
import * as RestaurantDM from '../../restaurant/dm/restaurant.dm';
import * as UserDM from '../../auth/dm/user.dm';
import * as MenuDM from '../../menu/dm/menu.dm';
import * as DishDM from '../../menu/dm/dish.dm';
import * as TableDM from '../../table/dm/table.dm';
import * as OrderDM from '../../order/dm/order.dm';
import { SUPER_ADMIN_LIMITS, SUPER_ADMIN_MESSAGES } from '../constants/super-admin.constants';
import { IListRestaurantsQuery } from '../validators/super-admin.validator';
import {
  IOwnerSummary,
  IPlatformStatsResponse,
  IRestaurantDetailsResponse,
  IRestaurantListResponse,
  ISuperAdminProfile,
  ISuperAdminRestaurant,
} from '../interfaces/super-admin.interface';

// ============================================================
// Super Admin Controller — platform-wide restaurant onboarding
// ============================================================

const toOwnerSummary = (user?: IUser | null): IOwnerSummary | null =>
  user
    ? { _id: user._id, name: user.name, email: user.email, profilePicture: user.profilePicture }
    : null;

const withOwners = async (restaurants: IRestaurant[]): Promise<ISuperAdminRestaurant[]> => {
  const ownerIds = [...new Set(restaurants.map((r) => r.ownerId.toString()))];
  const owners = await UserDM.getUsersByIds(ownerIds);
  const ownerById = new Map(owners.map((o) => [o._id.toString(), o]));

  return restaurants.map((restaurant) => ({
    ...restaurant,
    status: RestaurantDM.getEffectiveStatus(restaurant),
    owner: toOwnerSummary(ownerById.get(restaurant.ownerId.toString())),
  }));
};

/**
 * GET /super-admin/getMe — confirms the caller is a super admin.
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await UserDM.getUserById(req.user!.userId);
  const profile: ISuperAdminProfile = {
    userId: req.user!.userId,
    email: req.user!.email,
    name: user?.name,
    profilePicture: user?.profilePicture,
  };
  sendSuccess(res, profile, SUPER_ADMIN_MESSAGES.PROFILE_FETCHED);
});

/**
 * GET /super-admin/getStats — restaurant counts per status + latest pending requests.
 */
export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const [counts, pending] = await Promise.all([
    RestaurantDM.countRestaurantsByStatus(),
    RestaurantDM.listRestaurants({
      status: RestaurantStatus.PENDING_APPROVAL,
      page: 1,
      limit: SUPER_ADMIN_LIMITS.RECENT_PENDING,
    }),
  ]);

  const response: IPlatformStatsResponse = {
    counts,
    recentPending: await withOwners(pending.items),
  };
  sendSuccess(res, response, SUPER_ADMIN_MESSAGES.STATS_FETCHED);
});

/**
 * GET /super-admin/getRestaurants?status=&search=&page=&limit=
 */
export const getRestaurants = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as IListRestaurantsQuery;
  const result = await RestaurantDM.listRestaurants(query);

  const response: IRestaurantListResponse = {
    items: await withOwners(result.items),
    pagination: result.pagination,
  };
  sendSuccess(res, response, SUPER_ADMIN_MESSAGES.RESTAURANTS_FETCHED);
});

/**
 * GET /super-admin/getRestaurant/:id — restaurant, owner, setup and order stats, status history.
 */
export const getRestaurant = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const restaurant = await RestaurantDM.getRestaurantById(id);
  if (!restaurant) {
    sendError(res, ERROR_MESSAGES.RESTAURANT_NOT_FOUND, 404);
    return;
  }

  const [[withOwner], menu, tableCount, orders] = await Promise.all([
    withOwners([restaurant]),
    MenuDM.getMenuByRestaurantId(id),
    TableDM.countTablesByRestaurantId(id),
    OrderDM.getOrderSummaryByRestaurantId(id),
  ]);
  const dishCount = menu ? await DishDM.countDishesByMenuId(menu._id.toString()) : 0;

  const response: IRestaurantDetailsResponse = {
    restaurant: withOwner,
    stats: { menuName: menu?.name ?? null, dishCount, tableCount, orders },
  };
  sendSuccess(res, response, SUPER_ADMIN_MESSAGES.RESTAURANT_FETCHED);
});

/**
 * PATCH /super-admin/{approve|reject|suspend|reactivate}Restaurant/:id  { reason? }
 */
const changeStatus = (action: RestaurantStatusAction) =>
  asyncHandler(async (req: Request, res: Response) => {
    const updated = await RestaurantDM.changeRestaurantStatus({
      restaurantId: req.params.id as string,
      action,
      reason: req.body?.reason,
      actorEmail: req.user!.email,
    });

    const [withOwner] = await withOwners([updated]);
    sendSuccess(res, withOwner, SUCCESS_MESSAGES.RESTAURANT_STATUS_UPDATED(withOwner.status));
  });

export const approveRestaurant = changeStatus(RestaurantStatusAction.APPROVE);
export const rejectRestaurant = changeStatus(RestaurantStatusAction.REJECT);
export const suspendRestaurant = changeStatus(RestaurantStatusAction.SUSPEND);
export const reactivateRestaurant = changeStatus(RestaurantStatusAction.REACTIVATE);
