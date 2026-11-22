import { Document, Types } from 'mongoose';

// ============================================================
// Category Interface
// ============================================================

export interface ICategory {
  _id: Types.ObjectId;
  menuId: Types.ObjectId;
  name: string;
  description?: string;
  displayOrder: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICategoryDocument extends Omit<ICategory, '_id'>, Document {}

export interface IAddCategoryInput {
  menuId: string;
  name: string;
  description?: string;
  imageUrl?: string;
}

export interface IUpdateCategoryInput {
  name?: string;
  description?: string;
  imageUrl?: string;
}
