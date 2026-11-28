import { Document, Types } from 'mongoose';

// ============================================================
// Category Interface
// ============================================================

export interface ICategory {
  _id: Types.ObjectId;
  menuId: Types.ObjectId;
  parentId: Types.ObjectId | null;
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
  parentId?: string | null;
  name: string;
  description?: string;
  imageUrl?: string;
}

export interface IUpdateCategoryInput {
  /** Move under another category (null = top level). */
  parentId?: string | null;
  name?: string;
  description?: string;
  imageUrl?: string;
}
