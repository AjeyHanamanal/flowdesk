import { ActivityEventType, EntityType, Prisma } from '@prisma/client';
import prisma from '../config/database';

interface CreateActivityParams {
  eventType: ActivityEventType;
  entityType: EntityType;
  entityId: string;
  message: string;
  createdById?: string;
  metadata?: Record<string, unknown>;
}

export class ActivityService {
  async create(params: CreateActivityParams, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.activityEvent.create({
      data: {
        eventType: params.eventType,
        entityType: params.entityType,
        entityId: params.entityId,
        message: params.message,
        createdById: params.createdById,
        metadata: params.metadata as Prisma.InputJsonValue,
      },
    });
  }

  async list(page = 1, limit = 20, eventType?: ActivityEventType) {
    const skip = (page - 1) * limit;
    const where = eventType ? { eventType } : {};

    const [items, total] = await Promise.all([
      prisma.activityEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, name: true, role: true } },
        },
      }),
      prisma.activityEvent.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

export const activityService = new ActivityService();
