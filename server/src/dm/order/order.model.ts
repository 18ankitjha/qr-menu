import mongoose, { Schema } from 'mongoose';
import { IOrderDocument } from '../../interfaces/order.interface';
import { OrderStatus } from '../../config/constants';

// ============================================================
// Order Model
// ============================================================

const orderItemSchema = new Schema(
  {
    dishId: {
      type: Schema.Types.ObjectId,
      ref: 'Dish',
      required: true,
    },
    dishName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const gpsSchema = new Schema(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrderDocument>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    tableId: {
      type: Schema.Types.ObjectId,
      ref: 'Table',
      required: true,
      index: true,
    },
    tableNumber: {
      type: Number,
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [(v: unknown[]) => v.length > 0, 'Order must have at least one item'],
    },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PLACED,
      index: true,
    },
    specialInstructions: {
      type: String,
      trim: true,
    },
    customerName: {
      type: String,
      trim: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    gpsCoordinates: {
      type: gpsSchema,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
orderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
orderSchema.index({ tableId: 1, status: 1 });

export const OrderModel = mongoose.model<IOrderDocument>('Order', orderSchema);
