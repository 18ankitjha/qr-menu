import mongoose, { Schema } from 'mongoose';
import { ICustomerDocument } from '../interfaces/customer.interface';

// ============================================================
// Customer Model — diners (Google sign-in on the customer menu)
// ============================================================

const customerSchema = new Schema<ICustomerDocument>(
  {
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    profilePicture: { type: String },
    lastLoginAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const CustomerModel = mongoose.model<ICustomerDocument>('Customer', customerSchema);
