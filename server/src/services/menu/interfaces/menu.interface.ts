import { Document, Types } from 'mongoose';
import { IMenuTheme } from '../../../interfaces/common.interface';

// ============================================================
// Menu Interface — Single menu per restaurant
// ============================================================

export interface IMenu {
  _id: Types.ObjectId;
  restaurantId: Types.ObjectId;
  name: string;
  isActive: boolean;
  theme: IMenuTheme;
  themeSavedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMenuDocument extends Omit<IMenu, '_id'>, Document {}

export interface ICreateMenuInput {
  restaurantId: string;
  name: string;
}

export interface IUpdateMenuInput {
  name?: string;
  isActive?: boolean;
}

export interface ISetMenuThemeInput {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  backgroundImageUrl?: string;
  fontFamily?: string;
  layout?: 'grid' | 'list';
}
