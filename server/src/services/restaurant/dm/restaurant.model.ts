import mongoose, { Schema } from 'mongoose';
import { IRestaurantDocument } from '../interfaces/restaurant.interface';
import { APP_CONSTANTS, RestaurantStatus, RestaurantStatusAction } from '../../../config/constants';

// ============================================================
// Restaurant Model
// ============================================================

const gpsCoordinatesSchema = new Schema(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  { _id: false }
);

const statusChangeSchema = new Schema(
  {
    action: {
      type: String,
      enum: [...Object.values(RestaurantStatusAction), 'REGISTER'],
      required: true,
    },
    from: { type: String, enum: Object.values(RestaurantStatus) },
    to: { type: String, enum: Object.values(RestaurantStatus), required: true },
    reason: { type: String, trim: true },
    changedBy: { type: String, required: true },
    changedAt: { type: Date, required: true },
  },
  { _id: false }
);

const billingSettingsSchema = new Schema(
  {
    gstPercent: { type: Number, default: 0, min: 0, max: 28 },
    serviceChargePercent: { type: Number, default: 0, min: 0, max: 20 },
  },
  { _id: false }
);

const restaurantSchema = new Schema<IRestaurantDocument>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    gpsCoordinates: {
      type: gpsCoordinatesSchema,
      required: true,
    },
    gpsRadiusMeters: {
      type: Number,
      default: APP_CONSTANTS.DEFAULT_GPS_RADIUS_METERS,
      min: 50,
      max: 1000,
    },
    logoUrl: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // No schema default: documents without a status are pre-approval-era restaurants (treated as ACTIVE)
    status: {
      type: String,
      enum: Object.values(RestaurantStatus),
      index: true,
    },
    statusReason: {
      type: String,
      trim: true,
    },
    statusHistory: {
      type: [statusChangeSchema],
      default: [],
    },
    // 6-digit code staff type when logging in (generated on register, backfilled for older restaurants)
    restaurantCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    billingSettings: {
      type: billingSettingsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding restaurant by owner
restaurantSchema.index({ ownerId: 1 }, { unique: true });

export const RestaurantModel = mongoose.model<IRestaurantDocument>(
  'Restaurant',
  restaurantSchema
);
