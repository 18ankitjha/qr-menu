import { ROOMS, RESTAURANT_EVENTS, TABLE_EVENTS } from '../constants/realtime.constants';
import { ITableAlertSignal, ITableSignal } from '../interfaces/realtime.interface';
import { publish } from './publish';

// ============================================================
// Table publisher — diners' shared table (cart, members, alerts, bill state).
// ============================================================

/**
 * Something changed at a table: diners' phones refetch their session, staff refetch open tables.
 * `by` = the diner (customer id) who did it, if any — their phone skips the echo.
 */
export const tableChanged = (restaurantId: string, tableId: string, by?: string): void => {
  const signal: ITableSignal = { tableId, at: Date.now(), by };
  publish(ROOMS.table(tableId), TABLE_EVENTS.TABLE_SESSION_UPDATED, signal);
  publish(ROOMS.restaurant(restaurantId), RESTAURANT_EVENTS.TABLES_UPDATED, signal);
};

/** Diners edited the shared cart: only that table hears it. Staff see food once it is ordered. */
export const cartChanged = (tableId: string, by: string): void => {
  const signal: ITableSignal = { tableId, at: Date.now(), by };
  publish(ROOMS.table(tableId), TABLE_EVENTS.TABLE_SESSION_UPDATED, signal);
};

/** A diner called a waiter / asked for the bill: staff phones ring (see `notify`). */
export const tableAlert = (restaurantId: string, alert: ITableAlertSignal, byCustomerId?: string): void => {
  publish(ROOMS.restaurant(restaurantId), RESTAURANT_EVENTS.TABLE_ALERT, alert);
  tableChanged(restaurantId, alert.tableId, byCustomerId);
};
