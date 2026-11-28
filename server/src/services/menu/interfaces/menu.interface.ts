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
  /** false = view-only menu: customers can't order from their phones (staff still can). Missing = true. */
  customerOrderingEnabled?: boolean;
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
  customerOrderingEnabled?: boolean;
}

export interface ISetMenuThemeInput {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  backgroundImageUrl?: string;
  fontFamily?: string;
  layout?: 'grid' | 'list';
}
