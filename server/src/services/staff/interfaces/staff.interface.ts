import { Document, Types } from 'mongoose';
import { RestaurantRole } from '../../../config/constants';

// ============================================================
// Staff Interfaces
// ============================================================

export type StaffRole = RestaurantRole.WAITER;

export interface IStaff {
  _id: Types.ObjectId;
  restaurantId: Types.ObjectId;
  name: string;
  /** Unique within a restaurant; used with the restaurant code to log in. */
  username: string;
  /** `salt:hash` (scrypt). Never returned to clients. */
  pinHash: string;
  /** AES-GCM encrypted PIN so the owner can view it. Missing for staff created before this existed. */
  pinEncrypted?: string;
  role: StaffRole;
  isActive: boolean;
  failedLoginAttempts: number;
  lockUntil?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStaffDocument extends Omit<IStaff, '_id'>, Document {}

export type IPublicStaff = Omit<IStaff, 'pinHash' | 'pinEncrypted' | 'failedLoginAttempts' | 'lockUntil'> & {
  /** False for older staff whose PIN isn't known yet (it becomes viewable after their next login or a reset). */
  hasViewablePin: boolean;
};

/** Staff list for the owner — includes the current PIN so it can always be read off the Staff page. */
export type IOwnerStaffView = IPublicStaff & {
  pin: string | null;
};

export interface IAddStaffInput {
  restaurantId: string;
  name: string;
  username: string;
  /** Optional — a random PIN is generated when omitted. */
  pin?: string;
}

/** Returned when a PIN is created or reset, so the owner can hand it to the waiter. */
export interface IStaffWithPin {
  staff: IPublicStaff;
  pin: string;
}
