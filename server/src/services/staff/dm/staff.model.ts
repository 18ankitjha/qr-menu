import mongoose, { Schema } from 'mongoose';
import { RestaurantRole } from '../../../config/constants';
import { IStaffDocument } from '../interfaces/staff.interface';

// ============================================================
// Staff Model — restaurant employees who log in with a PIN (waiters)
// ============================================================

const staffSchema = new Schema<IStaffDocument>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, trim: true, lowercase: true },
    pinHash: { type: String, required: true },
    pinEncrypted: { type: String },
    role: { type: String, enum: [RestaurantRole.WAITER], default: RestaurantRole.WAITER },
    isActive: { type: Boolean, default: true },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

staffSchema.index({ restaurantId: 1, username: 1 }, { unique: true });

export const StaffModel = mongoose.model<IStaffDocument>('Staff', staffSchema);
