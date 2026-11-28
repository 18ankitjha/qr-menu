import { ROOMS, RESTAURANT_EVENTS } from '../constants/realtime.constants';
import { IBillSignal } from '../interfaces/realtime.interface';
import { publish } from './publish';
import { tableChanged } from './table.publisher';

// ============================================================
// Bill publisher — staff Orders / Bills screens + the diners at that table.
// ============================================================

interface IBillLike {
  _id: { toString(): string };
  restaurantId: { toString(): string };
  tableId: { toString(): string };
  status: string;
}

/** A bill was generated or paid. */
export const billChanged = (bill: IBillLike): void => {
  const restaurantId = bill.restaurantId.toString();
  const signal: IBillSignal = { billId: bill._id.toString(), tableId: bill.tableId.toString(), status: bill.status };
  publish(ROOMS.restaurant(restaurantId), RESTAURANT_EVENTS.BILL_UPDATED, signal);
  tableChanged(restaurantId, signal.tableId);
};
