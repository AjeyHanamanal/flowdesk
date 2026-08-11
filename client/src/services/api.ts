import { apiRequest, downloadAuthenticatedFile, getApiBase } from '../lib/api';
import type { AuthResponse, User } from '../types';

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getProfile: () => apiRequest<User>('/auth/me'),
  getPermissions: () => apiRequest<{ permissions: string[] }>('/auth/permissions'),
};

export const dashboardApi = {
  getOverview: () => apiRequest<Record<string, unknown>>('/dashboard/overview'),
  getOperationsPulse: () => apiRequest<{ count: number; actions: import('../types').PulseAction[] }>('/dashboard/operations-pulse'),
  getStockRisk: () => apiRequest<import('../types').StockRiskItem[]>('/dashboard/stock-risk'),
  getFollowups: () => apiRequest<import('../types').FollowupItem[]>('/dashboard/followups'),
  getChallanPipeline: () => apiRequest<Record<string, unknown>>('/dashboard/challan-pipeline'),
  search: (q: string) => apiRequest<{ customers: import('../types').SearchResult[]; products: import('../types').SearchResult[]; challans: import('../types').SearchResult[] }>(`/dashboard/search?q=${encodeURIComponent(q)}`),
};

export const customerApi = {
  list: (params: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest<import('../types').Customer[]>(`/customers?${query}`);
  },
  get: (id: string) => apiRequest<import('../types').Customer>(`/customers/${id}`),
  create: (data: Record<string, unknown>) =>
    apiRequest('/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    apiRequest(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  addNote: (id: string, content: string) =>
    apiRequest(`/customers/${id}/notes`, { method: 'POST', body: JSON.stringify({ content }) }),
  addFollowup: (id: string, scheduledAt: string, notes?: string) =>
    apiRequest(`/customers/${id}/followups`, { method: 'POST', body: JSON.stringify({ scheduledAt, notes }) }),
  getTimeline: (id: string) => apiRequest<import('../types').TimelineEvent[]>(`/customers/${id}/timeline`),
  exportCsv: () => fetch(`${getApiBase()}/customers/export/csv`, { headers: { Authorization: `Bearer ${localStorage.getItem('flowdesk_token')}` } }),
};

export const productApi = {
  list: (params: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest<import('../types').Product[]>(`/products?${query}`);
  },
  get: (id: string) => apiRequest<import('../types').Product>(`/products/${id}`),
  create: (data: Record<string, unknown>) =>
    apiRequest('/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    apiRequest(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getCategories: () => apiRequest<{ id: string; name: string }[]>('/products/meta/categories'),
  getWarehouses: () => apiRequest<{ id: string; name: string }[]>('/products/meta/warehouses'),
  getMovements: (id: string, page = 1) =>
    apiRequest(`/products/${id}/movements?page=${page}`),
  exportCsv: () => fetch(`${getApiBase()}/products/export/csv`, { headers: { Authorization: `Bearer ${localStorage.getItem('flowdesk_token')}` } }),
};

export const inventoryApi = {
  createMovement: (data: Record<string, unknown>) =>
    apiRequest('/inventory/movements', { method: 'POST', body: JSON.stringify(data) }),
  listMovements: (page = 1) => apiRequest(`/inventory/movements?page=${page}`),
};

export const challanApi = {
  list: (params: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest<import('../types').Challan[]>(`/challans?${query}`);
  },
  get: (id: string) => apiRequest<import('../types').Challan & { operationalJourney: import('../types').OperationalStep[]; activities: import('../types').ActivityEvent[] }>(`/challans/${id}`),
  create: (data: Record<string, unknown>) =>
    apiRequest('/challans', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    apiRequest(`/challans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  confirm: (id: string) => apiRequest(`/challans/${id}/confirm`, { method: 'POST' }),
  cancel: (id: string) => apiRequest(`/challans/${id}/cancel`, { method: 'POST' }),
  checkStock: (items: { productId: string; quantity: number }[]) =>
    apiRequest('/challans/check-stock', { method: 'POST', body: JSON.stringify({ items }) }),
  downloadPdf: (id: string, filename: string) => downloadAuthenticatedFile(`/challans/${id}/pdf`, filename),
  exportCsv: () => fetch(`${getApiBase()}/challans/export/csv`, { headers: { Authorization: `Bearer ${localStorage.getItem('flowdesk_token')}` } }),
};

export const activityApi = {
  list: (page = 1) => apiRequest<import('../types').ActivityEvent[]>(`/activity?page=${page}`),
};
