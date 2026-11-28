import mongoose, { Schema } from 'mongoose';
import { ITableSessionDocument } from '../interfaces/table-session.interface';
import { SessionCloseReason, TableSessionStatus } from '../constants/table-session.constants';

// ============================================================
// Table Session Model — one OPEN session per table at a time (partial unique index)
// ============================================================

const memberSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    name: { type: String, required: true, trim: true },
    profilePicture: { type: String },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const cartLineSchema = new Schema({
  dishId: { type: Schema.Types.ObjectId, ref: 'Dish', required: true },
  dishName: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  notes: { type: String, trim: true },
  addedBy: {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    name: { type: String, required: true },
  },
  addedAt: { type: Date, default: Date.now },
});

const alertSchema = new Schema(
  {
    at: { type: Date, required: true },
    by: { type: String, required: true },
  },
  { _id: false }
);

const tableSessionSchema = new Schema<ITableSessionDocument>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'Table', required: true },
    tableNumber: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(TableSessionStatus),
      default: TableSessionStatus.OPEN,
    },
    members: { type: [memberSchema], default: [] },
    cart: { type: [cartLineSchema], default: [] },
    cartVersion: { type: Number, default: 0 },
    billRequested: { type: alertSchema, default: null },
    waiterCalled: { type: alertSchema, default: null },
    // Kept after staff dismiss the alert — drives the per-table cooldown
    lastBillRequestAt: { type: Date, default: null },
    lastWaiterCallAt: { type: Date, default: null },
    billId: { type: Schema.Types.ObjectId, ref: 'Bill', default: null },
    closedAt: { type: Date, default: null },
    closedReason: { type: String, enum: [...Object.values(SessionCloseReason), null], default: null },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// At most one open session per table — concurrent "first scans" can't create two
tableSessionSchema.index(
  { tableId: 1 },
  { unique: true, partialFilterExpression: { status: TableSessionStatus.OPEN } }
);
tableSessionSchema.index({ restaurantId: 1, status: 1 });
tableSessionSchema.index({ 'members.customerId': 1, createdAt: -1 });

export const TableSessionModel = mongoose.model<ITableSessionDocument>('TableSession', tableSessionSchema);
