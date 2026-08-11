import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { config } from '../config';
import { AppError } from '../utils/errors';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Authentication required'));
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    next(AppError.unauthorized('Invalid or expired token'));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
}

export function requireRoleAny(roles: Role[]) {
  return requireRole(...roles);
}
