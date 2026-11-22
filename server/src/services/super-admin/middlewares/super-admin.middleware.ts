import { Request, Response, NextFunction } from 'express';
import { ERROR_MESSAGES } from '../../../config/constants';
import { sendError } from '../../../utils/response.util';
import { isSuperAdminEmail } from '../../auth/utils/access.util';

// ============================================================
// Super Admin Middleware — must run after authMiddleware
// ============================================================

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
    return;
  }

  if (!isSuperAdminEmail(req.user.email)) {
    sendError(res, ERROR_MESSAGES.SUPER_ADMIN_ONLY, 403);
    return;
  }

  next();
};
