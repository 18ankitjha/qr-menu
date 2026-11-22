import { Types } from 'mongoose';
import { RestaurantStatus } from '../../../config/constants';
import { IRestaurant, IRestaurantStatusCounts } from '../../restaurant/interfaces/restaurant.interface';
import { IOrderSummary } from '../../order/interfaces/order.interface';
import { IPagination } from '../../../interfaces/common.interface';

// ============================================================
// Super Admin Service — Interfaces
// ============================================================

export interface IOwnerSummary {
  _id: Types.ObjectId;
  name: string;
  email: string;
  profilePicture?: string;
}

/** Restaurant as seen by the super admin: status is always resolved (legacy → ACTIVE). */
export interface ISuperAdminRestaurant extends Omit<IRestaurant, 'status'> {
  status: RestaurantStatus;
  owner: IOwnerSummary | null;
}

export interface IRestaurantListResponse {
  items: ISuperAdminRestaurant[];
  pagination: IPagination;
}

export interface IRestaurantDetailsResponse {
  restaurant: ISuperAdminRestaurant;
  stats: {
    menuName: string | null;
    dishCount: number;
    tableCount: number;
    orders: IOrderSummary;
  };
}

export interface IPlatformStatsResponse {
  counts: IRestaurantStatusCounts;
  recentPending: ISuperAdminRestaurant[];
}

export interface ISuperAdminProfile {
  userId: string;
  email: string;
  name?: string;
  profilePicture?: string;
}

export interface IRestaurantDeletionSummary {
  restaurantId: string;
  restaurantName: string;
  ownerDeleted: boolean;
  deleted: {
    menus: number;
    categories: number;
    dishes: number;
    tables: number;
    staff: number;
    orders: number;
    bills: number;
    tableSessions: number;
  };
  /** Cloudinary images (uploads + table QRs) scheduled for deletion. */
  imagesQueued: number;
}
