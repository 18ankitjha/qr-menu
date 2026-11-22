import { IOrder } from '../../order';
import { ITableSession } from '../interfaces/table-session.interface';

// ============================================================
// Session views — what diners and staff get back (no other diners' ids / emails).
// ============================================================

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** A diner's view of their table: who is here, the live shared cart, and the table's orders. */
export const toDinerView = (session: ITableSession, orders: IOrder[], customerId: string) => ({
  _id: session._id.toString(),
  status: session.status,
  restaurantId: session.restaurantId.toString(),
  tableId: session.tableId.toString(),
  tableNumber: session.tableNumber,
  members: session.members.map((m) => ({
    name: m.name,
    profilePicture: m.profilePicture,
    isMe: m.customerId.toString() === customerId,
  })),
  cart: session.cart.map((l) => ({
    _id: l._id.toString(),
    dishId: l.dishId.toString(),
    dishName: l.dishName,
    price: l.price,
    quantity: l.quantity,
    notes: l.notes,
    addedBy: { name: l.addedBy.name, isMe: l.addedBy.customerId.toString() === customerId },
  })),
  cartVersion: session.cartVersion,
  cartTotal: round2(session.cart.reduce((sum, l) => sum + l.price * l.quantity, 0)),
  billRequestedAt: session.billRequested?.at ?? null,
  waiterCalledAt: session.waiterCalled?.at ?? null,
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

/** Staff view of an open table (alerts + who is there + whether it can be cleared without a bill). */
export const toStaffView = (session: ITableSession, unbilledOrders = 0) => ({
  _id: session._id.toString(),
  tableId: session.tableId.toString(),
  tableNumber: session.tableNumber,
  members: session.members.map((m) => m.name),
  cartLines: session.cart.length,
  cartTotal: round2(session.cart.reduce((sum, l) => sum + l.price * l.quantity, 0)),
  unbilledOrders,
  billRequested: session.billRequested ?? null,
  waiterCalled: session.waiterCalled ?? null,
  openedAt: session.createdAt,
  lastActivityAt: session.lastActivityAt,
});
