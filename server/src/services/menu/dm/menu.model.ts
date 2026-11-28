import mongoose, { Schema } from 'mongoose';
import { IMenuDocument } from '../interfaces/menu.interface';
import { DEFAULT_MENU_THEME, MenuLayout } from '../../../config/constants';

// ============================================================
// Menu Model — Single menu per restaurant
// ============================================================

const themeSchema = new Schema(
  {
    primaryColor: { type: String, default: DEFAULT_MENU_THEME.primaryColor },
    secondaryColor: { type: String, default: DEFAULT_MENU_THEME.secondaryColor },
    backgroundColor: { type: String, default: DEFAULT_MENU_THEME.backgroundColor },
    backgroundImageUrl: { type: String },
    fontFamily: { type: String, default: DEFAULT_MENU_THEME.fontFamily },
    layout: {
      type: String,
      enum: Object.values(MenuLayout),
      default: DEFAULT_MENU_THEME.layout,
    },
  },
  { _id: false }
);

const menuSchema = new Schema<IMenuDocument>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      unique: true, // One menu per restaurant
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    theme: {
      type: themeSchema,
      default: () => ({ ...DEFAULT_MENU_THEME }),
    },
    // Set the first time the owner saves the theme (Quick Setup's last step)
    themeSavedAt: {
      type: Date,
      default: null,
    },
    // false = "view only": diners browse the menu (and can call a waiter) but only staff place orders
    customerOrderingEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const MenuModel = mongoose.model<IMenuDocument>('Menu', menuSchema);
