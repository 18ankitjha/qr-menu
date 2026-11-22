import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';
import { AuthKind, RestaurantRole } from '../../../config/constants';
import { AUTH_COOKIE, CUSTOMER_COOKIE } from '../constants/auth.constants';
import { ICustomerTokenPayload, ITokenPayload } from '../interfaces/auth.interface';

// ============================================================
// Token helpers — sign, read and verify our JWTs
//   owner / super admin / staff → cookie `token`
//   customer (diner)            → cookie `qr_customer_token`
// ============================================================

const sign = (payload: ITokenPayload, expiresIn: string = env.JWT_EXPIRES_IN): string =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn } as jwt.SignOptions);

export const signUserToken = (userId: string, email: string): string =>
  sign({ kind: AuthKind.USER, userId, email });

export const signStaffToken = (staffId: string, restaurantId: string, role: RestaurantRole): string =>
  sign({ kind: AuthKind.STAFF, staffId, restaurantId, role });

export const signCustomerToken = (customerId: string, email: string, name: string): string =>
  sign({ kind: AuthKind.CUSTOMER, customerId, email, name }, CUSTOMER_COOKIE.TOKEN_EXPIRES_IN);

const bearerToken = (req: Request): string | undefined => {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.split(' ')[1] : undefined;
};

/** Owner/staff token: `Authorization: Bearer` header, falling back to the httpOnly cookie. */
export const extractToken = (req: Request): string | undefined =>
  bearerToken(req) ?? req.cookies?.[AUTH_COOKIE.NAME];

/** Customer token: `Authorization: Bearer` header, falling back to the customer cookie. */
export const extractCustomerToken = (req: Request): string | undefined =>
  bearerToken(req) ?? req.cookies?.[CUSTOMER_COOKIE.NAME];

/** Returns the payload, or null when the token is missing, expired or tampered with. */
export const verifyToken = (token?: string): ITokenPayload | null => {
  if (!token) return null;
  try {
    return jwt.verify(token, env.JWT_SECRET) as ITokenPayload;
  } catch {
    return null;
  }
};

export const isStaffPayload = (
  payload: ITokenPayload
): payload is Extract<ITokenPayload, { kind: AuthKind.STAFF }> => payload.kind === AuthKind.STAFF;

export const isCustomerPayload = (payload: ITokenPayload): payload is ICustomerTokenPayload =>
  payload.kind === AuthKind.CUSTOMER;

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge,
});

export const setAuthCookie = (res: Response, token: string): void => {
  res.cookie(AUTH_COOKIE.NAME, token, cookieOptions(AUTH_COOKIE.MAX_AGE_MS));
};

export const clearAuthCookie = (res: Response): void => {
  res.clearCookie(AUTH_COOKIE.NAME);
};

export const setCustomerCookie = (res: Response, token: string): void => {
  res.cookie(CUSTOMER_COOKIE.NAME, token, cookieOptions(CUSTOMER_COOKIE.MAX_AGE_MS));
};

export const clearCustomerCookie = (res: Response): void => {
  res.clearCookie(CUSTOMER_COOKIE.NAME);
};
