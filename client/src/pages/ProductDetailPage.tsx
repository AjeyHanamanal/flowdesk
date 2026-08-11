import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { productApi, inventoryApi } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { PageSkeleton } from '../components/LoadingState';
import { useToast } from '../components/Toast';
import { useAuth } from '../features/auth/AuthContext';
import { formatCurrency, formatDateTime } from '../utils/date';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [movementQty, setMovementQty] = useState('');
  const [movementType, setMovementType] = useState<'IN' | 'OUT'>('IN');
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  const movementMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.createMovement(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      const change = (result.data as { stockChange: { from: number; to: number } }).stockChange;
      toast(`Stock changed from ${change.from} → ${change.to}`, 'success');
      setMovementQty('');
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  if (isLoading || !product) return <PageSkeleton />;
  const p = product;

  return (
    <div className="animate-fade-in">
      <Link to="/app/inventory" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-accent mb-4">
        <ArrowLeft size={16} /> Back to inventory
      </Link>

      <div className="bg-surface-elevated border border-border rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">{p.name}</h1>
            <p className="text-sm font-mono text-text-muted mt-1">{p.sku}</p>
          </div>
          <StatusBadge status={p.stockStatus || 'healthy'} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div><p className="text-xs text-text-muted">Current Stock</p><p className="text-2xl font-semibold">{p.currentStock}</p></div>
          <div><p className="text-xs text-text-muted">Min Threshold</p><p className="text-2xl font-semibold">{p.minimumStock}</p></div>
          <div><p className="text-xs text-text-muted">Unit Price</p><p className="text-2xl font-semibold">{formatCurrency(p.unitPrice)}</p></div>
          <div><p className="text-xs text-text-muted">Risk</p><p className={`text-2xl font-semibold ${(p.riskPercent ?? 0) > 0 ? 'text-danger' : 'text-success'}`}>{p.riskPercent ?? 0}%</p></div>
        </div>
        {p.stockStatus === 'low' && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-warning-bg rounded-md text-sm text-warning">
            <AlertTriangle size={16} />
            Stock is below minimum threshold. Consider reordering.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <section className="bg-surface-elevated border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-4">Movement History</h3>
            {p.stockMovements && p.stockMovements.length > 0 ? (
              <div className="space-y-2">
                {p.stockMovements.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-md bg-surface text-sm">
                    <div>
                      <span className={`font-medium ${m.movementType === 'IN' ? 'text-success' : 'text-danger'}`}>
                        {m.movementType === 'IN' ? '+' : '-'}{m.quantity}
                      </span>
                      <span className="text-text-muted ml-2">{m.reason.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-right text-xs text-text-muted">
                      <p>{m.createdBy.name}</p>
                      <p>{formatDateTime(m.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">No movements recorded yet.</p>
            )}
          </section>
        </div>

        {hasRole('ADMIN', 'WAREHOUSE') && (
          <section className="bg-surface-elevated border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-3">Record Movement</h3>
            <p className="text-xs text-text-muted mb-3">
              Stock will change from {p.currentStock} → {movementType === 'IN' ? p.currentStock + (parseInt(movementQty) || 0) : p.currentStock - (parseInt(movementQty) || 0)}
            </p>
            <select value={movementType} onChange={(e) => setMovementType(e.target.value as 'IN' | 'OUT')} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface mb-2">
              <option value="IN">Stock IN</option>
              <option value="OUT">Stock OUT</option>
            </select>
            <input type="number" min="1" value={movementQty} onChange={(e) => setMovementQty(e.target.value)} placeholder="Quantity" className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface mb-2" />
            <button
              onClick={() => movementQty && movementMutation.mutate({ productId: id, quantity: parseInt(movementQty), movementType, reason: 'MANUAL_ADJUSTMENT' })}
              disabled={!movementQty || movementMutation.isPending}
              className="w-full py-2 text-sm bg-accent text-white rounded-md disabled:opacity-50"
            >
              Record Movement
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
