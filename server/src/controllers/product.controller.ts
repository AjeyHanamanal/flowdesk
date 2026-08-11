import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { productService, inventoryService } from '../services/product.service';
import { sendSuccess } from '../utils/response';

export async function listProducts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await productService.list(req.query as never);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const product = await productService.getById(String(req.params.id));
    sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const product = await productService.create(req.body, req.user!.id);
    sendSuccess(res, product, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const product = await productService.update(String(req.params.id), req.body, req.user!.id);
    sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
}

export async function getMovements(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await productService.getMovements(String(req.params.id), page, limit);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function createMovement(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await inventoryService.createMovement(req.body, req.user!.id);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

export async function listAllMovements(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await inventoryService.listMovements(page, limit);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function exportProducts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const csv = await productService.exportCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
}

export async function getCategories(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { default: prisma } = await import('../config/database');
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    sendSuccess(res, categories);
  } catch (error) {
    next(error);
  }
}

export async function getWarehouses(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { default: prisma } = await import('../config/database');
    const warehouses = await prisma.warehouse.findMany({ orderBy: { name: 'asc' } });
    sendSuccess(res, warehouses);
  } catch (error) {
    next(error);
  }
}
