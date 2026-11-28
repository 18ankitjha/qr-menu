import { Document, Types } from 'mongoose';
import { IGpsCoordinates } from '../../../interfaces/common.interface';
import { SessionCloseReason, TableAlertType, TableSessionStatus } from '../constants/table-session.constants';

// ============================================================
// Table Session Interfaces
// ============================================================

export interface ISessionMember {
  customerId: Types.ObjectId;
  name: string;
  profilePicture?: string;
  joinedAt: Date;
}

/** One line of the shared cart. Same dish added by two people = two lines (so each is credited). */
export interface ICartLine {
  _id: Types.ObjectId;
  dishId: Types.ObjectId;
  dishName: string;
  price: number;
  quantity: number;
  notes?: string;
  addedBy: { customerId: Types.ObjectId; name: string };
  addedAt: Date;
}

export interface ISessionAlert {
  at: Date;
  by: string;
}

export interface ITableSession {
  _id: Types.ObjectId;
  restaurantId: Types.ObjectId;
  tableId: Types.ObjectId;
  tableNumber: number;
  status: TableSessionStatus;
  members: ISessionMember[];
  cart: ICartLine[];
  /** Bumped on every cart change; placing an order must quote the version the diner looked at. */
  cartVersion: number;
  billRequested?: ISessionAlert | null;
  waiterCalled?: ISessionAlert | null;
  lastBillRequestAt?: Date | null;
  lastWaiterCallAt?: Date | null;
  billId?: Types.ObjectId | null;
  closedAt?: Date | null;
  closedReason?: SessionCloseReason | null;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITableSessionDocument extends Omit<ITableSession, '_id'>, Document {}

/** How a diner points at a table: the QR token, or (QR codes printed before tokens) restaurant + table ids. */
export type ITableRef = { qrToken: string } | { restaurantId: string; tableId: string };

export interface IJoinSessionInput {
  table: ITableRef;
  gpsCoordinates?: IGpsCoordinates;
}

export interface IAddToCartInput {
  dishId: string;
  quantity: number;
  notes?: string;
}

/** The quantity a diner wants of a dish on their own plain (no notes) cart line. 0 removes it. */
export interface IMyCartItem {
  dishId: string;
  quantity: number;
}

export interface IDiner {
  customerId: string;
  name: string;
  profilePicture?: string;
}

export { TableAlertType };
