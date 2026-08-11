import { Response } from 'express';
import { AppError } from './errors';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  meta?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>
) {
  const response: ApiResponse<T> = { success: true, data };
  if (meta) response.meta = meta;
  return res.status(statusCode).json(response);
}

export function sendError(res: Response, error: AppError) {
  const response: ApiResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  };
  return res.status(error.statusCode).json(response);
}
