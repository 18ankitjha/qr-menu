import { Document, Types } from 'mongoose';
import { IGpsCoordinates } from '../../../interfaces/common.interface';
import { RestaurantStatus, RestaurantStatusAction } from '../../../config/constants';

// ============================================================
// Restaurant Interface
// ============================================================

export interface IRestaurantStatusChange {
  action: RestaurantStatusAction | 'REGISTER';
  from?: RestaurantStatus;
  to: RestaurantStatus;
  reason?: string;
  changedBy: string; // email of the actor
  changedAt: Date;
}

/** Percentages applied when a table bill is generated. GST is charged on subtotal + service charge. */
export interface IBillingSettings {
  gstPercent: number;
  serviceChargePercent: number;
}

export interface IRestaurant {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  address: string;
  gpsCoordinates: IGpsCoordinates;
  gpsRadiusMeters: number;
  logoUrl?: string;
  isActive: boolean;
  /** Missing on restaurants created before onboarding approval existed; treat as ACTIVE. */
  status?: RestaurantStatus;
  statusReason?: string;
  statusHistory?: IRestaurantStatusChange[];
  /** 6-digit code staff use to log in. */
  restaurantCode?: string;
  billingSettings?: IBillingSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRestaurantDocument extends Omit<IRestaurant, '_id'>, Document {}

export interface IRegisterRestaurantInput {
  name: string;
  address: string;
  gpsCoordinates: IGpsCoordinates;
  gpsRadiusMeters?: number;
  logoUrl?: string;
}

export interface IUpdateRestaurantInput {
  name?: string;
  address?: string;
  gpsCoordinates?: IGpsCoordinates;
  gpsRadiusMeters?: number;
  logoUrl?: string;
}

export interface IListRestaurantsFilter {
  status?: RestaurantStatus;
  search?: string;
  page: number;
  limit: number;
}

export interface IChangeRestaurantStatusInput {
  restaurantId: string;
  action: RestaurantStatusAction;
  reason?: string;
  actorEmail: string;
}

export type IRestaurantStatusCounts = Record<RestaurantStatus, number> & { TOTAL: number };
