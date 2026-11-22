import mongoose, { Schema } from 'mongoose';
import { ICategoryDocument } from '../../interfaces/category.interface';

// ============================================================
// Category Model
// ============================================================

const categorySchema = new Schema<ICategoryDocument>(
  {
    menuId: {
      type: Schema.Types.ObjectId,
      ref: 'Menu',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    imageUrl: {
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

// Compound index for fetching categories for a menu sorted by order
categorySchema.index({ menuId: 1, displayOrder: 1 });

export const CategoryModel = mongoose.model<ICategoryDocument>('Category', categorySchema);
