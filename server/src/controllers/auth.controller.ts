import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { authService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';

export async function login(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const profile = await authService.getProfile(req.user!.id);
    sendSuccess(res, profile);
  } catch (error) {
    next(error);
  }
}

export async function getPermissions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { ROLE_PERMISSIONS } = await import('../services/auth.service');
    sendSuccess(res, { permissions: ROLE_PERMISSIONS[req.user!.role] });
  } catch (error) {
    next(error);
  }
}
