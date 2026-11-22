import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ERROR_MESSAGES } from '../config/constants';
import { sendError } from '../utils/response.util';
import { IJwtPayload } from '../interfaces/user.interface';

// ============================================================
// Auth Middleware — JWT Verification
// ============================================================

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: IJwtPayload;
    }
  }
}

/**
 * Verifies JWT from Authorization header or cookie.
 * Attaches decoded user info to req.user.
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Check Authorization header first, then cookie
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
      return;
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as IJwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
  }
};
