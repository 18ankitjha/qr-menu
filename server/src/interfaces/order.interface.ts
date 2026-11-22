import { Document, Types } from 'mongoose';
import { OrderStatus } from '../config/constants';
import { IGpsCoordinates } from './common.interface';

// ============================================================
// Order Interface
// ============================================================

export interface IOrderItem {
  dishId: Types.ObjectId;
  dishName: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface IOrder {
  _id: Types.ObjectId;
  restaurantId: Types.ObjectId;
  tableId: Types.ObjectId;
  tableNumber: number;
  items: IOrderItem[];
  status: OrderStatus;
  specialInstructions?: string;
  customerName?: string;
  totalAmount: number;
  gpsCoordinates?: IGpsCoordinates;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderDocument extends Omit<IOrder, '_id'>, Document {}

export interface IPlaceOrderInput {
  restaurantId: string;
  tableId: string;
  items: {
    dishId: string;
    quantity: number;
    notes?: string;
  }[];
  specialInstructions?: string;
  customerName?: string;
  gpsCoordinates: IGpsCoordinates;
}

export interface IUpdateOrderStatusInput {
  status: OrderStatus;
}
