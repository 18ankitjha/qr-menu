import { IOrder } from '../../order';
import { ICartState } from '../../realtime';
import { ITableSession } from '../interfaces/table-session.interface';
import { TableAlertType } from '../constants/table-session.constants';
import { alertCooldownLeftMs } from '../dm/table-session.dm';
import { memberKey } from '../../live-cart/utils/member-key.util';

// ============================================================
// Session views — what diners and staff get back (no other diners' ids / emails).
// ============================================================

/**
 * A diner's view of their table: who is here, the live shared cart, and the table's orders.
 * `me` = this diner's member key: cart lines whose key starts with `<me>.` are theirs.
 */
export const toDinerView = (
  session: ITableSession,
  orders: IOrder[],
  customerId: string,
  cart: ICartState | null
) => ({
  _id: session._id.toString(),
  status: session.status,
  restaurantId: session.restaurantId.toString(),
  tableId: session.tableId.toString(),
  tableNumber: session.tableNumber,
  me: memberKey(session._id.toString(), customerId),
  members: session.members.map((m) => ({
    name: m.name,
    profilePicture: m.profilePicture,
    isMe: m.customerId.toString() === customerId,
  })),
  cart: cart?.lines ?? [],
  cartVersion: cart?.version ?? session.cartVersion,
  cartTotal: cart?.total ?? 0,
  billRequestedAt: session.billRequested?.at ?? null,
  waiterCalledAt: session.waiterCalled?.at ?? null,
  /** Time left before the table may ask again (the phone counts down from when it got this). */
  billRequestCooldownMs: alertCooldownLeftMs(session, TableAlertType.BILL),
  waiterCallCooldownMs: alertCooldownLeftMs(session, TableAlertType.WAITER),
  billId: session.billId?.toString() ?? null,
  closedAt: session.closedAt ?? null,
  closedReason: session.closedReason ?? null,
  orders: orders.map((o) => ({
    _id: o._id.toString(),
    status: o.status,
    items: o.items.map((i) => ({
      dishName: i.dishName,
      quantity: i.quantity,
      price: i.price,
      notes: i.notes,
      addedBy: i.addedBy,
    })),
    totalAmount: o.totalAmount,
    customerName: o.customerName,
    placedByStaff: o.placedBy?.name ?? null,
    specialInstructions: o.specialInstructions,
    billed: Boolean(o.billId),
    createdAt: o.createdAt,
  })),
});

/** Staff view of an open table (alerts + who is there + whether it can be cleared without a bill).
 * No cart: staff see food once it is ordered. */
export const toStaffView = (session: ITableSession, unbilledOrders = 0) => ({
  _id: session._id.toString(),
  tableId: session.tableId.toString(),
  tableNumber: session.tableNumber,
  members: session.members.map((m) => m.name),
  unbilledOrders,
  billRequested: session.billRequested ?? null,
  waiterCalled: session.waiterCalled ?? null,
  openedAt: session.createdAt,
  lastActivityAt: session.lastActivityAt,
});
