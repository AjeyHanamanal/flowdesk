import { Prisma, MovementReason, MovementType } from '@prisma/client';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { activityService } from './activity.service';

interface ProductFilters {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  stockStatus?: 'low' | 'healthy' | 'out';
  warehouseId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class ProductService {
  private buildWhere(filters: ProductFilters): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.warehouseId) where.warehouseId = filters.warehouseId;

    if (filters.stockStatus === 'low') {
      where.AND = [{ currentStock: { gt: 0 } }];
      // Prisma doesn't support column comparison directly, filter in app or raw query
    } else if (filters.stockStatus === 'out') {
      where.currentStock = 0;
    }

    return where;
  }

  async list(filters: ProductFilters) {
    const where = this.buildWhere(filters);
    let items = await prisma.product.findMany({
      where,
      include: {
        category: true,
        warehouse: true,
      },
      orderBy: { [filters.sortBy || 'createdAt']: filters.sortOrder || 'desc' },
    });

    if (filters.stockStatus === 'low') {
      items = items.filter((p) => p.currentStock > 0 && p.currentStock <= p.minimumStock);
    } else if (filters.stockStatus === 'healthy') {
      items = items.filter((p) => p.currentStock > p.minimumStock);
    }

    const total = items.length;
    const skip = (filters.page - 1) * filters.limit;
    const paginated = items.slice(skip, skip + filters.limit);

    return {
      items: paginated.map((p) => ({
        ...p,
        unitPrice: Number(p.unitPrice),
        stockStatus: this.getStockStatus(p.currentStock, p.minimumStock),
        riskPercent: this.calculateRiskPercent(p.currentStock, p.minimumStock),
      })),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  getStockStatus(current: number, minimum: number): 'out' | 'low' | 'healthy' {
    if (current === 0) return 'out';
    if (current <= minimum) return 'low';
    return 'healthy';
  }

  calculateRiskPercent(current: number, minimum: number): number {
    if (minimum === 0) return current === 0 ? 100 : 0;
    if (current >= minimum) return 0;
    return Math.round(((minimum - current) / minimum) * 100);
  }

  async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        warehouse: true,
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { createdBy: { select: { name: true } } },
        },
        challanItems: {
          orderBy: { challan: { createdAt: 'desc' } },
          take: 10,
          include: {
            challan: {
              select: {
                id: true,
                challanNumber: true,
                status: true,
                createdAt: true,
                customer: { select: { businessName: true } },
              },
            },
          },
        },
      },
    });
    if (!product) throw AppError.notFound('Product not found');

    const movements = await prisma.stockMovement.findMany({
      where: { productId: id },
      orderBy: { createdAt: 'desc' },
    });

    let velocity = 0;
    if (movements.length >= 2) {
      const outMovements = movements.filter((m) => m.movementType === 'OUT');
      const totalOut = outMovements.reduce((sum, m) => sum + m.quantity, 0);
      const daysSpan = movements.length > 0
        ? Math.max(1, (Date.now() - movements[movements.length - 1].createdAt.getTime()) / 86400000)
        : 1;
      velocity = Math.round((totalOut / daysSpan) * 10) / 10;
    }

    return {
      ...product,
      unitPrice: Number(product.unitPrice),
      stockStatus: this.getStockStatus(product.currentStock, product.minimumStock),
      riskPercent: this.calculateRiskPercent(product.currentStock, product.minimumStock),
      movementVelocity: velocity,
      lastMovement: movements[0] || null,
    };
  }

  async create(
    data: {
      name: string;
      sku: string;
      categoryId?: string | null;
      unitPrice: number;
      currentStock?: number;
      minimumStock?: number;
      warehouseId?: string | null;
    },
    userId: string
  ) {
    const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (existing) throw AppError.conflict('SKU already exists', 'DUPLICATE_SKU');

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: data.name,
          sku: data.sku,
          categoryId: data.categoryId || null,
          unitPrice: data.unitPrice,
          currentStock: data.currentStock || 0,
          minimumStock: data.minimumStock || 0,
          warehouseId: data.warehouseId || null,
        },
        include: { category: true, warehouse: true },
      });

      if (data.currentStock && data.currentStock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: created.id,
            quantity: data.currentStock,
            movementType: 'IN',
            reason: 'PURCHASE',
            referenceType: 'PRODUCT',
            referenceId: created.id,
            notes: 'Initial stock',
            createdById: userId,
          },
        });
      }

      return created;
    });

    await activityService.create({
      eventType: 'PRODUCT_CREATED',
      entityType: 'PRODUCT',
      entityId: product.id,
      message: `Product ${product.name} (${product.sku}) was added to inventory`,
      createdById: userId,
    });

    return { ...product, unitPrice: Number(product.unitPrice) };
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      sku: string;
      categoryId?: string | null;
      unitPrice: number;
      minimumStock: number;
      warehouseId?: string | null;
    }>,
    userId: string
  ) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Product not found');

    if (data.sku && data.sku !== existing.sku) {
      const duplicate = await prisma.product.findUnique({ where: { sku: data.sku } });
      if (duplicate) throw AppError.conflict('SKU already exists', 'DUPLICATE_SKU');
    }

    const product = await prisma.product.update({
      where: { id },
      data,
      include: { category: true, warehouse: true },
    });

    await activityService.create({
      eventType: 'PRODUCT_UPDATED',
      entityType: 'PRODUCT',
      entityId: product.id,
      message: `Product ${product.name} was updated`,
      createdById: userId,
    });

    return { ...product, unitPrice: Number(product.unitPrice) };
  }

  async getMovements(productId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { productId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { name: true } },
          product: { select: { name: true, sku: true } },
        },
      }),
      prisma.stockMovement.count({ where: { productId } }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async exportCsv() {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: { category: true, warehouse: true },
    });

    const headers = ['Name', 'SKU', 'Category', 'Unit Price', 'Current Stock', 'Minimum Stock', 'Warehouse', 'Created At'];
    const rows = products.map((p) => [
      p.name,
      p.sku,
      p.category?.name || '',
      Number(p.unitPrice),
      p.currentStock,
      p.minimumStock,
      p.warehouse?.name || '',
      p.createdAt.toISOString(),
    ]);

    return [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  }
}

export class InventoryService {
  async createMovement(
    data: {
      productId: string;
      quantity: number;
      movementType: MovementType;
      reason: MovementReason;
      notes?: string;
    },
    userId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: data.productId } });
      if (!product) throw AppError.notFound('Product not found');

      const previousStock = product.currentStock;
      let newStock: number;

      if (data.movementType === 'IN') {
        newStock = previousStock + data.quantity;
      } else {
        if (previousStock < data.quantity) {
          throw AppError.conflict(
            `Insufficient stock for ${product.name}. Available: ${previousStock}, Requested: ${data.quantity}`,
            'INSUFFICIENT_STOCK',
            { productId: product.id, sku: product.sku, available: previousStock, requested: data.quantity }
          );
        }
        newStock = previousStock - data.quantity;
      }

      const movement = await tx.stockMovement.create({
        data: {
          productId: data.productId,
          quantity: data.quantity,
          movementType: data.movementType,
          reason: data.reason,
          referenceType: 'MANUAL',
          notes: data.notes,
          createdById: userId,
        },
        include: {
          product: { select: { name: true, sku: true } },
          createdBy: { select: { name: true } },
        },
      });

      await tx.product.update({
        where: { id: data.productId },
        data: { currentStock: newStock },
      });

      await activityService.create({
        eventType: 'STOCK_MOVEMENT',
        entityType: 'STOCK_MOVEMENT',
        entityId: movement.id,
        message: `${data.quantity} units ${data.movementType} for ${product.name} (${product.sku})`,
        createdById: userId,
        metadata: {
          previousStock,
          newStock,
          movementType: data.movementType,
          reason: data.reason,
        },
      }, tx);

      if (newStock <= product.minimumStock && newStock > 0) {
        await activityService.create({
          eventType: 'LOW_STOCK',
          entityType: 'PRODUCT',
          entityId: product.id,
          message: `${product.name} (${product.sku}) is below minimum stock threshold`,
          metadata: { currentStock: newStock, minimumStock: product.minimumStock },
        }, tx);
      }

      return {
        movement,
        stockChange: { from: previousStock, to: newStock },
      };
    });
  }

  async listMovements(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.stockMovement.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { name: true, sku: true } },
          createdBy: { select: { name: true, role: true } },
        },
      }),
      prisma.stockMovement.count(),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

export const productService = new ProductService();
export const inventoryService = new InventoryService();
