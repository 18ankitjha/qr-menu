import mongoose, { Schema } from 'mongoose';
import { IBillDocument } from '../interfaces/bill.interface';
import { BillStatus, PaymentMode } from '../constants/billing.constants';

// ============================================================
// Bill Model
// ============================================================

const billItemSchema = new Schema(
  {
    dishId: { type: Schema.Types.ObjectId, ref: 'Dish', required: true },
    dishName: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const billSchema = new Schema<IBillDocument>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'Table', required: true, index: true },
    tableNumber: { type: Number, required: true },
    tableLabel: { type: String },
    billNumber: { type: String, required: true },
    orderIds: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
    items: { type: [billItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    serviceChargePercent: { type: Number, default: 0 },
    serviceChargeAmount: { type: Number, default: 0 },
    gstPercent: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: Object.values(BillStatus),
      default: BillStatus.UNPAID,
    },
    paymentMode: { type: String, enum: Object.values(PaymentMode) },
    paidAt: { type: Date },
    generatedBy: { type: String, required: true },
    paidBy: { type: String },
  },
  { timestamps: true }
);

billSchema.index({ restaurantId: 1, createdAt: -1 });
billSchema.index({ restaurantId: 1, billNumber: 1 }, { unique: true });

export const BillModel = mongoose.model<IBillDocument>('Bill', billSchema);
