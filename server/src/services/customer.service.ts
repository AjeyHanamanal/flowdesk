import { Prisma, CustomerStatus, CustomerType } from '@prisma/client';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { activityService } from './activity.service';

interface CustomerFilters {
  page: number;
  limit: number;
  search?: string;
  status?: CustomerStatus;
  customerType?: CustomerType;
  followUpFilter?: 'overdue' | 'today' | 'upcoming' | 'none';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class CustomerService {
  private buildWhere(filters: CustomerFilters): Prisma.CustomerWhereInput {
    const where: Prisma.CustomerWhereInput = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { businessName: { contains: filters.search, mode: 'insensitive' } },
        { mobile: { contains: filters.search } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.status) where.status = filters.status;
    if (filters.customerType) where.customerType = filters.customerType;

    if (filters.followUpFilter) {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 86400000 - 1);

      switch (filters.followUpFilter) {
        case 'overdue':
          where.followUpDate = { lt: startOfDay };
          break;
        case 'today':
          where.followUpDate = { gte: startOfDay, lte: endOfDay };
          break;
        case 'upcoming':
          where.followUpDate = { gt: endOfDay };
          break;
        case 'none':
          where.followUpDate = null;
          break;
      }
    }

    return where;
  }

  async list(filters: CustomerFilters) {
    const where = this.buildWhere(filters);
    const skip = (filters.page - 1) * filters.limit;
    const orderBy: Prisma.CustomerOrderByWithRelationInput = {
      [filters.sortBy || 'createdAt']: filters.sortOrder || 'desc',
    };

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy,
        include: { createdBy: { select: { id: true, name: true } } },
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      items,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async getById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: { createdBy: { select: { id: true, name: true } } },
        },
        followups: {
          orderBy: { scheduledAt: 'desc' },
          include: { createdBy: { select: { id: true, name: true } } },
        },
        challans: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            challanNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
        },
      },
    });
    if (!customer) throw AppError.notFound('Customer not found');
    return customer;
  }

  async create(
    data: {
      name: string;
      mobile: string;
      email?: string;
      businessName: string;
      gstNumber?: string;
      customerType: CustomerType;
      address?: string;
      status?: CustomerStatus;
      followUpDate?: string | null;
    },
    userId: string
  ) {
    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        mobile: data.mobile,
        email: data.email || null,
        businessName: data.businessName,
        gstNumber: data.gstNumber || null,
        customerType: data.customerType,
        address: data.address || null,
        status: data.status || 'LEAD',
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
        createdById: userId,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    await activityService.create({
      eventType: 'CUSTOMER_CREATED',
      entityType: 'CUSTOMER',
      entityId: customer.id,
      message: `${customer.businessName} was added to the customer pipeline`,
      createdById: userId,
      metadata: { customerName: customer.name, businessName: customer.businessName },
    });

    return customer;
  }

  async update(id: string, data: Partial<{
    name: string;
    mobile: string;
    email?: string;
    businessName: string;
    gstNumber?: string;
    customerType: CustomerType;
    address?: string;
    status?: CustomerStatus;
    followUpDate?: string | null;
  }>, userId: string) {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Customer not found');

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...data,
        email: data.email === '' ? null : data.email,
        gstNumber: data.gstNumber === '' ? null : data.gstNumber,
        followUpDate: data.followUpDate !== undefined
          ? (data.followUpDate ? new Date(data.followUpDate) : null)
          : undefined,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    await activityService.create({
      eventType: 'CUSTOMER_UPDATED',
      entityType: 'CUSTOMER',
      entityId: customer.id,
      message: `${customer.businessName} profile was updated`,
      createdById: userId,
    });

    return customer;
  }

  async addNote(customerId: string, content: string, userId: string) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw AppError.notFound('Customer not found');

    const note = await prisma.customerNote.create({
      data: { customerId, content, createdById: userId },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    await activityService.create({
      eventType: 'NOTE_ADDED',
      entityType: 'CUSTOMER',
      entityId: customerId,
      message: `Note added for ${customer.businessName}`,
      createdById: userId,
      metadata: { notePreview: content.slice(0, 100) },
    });

    return note;
  }

  async addFollowup(
    customerId: string,
    scheduledAt: string,
    notes: string | undefined,
    userId: string
  ) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw AppError.notFound('Customer not found');

    const [followup] = await prisma.$transaction([
      prisma.customerFollowup.create({
        data: {
          customerId,
          scheduledAt: new Date(scheduledAt),
          notes,
          createdById: userId,
        },
        include: { createdBy: { select: { id: true, name: true } } },
      }),
      prisma.customer.update({
        where: { id: customerId },
        data: { followUpDate: new Date(scheduledAt) },
      }),
    ]);

    await activityService.create({
      eventType: 'FOLLOWUP_SCHEDULED',
      entityType: 'CUSTOMER',
      entityId: customerId,
      message: `Follow-up scheduled for ${customer.businessName}`,
      createdById: userId,
      metadata: { scheduledAt },
    });

    return followup;
  }

  async getTimeline(customerId: string) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw AppError.notFound('Customer not found');

    const [notes, followups, challans, activities] = await Promise.all([
      prisma.customerNote.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { name: true } } },
      }),
      prisma.customerFollowup.findMany({
        where: { customerId },
        orderBy: { scheduledAt: 'desc' },
        include: { createdBy: { select: { name: true } } },
      }),
      prisma.challan.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          challanNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          confirmedAt: true,
        },
      }),
      prisma.activityEvent.findMany({
        where: { entityType: 'CUSTOMER', entityId: customerId },
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { name: true } } },
      }),
    ]);

    type TimelineEvent = {
      id: string;
      type: string;
      title: string;
      description: string;
      timestamp: Date;
      actor?: string;
    };

    const events: TimelineEvent[] = [];

    events.push({
      id: `created-${customer.id}`,
      type: 'customer_created',
      title: 'Customer created',
      description: `${customer.businessName} was added to the pipeline`,
      timestamp: customer.createdAt,
    });

    notes.forEach((n) => {
      events.push({
        id: n.id,
        type: 'note',
        title: 'Note added',
        description: n.content,
        timestamp: n.createdAt,
        actor: n.createdBy.name,
      });
    });

    followups.forEach((f) => {
      events.push({
        id: f.id,
        type: 'followup',
        title: f.completed ? 'Follow-up completed' : 'Follow-up scheduled',
        description: f.notes || 'Follow-up scheduled',
        timestamp: f.createdAt,
        actor: f.createdBy.name,
      });
    });

    challans.forEach((c) => {
      events.push({
        id: c.id,
        type: 'challan',
        title: `Challan ${c.status.toLowerCase()}`,
        description: `${c.challanNumber} — ${c.status}`,
        timestamp: c.confirmedAt || c.createdAt,
      });
    });

    activities.forEach((a) => {
      if (!events.some((e) => e.id === a.id)) {
        events.push({
          id: a.id,
          type: 'activity',
          title: a.eventType.replace(/_/g, ' ').toLowerCase(),
          description: a.message,
          timestamp: a.createdAt,
          actor: a.createdBy?.name,
        });
      }
    });

    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return events;
  }

  async exportCsv() {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { name: true } } },
    });

    const headers = [
      'Name', 'Business Name', 'Mobile', 'Email', 'Type', 'Status',
      'GST', 'Follow-up Date', 'Created By', 'Created At',
    ];

    const rows = customers.map((c) => [
      c.name,
      c.businessName,
      c.mobile,
      c.email || '',
      c.customerType,
      c.status,
      c.gstNumber || '',
      c.followUpDate?.toISOString().split('T')[0] || '',
      c.createdBy.name,
      c.createdAt.toISOString(),
    ]);

    return [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  }
}

export const customerService = new CustomerService();
