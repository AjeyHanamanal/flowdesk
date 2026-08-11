import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';
import logger from '../utils/logger';
import { config } from '../config';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return sendError(res, err);
  }

  logger.error('Unhandled error', { error: err.message, stack: err.stack });

  const appError = new AppError(
    config.isProduction ? 'Internal server error' : err.message,
    500,
    'INTERNAL_ERROR'
  );
  return sendError(res, appError);
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(AppError.notFound('Route not found'));
}
