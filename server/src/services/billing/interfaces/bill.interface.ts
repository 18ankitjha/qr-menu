import { Document, Types } from 'mongoose';
import { BillStatus, PaymentMode } from '../constants/billing.constants';

// ============================================================
// Bill Interfaces — a table bill groups all unbilled orders on a table
// ============================================================

/** One line on the bill: same dish at the same price, summed across orders. */
export interface IBillItem {
  dishId: Types.ObjectId;
  dishName: string;
  price: number;
  quantity: number;
  amount: number;
}

/** The money part of a bill (shared by preview and the saved bill). */
export interface IBillTotals {
  items: IBillItem[];
  subtotal: number;
  serviceChargePercent: number;
  serviceChargeAmount: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
}

export interface IBill extends IBillTotals {
  _id: Types.ObjectId;
  restaurantId: Types.ObjectId;
  tableId: Types.ObjectId;
  tableNumber: number;
  tableLabel?: string;
  /** Per-restaurant running number, e.g. B-000042. */
  billNumber: string;
  orderIds: Types.ObjectId[];
  status: BillStatus;
  paymentMode?: PaymentMode;
  paidAt?: Date;
  generatedBy: string;
  paidBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBillDocument extends Omit<IBill, '_id'>, Document {}

export interface IBillPreview extends IBillTotals {
  tableId: string;
  tableNumber: number;
  tableLabel?: string;
  orderCount: number;
  /** Orders on the bill that the kitchen hasn't delivered yet. */
  pendingOrders: number;
}

export interface IBillFilters {
  status?: BillStatus;
  tableId?: string;
}
