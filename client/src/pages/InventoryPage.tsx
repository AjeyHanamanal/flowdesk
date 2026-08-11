import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Download, Search, AlertTriangle } from 'lucide-react';
import { productApi } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { TableSkeleton } from '../components/LoadingState';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../utils/date';
import type { Product } from '../types';

export function InventoryPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(searchParams.get('new') === 'true');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search, stockStatus],
    queryFn: () => productApi.list({
      page: String(page), limit: '20',
      ...(search && { search }),
      ...(stockStatus && { stockStatus }),
    }),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productApi.getCategories().then((r) => r.data),
  });

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => productApi.getWarehouses().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (formData: Record<string, unknown>) => productApi.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowForm(false);
      toast('Product created', 'success');
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const products = (data?.data || []) as Product[];
  const meta = data?.meta;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Inventory"
        subtitle="Track products, stock levels, and warehouse locations"
        actions={
          <>
            <button onClick={async () => {
              const res = await productApi.exportCsv();
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'products.csv'; a.click();
            }} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-md hover:bg-surface">
              <Download size={16} /> Export
            </button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-accent text-white rounded-md hover:bg-accent-hover">
              <Plus size={16} /> Add Product
            </button>
          </>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name or SKU..." className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-accent/30" />
        </div>
        <select value={stockStatus} onChange={(e) => { setStockStatus(e.target.value); setPage(1); }} className="px-3 py-2 text-sm border border-border rounded-md bg-surface-elevated">
          <option value="">All stock levels</option>
          <option value="low">Low stock</option>
          <option value="healthy">Healthy</option>
          <option value="out">Out of stock</option>
        </select>
      </div>

      {showForm && categories && warehouses && (
        <ProductForm
          categories={categories as { id: string; name: string }[]}
          warehouses={warehouses as { id: string; name: string }[]}
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
          loading={createMutation.isPending}
        />
      )}

      {isLoading ? <TableSkeleton /> : products.length === 0 ? (
        <EmptyState title="No products yet" description="Add your first product to start tracking inventory." action={
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-accent text-white rounded-md"><Plus size={16} /> Add Product</button>
        } />
      ) : (
        <>
          <div className="bg-surface-elevated border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="text-left px-4 py-3 font-medium text-text-muted">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted">SKU</th>
                  <th className="text-right px-4 py-3 font-medium text-text-muted">Stock</th>
                  <th className="text-right px-4 py-3 font-medium text-text-muted hidden md:table-cell">Price</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted hidden lg:table-cell">Warehouse</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface/50">
                    <td className="px-4 py-3">
                      <Link to={`/app/inventory/${p.id}`} className="font-medium hover:text-accent">{p.name}</Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary">{p.sku}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={p.stockStatus === 'low' || p.stockStatus === 'out' ? 'text-danger font-medium' : ''}>
                        {p.currentStock}
                      </span>
                      <span className="text-text-muted text-xs"> / {p.minimumStock}</span>
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">{formatCurrency(p.unitPrice)}</td>
                    <td className="px-4 py-3">
                      {p.stockStatus === 'low' ? (
                        <span className="inline-flex items-center gap-1"><AlertTriangle size={12} className="text-warning" /><StatusBadge status="low" /></span>
                      ) : (
                        <StatusBadge status={p.stockStatus || 'healthy'} />
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-text-secondary text-xs">{p.warehouse?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-text-muted">Page {meta.page} of {meta.totalPages}</p>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 text-xs border border-border rounded-md disabled:opacity-50">Previous</button>
                <button disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 text-xs border border-border rounded-md disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProductForm({ categories, warehouses, onSubmit, onCancel, loading }: {
  categories: { id: string; name: string }[];
  warehouses: { id: string; name: string }[];
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({ name: '', sku: '', categoryId: '', unitPrice: '', currentStock: '0', minimumStock: '0', warehouseId: '' });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, unitPrice: parseFloat(form.unitPrice), currentStock: parseInt(form.currentStock), minimumStock: parseInt(form.minimumStock), categoryId: form.categoryId || null, warehouseId: form.warehouseId || null }); }} className="bg-surface-elevated border border-border rounded-lg p-5 mb-4 space-y-4">
      <h3 className="text-sm font-semibold">New Product</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="block text-xs font-medium mb-1">Product Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface" /></div>
        <div><label className="block text-xs font-medium mb-1">SKU</label><input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface" /></div>
        <div><label className="block text-xs font-medium mb-1">Unit Price</label><input required type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface" /></div>
        <div><label className="block text-xs font-medium mb-1">Current Stock</label><input type="number" min="0" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: e.target.value })} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface" /></div>
        <div><label className="block text-xs font-medium mb-1">Minimum Stock Alert</label><input type="number" min="0" value={form.minimumStock} onChange={(e) => setForm({ ...form, minimumStock: e.target.value })} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface" /></div>
        <div><label className="block text-xs font-medium mb-1">Category</label><select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface"><option value="">None</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="block text-xs font-medium mb-1">Warehouse</label><select value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface"><option value="">None</option>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-border rounded-md">Cancel</button>
        <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-accent text-white rounded-md disabled:opacity-50">{loading ? 'Saving...' : 'Create Product'}</button>
      </div>
    </form>
  );
}
