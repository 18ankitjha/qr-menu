import { Document, Types } from 'mongoose';
import { OrderStatus, RestaurantRole } from '../../../config/constants';
import { IGpsCoordinates } from '../../../interfaces/common.interface';

// ============================================================
// Order Interface
// ============================================================

/** Set when a waiter/owner places the order for a table; absent for customer (QR) orders. */
export interface IOrderPlacedBy {
  role: RestaurantRole;
  actorId: string;
  name: string;
}

export interface IOrderItem {
  dishId: Types.ObjectId;
  dishName: string;
  quantity: number;
  price: number;
  notes?: string;
  /** Name of the diner who added it to the shared table cart (customer orders only). */
  addedBy?: string;
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
  billId?: Types.ObjectId | null;
  placedBy?: IOrderPlacedBy;
  /** Last owner/waiter edit of the items. */
  editedBy?: IOrderPlacedBy & { at: Date };
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
    addedBy?: string;
  }[];
  specialInstructions?: string;
  customerName?: string;
  gpsCoordinates?: IGpsCoordinates;
  placedBy?: IOrderPlacedBy;
}

export interface IUpdateOrderStatusInput {
  status: OrderStatus;
}

export interface IUpdateOrderItemsInput {
  items: IPlaceOrderInput['items'];
  specialInstructions?: string;
  editedBy: IOrderPlacedBy;
}

export interface IOrderFilters {
  tableId?: string;
  status?: OrderStatus;
}

export interface ITableOrders {
  orders: IOrder[];
  unbilledCount: number;
  unbilledAmount: number;
}

export interface IOrderSummary {
  totalOrders: number;
  deliveredOrders: number;
  deliveredRevenue: number;
  lastOrderAt: Date | null;
}
