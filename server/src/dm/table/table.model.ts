import mongoose, { Schema } from 'mongoose';
import { ITableDocument } from '../../interfaces/table.interface';

// ============================================================
// Table Model
// ============================================================

const tableSchema = new Schema<ITableDocument>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    tableNumber: {
      type: Number,
      required: true,
    },
    label: {
      type: String,
      trim: true,
    },
    qrCodeUrl: {
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

// Unique table number per restaurant
tableSchema.index({ restaurantId: 1, tableNumber: 1 }, { unique: true });

export const TableModel = mongoose.model<ITableDocument>('Table', tableSchema);
