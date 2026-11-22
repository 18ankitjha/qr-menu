import { Document, Types } from 'mongoose';

// ============================================================
// Customer Interfaces — diners who sign in with Google on the customer menu.
// Kept apart from `User` (owners / super admins) so a diner account never gains restaurant access.
// ============================================================

export interface ICustomer {
  _id: Types.ObjectId;
  googleId: string;
  email: string;
  name: string;
  profilePicture?: string;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomerDocument extends Omit<ICustomer, '_id'>, Document {}

export interface IGoogleCustomerInput {
  googleId: string;
  email: string;
  name: string;
  profilePicture?: string;
}

/** What the customer menu gets back from `/auth/customer/getProfile`. */
export interface ICustomerProfile {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string;
}
