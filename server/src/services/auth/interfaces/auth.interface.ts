import { AuthKind, RestaurantRole } from '../../../config/constants';

// ============================================================
// Auth Interfaces — token payloads and the per-request caller
// ============================================================

/** JWT for Google-authenticated users (owners, super admins). `kind` is absent on older tokens. */
export interface IUserTokenPayload {
  kind?: AuthKind.USER;
  userId: string;
  email: string;
}

/** JWT for restaurant staff who log in with restaurant code + username + PIN. */
export interface IStaffTokenPayload {
  kind: AuthKind.STAFF;
  staffId: string;
  restaurantId: string;
  role: RestaurantRole;
}

/** JWT for diners on the customer menu (separate cookie; rejected by `requireAuth`). */
export interface ICustomerTokenPayload {
  kind: AuthKind.CUSTOMER;
  customerId: string;
  email: string;
  name: string;
}

export type ITokenPayload = IUserTokenPayload | IStaffTokenPayload | ICustomerTokenPayload;

/** The signed-in diner, attached to `req.customer` by `requireCustomer`. */
export interface ICustomerContext {
  customerId: string;
  email: string;
  name: string;
}

/** The authenticated caller, attached to `req.auth` by `requireAuth`. */
export interface IAuthContext {
  kind: AuthKind;
  userId?: string;
  email?: string;
  staffId?: string;
  /** Staff: the restaurant they belong to. Set for both kinds once `requireRestaurantAccess` passes. */
  restaurantId?: string;
  /** Set by `requireRestaurantAccess` — the caller's role in the restaurant being accessed. */
  role?: RestaurantRole;
}

export interface IStaffLoginInput {
  restaurantCode: string;
  username: string;
  pin: string;
}

/** Profile returned to the admin app for a logged-in staff member. */
export interface IStaffProfile {
  kind: AuthKind.STAFF;
  _id: string;
  name: string;
  username: string;
  role: RestaurantRole;
  restaurantId: string;
  isSuperAdmin: false;
}
