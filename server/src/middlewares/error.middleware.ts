import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response.util';
import { ERROR_MESSAGES } from '../config/constants';

// ============================================================
// Global Error Handler Middleware
// ============================================================

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorMiddleware = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : ERROR_MESSAGES.INTERNAL_ERROR;

  logger.error(`[${statusCode}] ${err.message}`, err.stack);

  sendError(res, message, statusCode);
};

/**
 * Creates a standardized operational error.
 */
export const createAppError = (message: string, statusCode: number): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

/**
 * Wraps async route handlers to catch errors automatically.
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
