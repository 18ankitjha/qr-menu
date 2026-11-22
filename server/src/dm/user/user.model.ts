import mongoose, { Schema } from 'mongoose';
import { IUserDocument } from '../../interfaces/user.interface';

// ============================================================
// User Model — Restaurant Owner
// ============================================================

const userSchema = new Schema<IUserDocument>(
  {
    googleId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    profilePicture: {
      type: String,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
    },
  },
  {
    timestamps: true,
  }
);

export const UserModel = mongoose.model<IUserDocument>('User', userSchema);
