import { IAuthContext } from '../../auth';

// ============================================================
// Realtime — payload shapes. Kept tiny on purpose: they say WHAT changed; screens refetch the details.
// ============================================================

export interface IOrderSignal {
  orderId: string;
  tableId: string;
  tableNumber: number;
  status: string;
}

export interface IBillSignal {
  billId: string;
  tableId: string;
  status: string;
}

export interface ITableSignal {
  tableId: string;
  at: number;
  /** Member key (see live-cart memberKey) of the diner who made the change — their phone skips the refetch.
   * Never a customer id: anyone with the table id can listen to the table room. */
  by?: string;
}

/** One line of the live shared cart. `key` = `<memberKey>.<dishId>`: whose line it is, without revealing ids. */
export interface ICartStateLine {
  key: string;
  dishId: string;
  dishName: string;
  price: number;
  quantity: number;
  notes?: string;
  /** Name of the diner who added it. */
  by: string;
}

/** The whole shared cart of a table session (sent on join and after every change). */
export interface ICartState {
  sessionId: string;
  /** Grows on every change (time-based, so it never goes back after a server restart). */
  version: number;
  lines: ICartStateLine[];
  total: number;
  /** Member key of the diner whose edit produced this state. */
  changedBy?: string;
}

/** Answer to a cart edit. `skipped` = dish ids that could not be added (no longer on the menu / unavailable). */
export type ICartSetAck = { ok: true; version: number; skipped: string[] } | { ok: false; error: string };

export interface IRestaurantSignal {
  restaurantId: string;
  status: string;
}

export interface ITableAlertSignal {
  type: string;
  /** Who should hear it ring: waiters, or the owner when the restaurant has no active waiters. */
  notify: string;
  sessionId: string;
  tableId: string;
  tableNumber: number;
  by: string;
  at: Date;
}

/** Answer to a join request, so the browser knows whether it is really receiving pushes. */
export interface IJoinAck {
  ok: boolean;
  error?: string;
}

/** What we know about the browser on the other end of a socket (read once, from the login cookies). */
export interface ISocketData {
  auth: IAuthContext | null;
  /** The signed-in diner (Google), if the menu app's cookie was sent. */
  customer: { customerId: string; name: string } | null;
}
