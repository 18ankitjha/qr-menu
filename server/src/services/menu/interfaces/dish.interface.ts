import { Document, Types } from 'mongoose';
import { SpiceLevel } from '../constants/menu.constants';

// ============================================================
// Dish Interface
// ============================================================

/** Optional details about a menu item, shown to customers. */
export interface IDishDetails {
  spiceLevel?: SpiceLevel;
  servingSize?: string;
  calories?: number;
  ingredients?: string;
  allergens?: string[];
}

export interface IDish extends IDishDetails {
  _id: Types.ObjectId;
  categoryId: Types.ObjectId;
  menuId: Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isVeg: boolean;
  isAvailable: boolean;
  preparationTime?: number;
  tags?: string[];
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDishDocument extends Omit<IDish, '_id'>, Document {}

export interface IAddDishInput extends IDishDetails {
  categoryId: string;
  menuId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isVeg: boolean;
  preparationTime?: number;
  tags?: string[];
}

export interface IUpdateDishInput extends IDishDetails {
  name?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  isVeg?: boolean;
  preparationTime?: number;
  tags?: string[];
}
