// ============================================================
// Auth Service — public surface (used by other services)
// Owns users (owners / super admins), customers (diners) and login. Middlewares are imported directly by route files:
//   ./middlewares/auth.middleware              requireAuth, requireUser, requireCustomer
//   ./middlewares/restaurant-access.middleware requireRestaurantAccess
// ============================================================

export * as UserDM from './dm/user.dm';
export * as CustomerDM from './dm/customer.dm';
export { isSuperAdminEmail } from './utils/access.util';
export type { IUser, IJwtPayload } from './interfaces/user.interface';
export type { IAuthContext, IStaffProfile, ICustomerContext } from './interfaces/auth.interface';
export type { ICustomer, ICustomerProfile } from './interfaces/customer.interface';
