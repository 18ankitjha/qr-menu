import { Document, Types } from 'mongoose';

// ============================================================
// Dish Interface
// ============================================================

export interface IDish {
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

export interface IAddDishInput {
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

export interface IUpdateDishInput {
  name?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  isVeg?: boolean;
  preparationTime?: number;
  tags?: string[];
}
