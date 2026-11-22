import type { RestaurantStatus } from '../constants';

// ============================================================
// Super Admin Types — mirror server/src/services/super-admin/interfaces
// ============================================================

interface IApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: { field: string; message: string }[];
}

interface IPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ISuperAdminProfile {
  userId: string;
  email: string;
  name?: string;
  profilePicture?: string;
}

interface IOwnerSummary {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string;
}

interface IStatusChange {
  action: 'REGISTER' | 'APPROVE' | 'REJECT' | 'SUSPEND' | 'REACTIVATE';
  from?: RestaurantStatus;
  to: RestaurantStatus;
  reason?: string;
  changedBy: string;
  changedAt: string;
}

interface IRestaurant {
  _id: string;
  ownerId: string;
  name: string;
  address: string;
  gpsCoordinates: { latitude: number; longitude: number };
  gpsRadiusMeters: number;
  logoUrl?: string;
  isActive: boolean;
  status: RestaurantStatus;
  statusReason?: string;
  statusHistory?: IStatusChange[];
  owner: IOwnerSummary | null;
  createdAt: string;
  updatedAt: string;
}

interface IRestaurantList {
  items: IRestaurant[];
  pagination: IPagination;
}

interface IRestaurantDetails {
  restaurant: IRestaurant;
  stats: {
    menuName: string | null;
    dishCount: number;
    tableCount: number;
    orders: {
      totalOrders: number;
      deliveredOrders: number;
      deliveredRevenue: number;
      lastOrderAt: string | null;
    };
  };
}

type IStatusCounts = Record<RestaurantStatus, number> & { TOTAL: number };

interface IPlatformStats {
  counts: IStatusCounts;
  recentPending: IRestaurant[];
}

export type {
  IApiResponse,
  IPagination,
  ISuperAdminProfile,
  IOwnerSummary,
  IStatusChange,
  IRestaurant,
  IRestaurantList,
  IRestaurantDetails,
  IStatusCounts,
  IPlatformStats,
};
