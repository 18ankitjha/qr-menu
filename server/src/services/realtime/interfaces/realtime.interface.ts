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
}

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

/** What we know about the browser on the other end of a socket (read once, from the login cookie). */
export interface ISocketData {
  auth: IAuthContext | null;
}
