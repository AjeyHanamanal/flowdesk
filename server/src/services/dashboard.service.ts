import { Role } from '@prisma/client';
import prisma from '../config/database';
import { productService } from './product.service';

export class DashboardService {
  async getOperationsPulse(role: Role) {
    const actions: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      actionLabel: string;
      actionPath: string;
    }> = [];

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 86400000 - 1);

    const [lowStockProducts, overdueFollowups, todayFollowups, draftChallans] = await Promise.all([
      prisma.product.findMany({
        where: { currentStock: { gt: 0 } },
        include: { warehouse: true },
      }).then((products) =>
        products.filter((p) => p.currentStock <= p.minimumStock)
      ),
      prisma.customer.findMany({
        where: { followUpDate: { lt: startOfDay } },
        take: 5,
      }),
      prisma.customer.findMany({
        where: { followUpDate: { gte: startOfDay, lte: endOfDay } },
        take: 5,
      }),
      prisma.challan.findMany({
        where: { status: 'DRAFT' },
        take: 5,
        include: { customer: { select: { businessName: true } } },
      }),
    ]);

    if (role === 'ADMIN' || role === 'WAREHOUSE') {
      lowStockProducts.slice(0, 3).forEach((p) => {
        actions.push({
          id: `low-stock-${p.id}`,
          type: 'low_stock',
          title: 'Low stock',
          description: `${p.currentStock} units of ${p.sku} are below reorder threshold (${p.minimumStock})`,
          priority: p.currentStock === 0 ? 'high' : 'medium',
          actionLabel: 'Review inventory',
          actionPath: `/app/inventory/${p.id}`,
        });
      });
    }

    if (role === 'ADMIN' || role === 'SALES') {
      overdueFollowups.forEach((c) => {
        actions.push({
          id: `overdue-${c.id}`,
          type: 'followup_overdue',
          title: 'Follow-up overdue',
          description: `${c.businessName} has an overdue follow-up`,
          priority: 'high',
          actionLabel: 'Open customer',
          actionPath: `/app/customers/${c.id}`,
        });
      });

      todayFollowups.forEach((c) => {
        actions.push({
          id: `today-${c.id}`,
          type: 'followup_today',
          title: 'Follow-up due today',
          description: `${c.businessName} has a follow-up scheduled today`,
          priority: 'medium',
          actionLabel: 'Open customer',
          actionPath: `/app/customers/${c.id}`,
        });
      });
    }

    if (role === 'ADMIN' || role === 'SALES') {
      draftChallans.forEach((c) => {
        actions.push({
          id: `draft-${c.id}`,
          type: 'challan_draft',
          title: 'Challan pending',
          description: `${c.challanNumber} for ${c.customer.businessName} is still in Draft`,
          priority: 'medium',
          actionLabel: 'Review challan',
          actionPath: `/app/challans/${c.id}`,
        });
      });
    }

    if (role === 'ACCOUNTS') {
      const confirmedChallans = await prisma.challan.findMany({
        where: { status: 'CONFIRMED' },
        orderBy: { confirmedAt: 'desc' },
        take: 5,
        include: { customer: { select: { businessName: true } } },
      });
      confirmedChallans.forEach((c) => {
        actions.push({
          id: `confirmed-${c.id}`,
          type: 'invoice_ready',
          title: 'Invoice ready',
          description: `${c.challanNumber} for ${c.customer.businessName} is ready for invoicing`,
          priority: 'low',
          actionLabel: 'View challan',
          actionPath: `/app/challans/${c.id}`,
        });
      });
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return {
      count: actions.length,
      actions: actions.slice(0, 10),
    };
  }

  async getStockRisk() {
    const products = await prisma.product.findMany({
      include: { warehouse: true, category: true },
    });

    return products
      .filter((p) => p.currentStock <= p.minimumStock)
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        currentStock: p.currentStock,
        minimumStock: p.minimumStock,
        riskPercent: productService.calculateRiskPercent(p.currentStock, p.minimumStock),
        warehouse: p.warehouse?.name || 'Unassigned',
        category: p.category?.name || 'Uncategorized',
        status: productService.getStockStatus(p.currentStock, p.minimumStock),
      }))
      .sort((a, b) => b.riskPercent - a.riskPercent);
  }

  async getFollowups() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 86400000 - 1);

    const customers = await prisma.customer.findMany({
      where: { followUpDate: { not: null } },
      include: { createdBy: { select: { name: true } } },
      orderBy: { followUpDate: 'asc' },
    });

    return customers.map((c) => {
      let followUpState: 'overdue' | 'today' | 'upcoming';
      if (c.followUpDate! < startOfDay) followUpState = 'overdue';
      else if (c.followUpDate! <= endOfDay) followUpState = 'today';
      else followUpState = 'upcoming';

      let priority: 'high' | 'medium' | 'low';
      if (followUpState === 'overdue') priority = 'high';
      else if (followUpState === 'today') priority = 'medium';
      else priority = 'low';

      return {
        id: c.id,
        customerName: c.name,
        businessName: c.businessName,
        status: c.status,
        lastInteraction: c.updatedAt,
        nextFollowUp: c.followUpDate,
        followUpState,
        priority,
        owner: c.createdBy.name,
      };
    });
  }

  async getChallanPipeline() {
    const [draft, confirmed, cancelled] = await Promise.all([
      prisma.challan.count({ where: { status: 'DRAFT' } }),
      prisma.challan.count({ where: { status: 'CONFIRMED' } }),
      prisma.challan.count({ where: { status: 'CANCELLED' } }),
    ]);

    const recent = await prisma.challan.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { businessName: true } },
        createdBy: { select: { name: true } },
      },
    });

    return { draft, confirmed, cancelled, recent };
  }

  async getOverview(role: Role) {
    const [
      totalCustomers,
      activeCustomers,
      totalProducts,
      lowStockCount,
      draftChallans,
      confirmedChallans,
      todayFollowups,
      overdueFollowups,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { status: 'ACTIVE' } }),
      prisma.product.count(),
      prisma.product.findMany().then((p) => p.filter((x) => x.currentStock <= x.minimumStock && x.currentStock > 0).length),
      prisma.challan.count({ where: { status: 'DRAFT' } }),
      prisma.challan.count({ where: { status: 'CONFIRMED' } }),
      (async () => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start.getTime() + 86400000 - 1);
        return prisma.customer.count({ where: { followUpDate: { gte: start, lte: end } } });
      })(),
      (async () => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        return prisma.customer.count({ where: { followUpDate: { lt: start } } });
      })(),
    ]);

    const healthScore = this.calculateOperationsHealth({
      overdueFollowups,
      lowStockCount,
      draftChallans,
    });

    const base = {
      totalCustomers,
      activeCustomers,
      totalProducts,
      lowStockCount,
      draftChallans,
      confirmedChallans,
      todayFollowups,
      overdueFollowups,
      operationsHealth: healthScore,
    };

    if (role === 'SALES') {
      return { ...base, focus: 'sales' };
    }
    if (role === 'WAREHOUSE') {
      return { ...base, focus: 'warehouse' };
    }
    if (role === 'ACCOUNTS') {
      return { ...base, focus: 'accounts' };
    }
    return { ...base, focus: 'admin' };
  }

  calculateOperationsHealth(factors: {
    overdueFollowups: number;
    lowStockCount: number;
    draftChallans: number;
  }) {
    let score = 100;
    const explanations: string[] = [];

    score -= factors.overdueFollowups * 5;
    if (factors.overdueFollowups > 0) {
      explanations.push(`${factors.overdueFollowups} overdue follow-up${factors.overdueFollowups > 1 ? 's' : ''} affecting today's score`);
    }

    score -= factors.lowStockCount * 3;
    if (factors.lowStockCount > 0) {
      explanations.push(`${factors.lowStockCount} product${factors.lowStockCount > 1 ? 's' : ''} below minimum stock`);
    }

    score -= factors.draftChallans * 2;
    if (factors.draftChallans > 0) {
      explanations.push(`${factors.draftChallans} draft challan${factors.draftChallans > 1 ? 's' : ''} pending confirmation`);
    }

    score = Math.max(0, Math.min(100, score));

    return {
      score,
      explanations,
      formula: '100 - (overdue_followups × 5) - (low_stock × 3) - (draft_challans × 2), clamped 0-100',
    };
  }

  async globalSearch(query: string, limit = 10) {
    const [customers, products, challans] = await Promise.all([
      prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { businessName: { contains: query, mode: 'insensitive' } },
            { mobile: { contains: query } },
          ],
        },
        take: limit,
        select: { id: true, name: true, businessName: true, status: true },
      }),
      prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { sku: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        select: { id: true, name: true, sku: true, currentStock: true },
      }),
      prisma.challan.findMany({
        where: {
          OR: [
            { challanNumber: { contains: query, mode: 'insensitive' } },
            { customer: { businessName: { contains: query, mode: 'insensitive' } } },
          ],
        },
        take: limit,
        select: { id: true, challanNumber: true, status: true, customer: { select: { businessName: true } } },
      }),
    ]);

    return {
      customers: customers.map((c) => ({
        type: 'customer' as const,
        id: c.id,
        title: c.businessName,
        subtitle: c.name,
        status: c.status,
        path: `/app/customers/${c.id}`,
      })),
      products: products.map((p) => ({
        type: 'product' as const,
        id: p.id,
        title: p.name,
        subtitle: p.sku,
        status: p.currentStock > 0 ? 'In Stock' : 'Out of Stock',
        path: `/app/inventory/${p.id}`,
      })),
      challans: challans.map((c) => ({
        type: 'challan' as const,
        id: c.id,
        title: c.challanNumber,
        subtitle: c.customer.businessName,
        status: c.status,
        path: `/app/challans/${c.id}`,
      })),
    };
  }
}

export const dashboardService = new DashboardService();
