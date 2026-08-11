import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { customerService } from '../services/customer.service';
import { sendSuccess } from '../utils/response';

export async function listCustomers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await customerService.list(req.query as never);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getCustomer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const customer = await customerService.getById(String(req.params.id));
    sendSuccess(res, customer);
  } catch (error) {
    next(error);
  }
}

export async function createCustomer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const customer = await customerService.create(req.body, req.user!.id);
    sendSuccess(res, customer, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateCustomer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const customer = await customerService.update(String(req.params.id), req.body, req.user!.id);
    sendSuccess(res, customer);
  } catch (error) {
    next(error);
  }
}

export async function addNote(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const note = await customerService.addNote(String(req.params.id), req.body.content, req.user!.id);
    sendSuccess(res, note, 201);
  } catch (error) {
    next(error);
  }
}

export async function addFollowup(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const followup = await customerService.addFollowup(
      String(req.params.id),
      req.body.scheduledAt,
      req.body.notes,
      req.user!.id
    );
    sendSuccess(res, followup, 201);
  } catch (error) {
    next(error);
  }
}

export async function getTimeline(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const timeline = await customerService.getTimeline(String(req.params.id));
    sendSuccess(res, timeline);
  } catch (error) {
    next(error);
  }
}

export async function exportCustomers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const csv = await customerService.exportCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
}
