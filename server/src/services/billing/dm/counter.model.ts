import mongoose, { Schema } from 'mongoose';

// ============================================================
// Counter Model — atomic per-key sequence (e.g. bill numbers per restaurant)
// ============================================================

interface ICounterDocument extends mongoose.Document {
  key: string;
  seq: number;
}

const counterSchema = new Schema<ICounterDocument>({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export const CounterModel = mongoose.model<ICounterDocument>('Counter', counterSchema);

/** Atomically increments and returns the next number for `key` (starts at 1). */
export const nextSequence = async (key: string): Promise<number> => {
  const counter = await CounterModel.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).lean();
  return counter!.seq;
};
