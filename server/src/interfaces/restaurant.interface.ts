import { Document, Types } from 'mongoose';
import { IGpsCoordinates } from './common.interface';

// ============================================================
// Restaurant Interface
// ============================================================

export interface IRestaurant {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  address: string;
  gpsCoordinates: IGpsCoordinates;
  gpsRadiusMeters: number;
  logoUrl?: string;
  isActive: boolean;
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
