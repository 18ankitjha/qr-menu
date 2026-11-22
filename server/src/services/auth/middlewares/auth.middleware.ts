import { Request, Response, NextFunction } from 'express';
import { AuthKind, ERROR_MESSAGES } from '../../../config/constants';
import { sendError } from '../../../utils/response.util';
import { IJwtPayload } from '../interfaces/user.interface';
import { IAuthContext, ICustomerContext } from '../interfaces/auth.interface';
import { AUTH_MESSAGES } from '../constants/auth.constants';
import {
  extractCustomerToken,
  extractToken,
  isCustomerPayload,
  isStaffPayload,
  verifyToken,
} from '../utils/token.util';

// ============================================================
// Auth Middlewares — who is calling?
//   requireAuth     : any restaurant-side caller (owner/super admin via Google, or staff via PIN)
//   requireUser     : Google-authenticated owners / super admins only (staff tokens are rejected)
//   requireCustomer : diners signed in on the customer menu (their own cookie + token kind)
// Customer tokens are rejected by requireAuth / requireUser, so a diner can never reach admin APIs.
// ============================================================

declare global {
  namespace Express {
    interface Request {
      /** Set for Google-authenticated users only. */
      user?: IJwtPayload;
      /** Set for every authenticated restaurant-side caller. */
      auth?: IAuthContext;
      /** Set for signed-in diners (customer menu). */
      customer?: ICustomerContext;
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const payload = verifyToken(extractToken(req));
  if (!payload) {
    sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
    return;
  }

  if (isCustomerPayload(payload)) {
    sendError(res, AUTH_MESSAGES.CUSTOMER_NOT_ALLOWED, 403);
    return;
  }

  if (isStaffPayload(payload)) {
    req.auth = { kind: AuthKind.STAFF, staffId: payload.staffId, restaurantId: payload.restaurantId };
  } else {
    req.user = { userId: payload.userId, email: payload.email };
    req.auth = { kind: AuthKind.USER, userId: payload.userId, email: payload.email };
  }
  next();
};

export const requireUser = (req: Request, res: Response, next: NextFunction): void => {
  requireAuth(req, res, () => {
    if (!req.user) {
      sendError(res, ERROR_MESSAGES.FORBIDDEN, 403);
      return;
    }
    next();
  });
};

/** Kept for existing routes: same as `requireUser`. */
export const authMiddleware = requireUser;

export const requireCustomer = (req: Request, res: Response, next: NextFunction): void => {
  const payload = verifyToken(extractCustomerToken(req));
  if (!payload || !isCustomerPayload(payload)) {
    sendError(res, AUTH_MESSAGES.CUSTOMER_LOGIN_REQUIRED, 401);
    return;
  }
  req.customer = { customerId: payload.customerId, email: payload.email, name: payload.name };
  next();
};
