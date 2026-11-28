import type { IOrderItem } from '../types';

/**
 * One ticket line per dish + note: 1 × Aloo patty + 1 × Aloo patty (two diners) → 2 × Aloo patty.
 * New orders arrive combined from the server; this covers older ones.
 */
export const combineItems = (items: IOrderItem[]): IOrderItem[] => {
  const lines = new Map<string, IOrderItem>();
  for (const item of items) {
    const key = `${item.dishId}|${item.notes ?? ''}`;
    const line = lines.get(key);
    if (line) line.quantity += item.quantity;
    else lines.set(key, { ...item });
  }
  return [...lines.values()];
};
