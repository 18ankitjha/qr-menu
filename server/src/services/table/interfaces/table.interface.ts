import { Document, Types } from 'mongoose';

// ============================================================
// Table Interface
// ============================================================

export interface ITable {
  _id: Types.ObjectId;
  restaurantId: Types.ObjectId;
  tableNumber: number;
  label?: string;
  qrCodeUrl?: string;
  /** Secret in the QR link /menu/t/<qrToken>; missing on tables created before QR tokens. */
  qrToken?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITableDocument extends Omit<ITable, '_id'>, Document {}

export interface IAddTableInput {
  restaurantId: string;
  tableNumber: number;
  label?: string;
}

export interface IBulkAddTablesInput {
  restaurantId: string;
  count: number;
  startNumber?: number;
}
