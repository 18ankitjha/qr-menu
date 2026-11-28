import { ORDER_STATUS } from '../constants';
import type { IOrder, IOrderItem } from '../types';

/** Same rule as the server: staff can edit an order until it is billed, unless it was cancelled / not delivered. */
export const canEditOrder = (order: IOrder): boolean =>
  !order.billId && order.status !== ORDER_STATUS.CANCELLED && order.status !== ORDER_STATUS.CANNOT_DELIVER;

/**
 * Staff see one line per dish (+ note + price), not one per diner: 1 × Aloo patty (Asha) + 1 × Aloo patty (Bala)
 * → 2 × Aloo patty. New orders are already combined by the server; this covers older ones.
 * `addedBy` keeps the names joined (sent back unchanged when an order is edited; never shown to staff).
 */
export const combineItems = (items: IOrderItem[]): IOrderItem[] => {
  const lines = new Map<string, IOrderItem>();
  for (const item of items) {
    const key = `${item.dishId}|${item.notes ?? ''}|${item.price}`;
    const line = lines.get(key);
    if (!line) {
      lines.set(key, { ...item });
      continue;
    }
    line.quantity += item.quantity;
    const names = new Set([line.addedBy, item.addedBy].flatMap((n) => n?.split(', ') ?? []).filter(Boolean));
    line.addedBy = names.size ? [...names].join(', ') : undefined;
  }
  return [...lines.values()];
};
