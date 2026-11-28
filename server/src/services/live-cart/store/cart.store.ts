import { ILiveCart } from '../interfaces/live-cart.interface';

// ============================================================
// Cart store — where live carts are kept between edits.
// Today: this API process's memory (one server). To run several API servers, add a Redis store with the same
// interface AND a per-session distributed lock (live-cart.dm serializes edits with an in-process lock).
// ============================================================

export interface ICartStore {
  get(sessionId: string): Promise<ILiveCart | undefined>;
  /** Save after a change (in memory the object is already updated; Redis would write it here). */
  set(cart: ILiveCart): Promise<void>;
  delete(sessionId: string): Promise<void>;
  all(): Promise<ILiveCart[]>;
}

const carts = new Map<string, ILiveCart>();

export const memoryCartStore: ICartStore = {
  get: async (sessionId) => carts.get(sessionId),
  set: async (cart) => {
    carts.set(cart.sessionId, cart);
  },
  delete: async (sessionId) => {
    carts.delete(sessionId);
  },
  all: async () => [...carts.values()],
};
