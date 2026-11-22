import mongoose, { Schema } from 'mongoose';
import { IRestaurantDocument } from '../../interfaces/restaurant.interface';
import { APP_CONSTANTS } from '../../config/constants';

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
