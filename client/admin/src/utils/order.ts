import { ORDER_STATUS } from '../constants';
import type { IOrder } from '../types';

/** Same rule as the server: staff can edit an order until it is billed, unless it was cancelled / not delivered. */
export const canEditOrder = (order: IOrder): boolean =>
  !order.billId && order.status !== ORDER_STATUS.CANCELLED && order.status !== ORDER_STATUS.CANNOT_DELIVER;
