import { ChallanStatus, Prisma } from '@prisma/client';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { activityService } from './activity.service';

interface ChallanItemInput {
  productId: string;
  quantity: number;
}

interface ChallanFilters {
  page: number;
  limit: number;
  search?: string;
  status?: ChallanStatus;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class ChallanService {
  private async generateChallanNumber(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear();
    const sequence = await tx.challanSequence.upsert({
      where: { year },
      create: { year, lastNo: 1 },
      update: { lastNo: { increment: 1 } },
    });
    const num = sequence.lastNo.toString().padStart(4, '0');
    return `SC-${year}-${num}`;
  }

  private async buildItems(items: ChallanItemInput[], tx: Prisma.TransactionClient) {
    const builtItems: Array<{
      productId: string;
      productNameSnapshot: string;
      skuSnapshot: string;
      unitPriceSnapshot: number;
      quantity: number;
      lineTotal: number;
      availableStock: number;
    }> = [];

    for (const item of items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        throw AppError.notFound(`Product not found: ${item.productId}`);
      }

      const unitPrice = Number(product.unitPrice);
      builtItems.push({
        productId: product.id,
        productNameSnapshot: product.name,
        skuSnapshot: product.sku,
        unitPriceSnapshot: unitPrice,
        quantity: item.quantity,
        lineTotal: unitPrice * item.quantity,
        availableStock: product.currentStock,
      });
    }

    return builtItems;
  }

  async list(filters: ChallanFilters) {
    const where: Prisma.ChallanWhereInput = {};

    if (filters.search) {
      where.OR = [
        { challanNumber: { contains: filters.search, mode: 'insensitive' } },
        { customer: { businessName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }
    if (filters.status) where.status = filters.status;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const skip = (filters.page - 1) * filters.limit;
    const [items, total] = await Promise.all([
      prisma.challan.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: { [filters.sortBy || 'createdAt']: filters.sortOrder || 'desc' },
        include: {
          customer: { select: { id: true, businessName: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          items: { select: { id: true, quantity: true } },
        },
      }),
      prisma.challan.count({ where }),
    ]);

    return {
      items: items.map((c) => ({
        ...c,
        totalAmount: Number(c.totalAmount),
        itemCount: c.items.length,
      })),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async getById(id: string) {
    const challan = await prisma.challan.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true, role: true } },
        items: {
          include: {
            product: {
              select: { id: true, currentStock: true, minimumStock: true },
            },
          },
        },
      },
    });
    if (!challan) throw AppError.notFound('Challan not found');

    const stockMovements = challan.status === 'CONFIRMED'
      ? await prisma.stockMovement.findMany({
          where: { referenceType: 'CHALLAN', referenceId: challan.id },
          include: { product: { select: { name: true, sku: true } } },
        })
      : [];

    const activities = await prisma.activityEvent.findMany({
      where: { entityType: 'CHALLAN', entityId: id },
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { name: true } } },
    });

    return {
      ...challan,
      totalAmount: Number(challan.totalAmount),
      items: challan.items.map((i) => ({
        ...i,
        unitPriceSnapshot: Number(i.unitPriceSnapshot),
        lineTotal: Number(i.lineTotal),
      })),
      stockMovements,
      activities,
      operationalJourney: this.buildOperationalJourney(challan.status),
    };
  }

  buildOperationalJourney(status: ChallanStatus) {
    const steps = [
      { key: 'customer', label: 'Customer', completed: true },
      { key: 'draft', label: 'Challan Draft', completed: true },
      { key: 'confirmed', label: 'Challan Confirmed', completed: status === 'CONFIRMED' },
      { key: 'inventory', label: 'Inventory OUT', completed: status === 'CONFIRMED' },
      { key: 'accounts', label: 'Accounts Ready', completed: status === 'CONFIRMED' },
    ];

    if (status === 'CANCELLED') {
      return steps.map((s) => ({
        ...s,
        completed: s.key === 'customer' || s.key === 'draft',
        blocked: s.key !== 'customer' && s.key !== 'draft',
        current: false,
      }));
    }

    let currentFound = false;
    return steps.map((s) => {
      if (!s.completed && !currentFound) {
        currentFound = true;
        return { ...s, current: true, blocked: false };
      }
      return { ...s, current: false, blocked: !s.completed && currentFound };
    });
  }

  async create(
    data: { customerId: string; items: ChallanItemInput[]; notes?: string; status?: 'DRAFT' | 'CONFIRMED' },
    userId: string
  ) {
    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) throw AppError.notFound('Customer not found');

    if (data.status === 'CONFIRMED') {
      return this.createAndConfirm(data, userId);
    }

    return prisma.$transaction(async (tx) => {
      const builtItems = await this.buildItems(data.items, tx);
      const challanNumber = await this.generateChallanNumber(tx);
      const totalQuantity = builtItems.reduce((sum, i) => sum + i.quantity, 0);
      const totalAmount = builtItems.reduce((sum, i) => sum + i.lineTotal, 0);

      const challan = await tx.challan.create({
        data: {
          challanNumber,
          customerId: data.customerId,
          status: 'DRAFT',
          totalQuantity,
          totalAmount,
          notes: data.notes,
          createdById: userId,
          items: {
            create: builtItems.map((i) => ({
              productId: i.productId,
              productNameSnapshot: i.productNameSnapshot,
              skuSnapshot: i.skuSnapshot,
              unitPriceSnapshot: i.unitPriceSnapshot,
              quantity: i.quantity,
              lineTotal: i.lineTotal,
            })),
          },
        },
        include: {
          customer: { select: { businessName: true } },
          items: true,
          createdBy: { select: { name: true } },
        },
      });

      await activityService.create({
        eventType: 'CHALLAN_CREATED',
        entityType: 'CHALLAN',
        entityId: challan.id,
        message: `Draft challan ${challan.challanNumber} created for ${customer.businessName}`,
        createdById: userId,
        metadata: { challanNumber: challan.challanNumber, status: 'DRAFT' },
      }, tx);

      return {
        ...challan,
        totalAmount: Number(challan.totalAmount),
        items: challan.items.map((i) => ({
          ...i,
          unitPriceSnapshot: Number(i.unitPriceSnapshot),
          lineTotal: Number(i.lineTotal),
        })),
      };
    });
  }

  private async createAndConfirm(
    data: { customerId: string; items: ChallanItemInput[]; notes?: string },
    userId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const builtItems = await this.buildItems(data.items, tx);

      for (const item of builtItems) {
        if (item.availableStock < item.quantity) {
          throw AppError.conflict(
            `Insufficient stock for ${item.productNameSnapshot}. Available: ${item.availableStock}, Requested: ${item.quantity}`,
            'INSUFFICIENT_STOCK',
            {
              productId: item.productId,
              sku: item.skuSnapshot,
              productName: item.productNameSnapshot,
              available: item.availableStock,
              requested: item.quantity,
            }
          );
        }
      }

      const challanNumber = await this.generateChallanNumber(tx);
      const totalQuantity = builtItems.reduce((sum, i) => sum + i.quantity, 0);
      const totalAmount = builtItems.reduce((sum, i) => sum + i.lineTotal, 0);

      const challan = await tx.challan.create({
        data: {
          challanNumber,
          customerId: data.customerId,
          status: 'CONFIRMED',
          totalQuantity,
          totalAmount,
          notes: data.notes,
          createdById: userId,
          confirmedAt: new Date(),
          items: {
            create: builtItems.map((i) => ({
              productId: i.productId,
              productNameSnapshot: i.productNameSnapshot,
              skuSnapshot: i.skuSnapshot,
              unitPriceSnapshot: i.unitPriceSnapshot,
              quantity: i.quantity,
              lineTotal: i.lineTotal,
            })),
          },
        },
        include: { customer: true, items: true },
      });

      for (const item of builtItems) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;

        const newStock = product.currentStock - item.quantity;
        if (newStock < 0) {
          throw AppError.conflict(
            `Insufficient stock for ${item.productNameSnapshot}`,
            'INSUFFICIENT_STOCK',
            { available: product.currentStock, requested: item.quantity }
          );
        }

        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: newStock },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            movementType: 'OUT',
            reason: 'SALES_CHALLAN',
            referenceType: 'CHALLAN',
            referenceId: challan.id,
            createdById: userId,
          },
        });

        if (newStock <= product.minimumStock) {
          await activityService.create({
            eventType: 'LOW_STOCK',
            entityType: 'PRODUCT',
            entityId: product.id,
            message: `${product.name} (${product.sku}) crossed minimum stock threshold after challan ${challanNumber}`,
            metadata: { currentStock: newStock, minimumStock: product.minimumStock },
          }, tx);
        }
      }

      await activityService.create({
        eventType: 'CHALLAN_CONFIRMED',
        entityType: 'CHALLAN',
        entityId: challan.id,
        message: `Challan ${challanNumber} confirmed — ${totalQuantity} units dispatched`,
        createdById: userId,
      }, tx);

      return this.getById(challan.id);
    });
  }

  async update(
    id: string,
    data: { customerId?: string; items?: ChallanItemInput[]; notes?: string },
    userId: string
  ) {
    const existing = await prisma.challan.findUnique({ where: { id }, include: { items: true } });
    if (!existing) throw AppError.notFound('Challan not found');
    if (existing.status !== 'DRAFT') {
      throw AppError.conflict('Only draft challans can be updated', 'INVALID_STATUS');
    }

    return prisma.$transaction(async (tx) => {
      if (data.items) {
        await tx.challanItem.deleteMany({ where: { challanId: id } });
        const builtItems = await this.buildItems(data.items, tx);
        const totalQuantity = builtItems.reduce((sum, i) => sum + i.quantity, 0);
        const totalAmount = builtItems.reduce((sum, i) => sum + i.lineTotal, 0);

        await tx.challanItem.createMany({
          data: builtItems.map((i) => ({
            challanId: id,
            productId: i.productId,
            productNameSnapshot: i.productNameSnapshot,
            skuSnapshot: i.skuSnapshot,
            unitPriceSnapshot: i.unitPriceSnapshot,
            quantity: i.quantity,
            lineTotal: i.lineTotal,
          })),
        });

        await tx.challan.update({
          where: { id },
          data: {
            customerId: data.customerId,
            notes: data.notes,
            totalQuantity,
            totalAmount,
          },
        });
      } else {
        await tx.challan.update({
          where: { id },
          data: { customerId: data.customerId, notes: data.notes },
        });
      }

      return this.getById(id);
    });
  }

  async confirm(id: string, userId: string) {
    const challan = await prisma.challan.findUnique({
      where: { id },
      include: { items: true, customer: true },
    });

    if (!challan) throw AppError.notFound('Challan not found');
    if (challan.status === 'CONFIRMED') {
      throw AppError.conflict('Challan is already confirmed', 'ALREADY_CONFIRMED');
    }
    if (challan.status === 'CANCELLED') {
      throw AppError.conflict('Cancelled challan cannot be confirmed', 'INVALID_STATUS');
    }

    return prisma.$transaction(async (tx) => {
      for (const item of challan.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw AppError.notFound(`Product not found`);

        if (product.currentStock < item.quantity) {
          throw AppError.conflict(
            `Insufficient stock for ${item.productNameSnapshot}. Available: ${product.currentStock}, Requested: ${item.quantity}`,
            'INSUFFICIENT_STOCK',
            {
              productId: product.id,
              sku: item.skuSnapshot,
              productName: item.productNameSnapshot,
              available: product.currentStock,
              requested: item.quantity,
            }
          );
        }
      }

      for (const item of challan.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;

        const newStock = product.currentStock - item.quantity;
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: newStock },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            movementType: 'OUT',
            reason: 'SALES_CHALLAN',
            referenceType: 'CHALLAN',
            referenceId: challan.id,
            createdById: userId,
          },
        });

        if (newStock <= product.minimumStock) {
          await activityService.create({
            eventType: 'LOW_STOCK',
            entityType: 'PRODUCT',
            entityId: product.id,
            message: `${product.name} (${product.sku}) crossed minimum stock threshold`,
            metadata: { currentStock: newStock, minimumStock: product.minimumStock },
          }, tx);
        }
      }

      await tx.challan.update({
        where: { id },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      });

      await activityService.create({
        eventType: 'CHALLAN_CONFIRMED',
        entityType: 'CHALLAN',
        entityId: challan.id,
        message: `Challan ${challan.challanNumber} confirmed — ${challan.totalQuantity} units removed from stock`,
        createdById: userId,
        metadata: {
          totalQuantity: challan.totalQuantity,
          customerName: challan.customer.businessName,
        },
      }, tx);

      return this.getById(id);
    });
  }

  async cancel(id: string, userId: string) {
    const challan = await prisma.challan.findUnique({ where: { id } });
    if (!challan) throw AppError.notFound('Challan not found');
    if (challan.status === 'CANCELLED') {
      throw AppError.conflict('Challan is already cancelled', 'ALREADY_CANCELLED');
    }

    const updated = await prisma.challan.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    await activityService.create({
      eventType: 'CHALLAN_CANCELLED',
      entityType: 'CHALLAN',
      entityId: id,
      message: `Challan ${challan.challanNumber} was cancelled`,
      createdById: userId,
    });

    return updated;
  }

  async checkStockAvailability(items: ChallanItemInput[]) {
    const results = [];
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        results.push({
          productId: item.productId,
          available: 0,
          requested: item.quantity,
          sufficient: false,
          productName: 'Unknown',
          sku: 'Unknown',
        });
        continue;
      }
      results.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        available: product.currentStock,
        requested: item.quantity,
        sufficient: product.currentStock >= item.quantity,
      });
    }
    return results;
  }

  async exportCsv() {
    const challans = await prisma.challan.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { businessName: true } },
        createdBy: { select: { name: true } },
      },
    });

    const headers = ['Challan Number', 'Customer', 'Status', 'Total Qty', 'Total Amount', 'Created By', 'Created At'];
    const rows = challans.map((c) => [
      c.challanNumber,
      c.customer.businessName,
      c.status,
      c.totalQuantity,
      Number(c.totalAmount),
      c.createdBy.name,
      c.createdAt.toISOString(),
    ]);

    return [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  }
}

export const challanService = new ChallanService();
