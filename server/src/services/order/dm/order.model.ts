import mongoose, { Schema } from 'mongoose';
import { IOrderDocument } from '../interfaces/order.interface';
import { OrderStatus, RestaurantRole } from '../../../config/constants';

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
    // Diner who put this line in the shared table cart (customer orders only)
    addedBy: {
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

const placedBySchema = new Schema(
  {
    role: { type: String, enum: Object.values(RestaurantRole), required: true },
    actorId: { type: String, required: true },
    name: { type: String, required: true },
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
    // Set when the order is included in a table bill (billing service)
    billId: {
      type: Schema.Types.ObjectId,
      ref: 'Bill',
      default: null,
      index: true,
    },
    // Waiter/owner who took the order on behalf of the table (customer QR orders leave this unset)
    placedBy: {
      type: placedBySchema,
    },
    editedBy: {
      type: new Schema(
        {
          role: { type: String, enum: Object.values(RestaurantRole), required: true },
          actorId: { type: String, required: true },
          name: { type: String, required: true },
          at: { type: Date, required: true },
        },
        { _id: false }
      ),
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
