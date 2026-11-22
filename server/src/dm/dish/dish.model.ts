import mongoose, { Schema } from 'mongoose';
import { IDishDocument } from '../../interfaces/dish.interface';

// ============================================================
// Dish Model
// ============================================================

const dishSchema = new Schema<IDishDocument>(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
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
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    imageUrl: {
      type: String,
    },
    isVeg: {
      type: Boolean,
      required: true,
      default: false,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    preparationTime: {
      type: Number, // in minutes
    },
    tags: {
      type: [String],
      default: [],
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
dishSchema.index({ categoryId: 1, displayOrder: 1 });
dishSchema.index({ menuId: 1, isAvailable: 1 });

export const DishModel = mongoose.model<IDishDocument>('Dish', dishSchema);
