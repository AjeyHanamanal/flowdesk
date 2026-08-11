import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { dashboardService } from '../services/dashboard.service';
import { activityService } from '../services/activity.service';
import { sendSuccess } from '../utils/response';

export async function getOperationsPulse(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const pulse = await dashboardService.getOperationsPulse(req.user!.role);
    sendSuccess(res, pulse);
  } catch (error) {
    next(error);
  }
}

export async function getStockRisk(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const risk = await dashboardService.getStockRisk();
    sendSuccess(res, risk);
  } catch (error) {
    next(error);
  }
}

export async function getFollowups(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const followups = await dashboardService.getFollowups();
    sendSuccess(res, followups);
  } catch (error) {
    next(error);
  }
}

export async function getChallanPipeline(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const pipeline = await dashboardService.getChallanPipeline();
    sendSuccess(res, pipeline);
  } catch (error) {
    next(error);
  }
}

export async function getOverview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const overview = await dashboardService.getOverview(req.user!.role);
    sendSuccess(res, overview);
  } catch (error) {
    next(error);
  }
}

export async function globalSearch(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { q, limit } = req.query as { q: string; limit?: string };
    const results = await dashboardService.globalSearch(q, limit ? parseInt(limit) : 10);
    sendSuccess(res, results);
  } catch (error) {
    next(error);
  }
}

export async function listActivity(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await activityService.list(page, limit);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}
