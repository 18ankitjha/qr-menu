import mongoose, { Schema } from 'mongoose';
import { IDishDocument } from '../interfaces/dish.interface';
import { SpiceLevel } from '../constants/menu.constants';

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
    // ---- Item details shown to customers ----
    spiceLevel: {
      type: String,
      enum: Object.values(SpiceLevel),
    },
    servingSize: {
      type: String, // e.g. '2 pcs', '250 g', 'Serves 2'
      trim: true,
    },
    calories: {
      type: Number,
      min: 0,
    },
    ingredients: {
      type: String,
      trim: true,
    },
    allergens: {
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
