import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { AppError } from '../utils/errors';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.reduce(
          (acc, e) => {
            acc[e.path.join('.')] = e.message;
            return acc;
          },
          {} as Record<string, string>
        );
        next(AppError.unprocessable('Validation failed', details));
      } else {
        next(error);
      }
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as typeof req.query;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.reduce(
          (acc, e) => {
            acc[e.path.join('.')] = e.message;
            return acc;
          },
          {} as Record<string, string>
        );
        next(AppError.unprocessable('Validation failed', details));
      } else {
        next(error);
      }
    }
  };
}
