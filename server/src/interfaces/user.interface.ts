import { Document, Types } from 'mongoose';

// ============================================================
// User Interface
// ============================================================

export interface IUser {
  _id: Types.ObjectId;
  googleId: string;
  email: string;
  name: string;
  profilePicture?: string;
  restaurantId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends Omit<IUser, '_id'>, Document {}

export interface ICreateUserInput {
  googleId: string;
  email: string;
  name: string;
  profilePicture?: string;
}

export interface IGoogleUserPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

export interface IJwtPayload {
  userId: string;
  email: string;
}
