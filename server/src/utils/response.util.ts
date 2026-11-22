import { Response } from 'express';
import { IApiResponse } from '../interfaces/common.interface';

// ============================================================
// Standardized API Response Wrapper
// ============================================================

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string,
  statusCode: number = 200
): Response => {
  const response: IApiResponse<T> = {
    success: true,
    message,
    data,
  };
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 500,
  errors?: unknown
): Response => {
  const response: IApiResponse<null> & { errors?: unknown } = {
    success: false,
    message,
    data: null,
  };
  if (errors) {
    response.errors = errors;
  }
  return res.status(statusCode).json(response);
};
