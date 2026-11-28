import { ROOMS, RESTAURANT_EVENTS } from '../constants/realtime.constants';
import { IOrderSignal } from '../interfaces/realtime.interface';
import { publish } from './publish';
import { tableChanged } from './table.publisher';

// ============================================================
// Order publisher — staff screens + kitchen board + the diners at that table.
// ============================================================

interface IOrderLike {
  _id: { toString(): string };
  restaurantId: { toString(): string };
  tableId: { toString(): string };
  tableNumber: number;
  status: string;
}

const signalOf = (order: IOrderLike): IOrderSignal => ({
  orderId: order._id.toString(),
  tableId: order.tableId.toString(),
  tableNumber: order.tableNumber,
  status: order.status,
});

const toStaffAndKitchen = (order: IOrderLike, event: string, by?: string) => {
  const restaurantId = order.restaurantId.toString();
  publish([ROOMS.restaurant(restaurantId), ROOMS.kitchen(restaurantId)], event, signalOf(order));
  tableChanged(restaurantId, order.tableId.toString(), by);
};

/** A new order (diners' cart or a waiter). `by` = member key of the diner who sent it, if a diner did. */
export const orderPlaced = (order: IOrderLike, by?: string): void =>
  toStaffAndKitchen(order, RESTAURANT_EVENTS.NEW_ORDER, by);

/** An order's status or items changed. */
export const orderChanged = (order: IOrderLike): void =>
  toStaffAndKitchen(order, RESTAURANT_EVENTS.ORDER_STATUS_UPDATED);
