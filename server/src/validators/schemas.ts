import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const customerCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number (10 digits)'),
  email: z.union([z.string().email('Invalid email format'), z.literal('')]).optional(),
  businessName: z.string().min(1, 'Business name is required').max(200),
  gstNumber: z.union([z.string().max(15), z.literal('')]).optional(),
  customerType: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']),
  address: z.string().max(500).optional(),
  status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']).default('LEAD'),
  followUpDate: z.string().datetime().optional().nullable(),
});

export const customerUpdateSchema = customerCreateSchema.partial();

export const customerFilterSchema = paginationSchema.extend({
  status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']).optional(),
  customerType: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']).optional(),
  followUpFilter: z.enum(['overdue', 'today', 'upcoming', 'none']).optional(),
});

export const noteCreateSchema = z.object({
  content: z.string().min(1, 'Note content is required').max(2000),
});

export const followupCreateSchema = z.object({
  scheduledAt: z.string().datetime(),
  notes: z.string().max(500).optional(),
});

export const productCreateSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(50),
  categoryId: z.string().uuid().optional().nullable(),
  unitPrice: z.coerce.number().positive('Price must be positive'),
  currentStock: z.coerce.number().int().min(0).default(0),
  minimumStock: z.coerce.number().int().min(0).default(0),
  warehouseId: z.string().uuid().optional().nullable(),
});

export const productUpdateSchema = productCreateSchema.partial();

export const productFilterSchema = paginationSchema.extend({
  categoryId: z.string().uuid().optional(),
  stockStatus: z.enum(['low', 'healthy', 'out']).optional(),
  warehouseId: z.string().uuid().optional(),
});

export const stockMovementSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive('Quantity must be positive'),
  movementType: z.enum(['IN', 'OUT']),
  reason: z.enum(['PURCHASE', 'SALES_CHALLAN', 'MANUAL_ADJUSTMENT', 'RETURN', 'CORRECTION']),
  notes: z.string().max(500).optional(),
});

export const challanItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive('Quantity must be positive'),
});

export const challanCreateSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(challanItemSchema).min(1, 'At least one item is required'),
  notes: z.string().max(500).optional(),
  status: z.enum(['DRAFT', 'CONFIRMED']).default('DRAFT'),
});

export const challanUpdateSchema = z.object({
  customerId: z.string().uuid().optional(),
  items: z.array(challanItemSchema).min(1).optional(),
  notes: z.string().max(500).optional(),
});

export const challanFilterSchema = paginationSchema.extend({
  status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
  customerId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const searchSchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
