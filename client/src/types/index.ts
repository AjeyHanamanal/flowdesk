export type Role = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  meta?: PaginationMeta;
  error?: { code: string; message: string; details?: Record<string, unknown> };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  businessName: string;
  gstNumber?: string;
  customerType: 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
  address?: string;
  status: 'LEAD' | 'ACTIVE' | 'INACTIVE';
  followUpDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
  currentStock: number;
  minimumStock: number;
  stockStatus?: 'out' | 'low' | 'healthy';
  riskPercent?: number;
  category?: { id: string; name: string };
  warehouse?: { id: string; name: string };
  stockMovements?: { id: string; quantity: number; movementType: string; reason: string; createdAt: string; createdBy: { name: string } }[];
  createdAt: string;
  updatedAt: string;
}

export interface Challan {
  id: string;
  challanNumber: string;
  customerId: string;
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  totalQuantity: number;
  totalAmount: number;
  notes?: string;
  createdAt: string;
  confirmedAt?: string;
  customer?: Customer;
  createdBy?: { id: string; name: string };
  items?: ChallanItem[];
  itemCount?: number;
}

export interface ChallanItem {
  id: string;
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  lineTotal: number;
  product?: { id: string; currentStock: number };
}

export interface ActivityEvent {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  message: string;
  createdAt: string;
  createdBy?: { name: string; role: Role };
}

export interface PulseAction {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionLabel: string;
  actionPath: string;
}

export interface StockRiskItem {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  minimumStock: number;
  riskPercent: number;
  warehouse: string;
  status: string;
}

export interface FollowupItem {
  id: string;
  customerName: string;
  businessName: string;
  status: string;
  nextFollowUp: string;
  followUpState: 'overdue' | 'today' | 'upcoming';
  priority: 'high' | 'medium' | 'low';
  owner: string;
}

export interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  actor?: string;
}

export interface SearchResult {
  type: 'customer' | 'product' | 'challan';
  id: string;
  title: string;
  subtitle: string;
  status: string;
  path: string;
}

export interface OperationalStep {
  key: string;
  label: string;
  completed: boolean;
  current?: boolean;
  blocked?: boolean;
}
