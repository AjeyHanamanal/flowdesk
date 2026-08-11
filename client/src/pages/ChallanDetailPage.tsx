import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download } from 'lucide-react';
import { challanApi } from '../services/api';
import { formatApiError } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { OperationalJourney } from '../components/OperationalJourney';
import { PageSkeleton } from '../components/LoadingState';
import { useToast } from '../components/Toast';
import { useAuth } from '../features/auth/AuthContext';
import { formatCurrency, formatDateTime } from '../utils/date';
import type { Challan, ChallanItem, OperationalStep, ActivityEvent } from '../types';

export function ChallanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();

  const { data: challan, isLoading } = useQuery({
    queryKey: ['challan', id],
    queryFn: () => challanApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  const confirmMutation = useMutation({
    mutationFn: () => challanApi.confirm(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challan', id] });
      toast('Challan confirmed — stock has been updated', 'success');
    },
    onError: (err: Error) => toast(formatApiError(err), 'error'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => challanApi.cancel(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challan', id] });
      toast('Challan cancelled', 'info');
    },
    onError: (err: Error) => toast(formatApiError(err), 'error'),
  });

  const handleDownloadPdf = async () => {
    if (!id || !challan?.challanNumber) return;
    setDownloadingPdf(true);
    try {
      await challanApi.downloadPdf(id, `${challan.challanNumber}.pdf`);
      toast('PDF downloaded successfully', 'success');
    } catch (err) {
      toast(formatApiError(err), 'error');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (isLoading) return <PageSkeleton />;
  const c = challan as Challan & {
    items: ChallanItem[];
    operationalJourney: OperationalStep[];
    activities: ActivityEvent[];
    customer: { businessName: string; name: string; mobile: string; gstNumber?: string; address?: string };
    createdBy: { name: string };
    stockMovements?: { product: { name: string; sku: string }; quantity: number }[];
  };

  const totalQty = c.items?.reduce((s, i) => s + i.quantity, 0) || 0;

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <Link to="/app/challans" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-accent mb-4">
        <ArrowLeft size={16} /> Back to challans
      </Link>

      {/* Document header */}
      <div className="bg-surface-elevated border border-border rounded-lg p-8 mb-6">
        <div className="text-center mb-6">
          <p className="text-lg font-semibold tracking-tight">FlowDesk</p>
          <p className="text-sm text-text-muted">Sales Challan</p>
          <p className="text-2xl font-mono font-semibold mt-2">{c.challanNumber}</p>
          <div className="mt-2"><StatusBadge status={c.status} /></div>
        </div>

        <OperationalJourney steps={c.operationalJourney || []} />

        <div className="grid grid-cols-2 gap-6 mt-8 pt-6 border-t border-border text-sm">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Customer</p>
            <p className="font-medium">{c.customer?.businessName}</p>
            <p className="text-text-secondary">{c.customer?.name}</p>
            <p className="text-text-secondary">{c.customer?.mobile}</p>
            {c.customer?.gstNumber && <p className="text-text-secondary font-mono text-xs mt-1">GST: {c.customer.gstNumber}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Document Info</p>
            <p>Created by: {c.createdBy?.name}</p>
            <p>{formatDateTime(c.createdAt)}</p>
            {c.confirmedAt && <p className="text-success">Confirmed: {formatDateTime(c.confirmedAt)}</p>}
          </div>
        </div>

        <table className="w-full text-sm mt-8">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="text-left py-2 font-medium text-text-muted">Product</th>
              <th className="text-left py-2 font-medium text-text-muted">SKU</th>
              <th className="text-right py-2 font-medium text-text-muted">Qty</th>
              <th className="text-right py-2 font-medium text-text-muted">Price</th>
              <th className="text-right py-2 font-medium text-text-muted">Total</th>
            </tr>
          </thead>
          <tbody>
            {c.items?.map((item) => (
              <tr key={item.id} className="border-b border-border">
                <td className="py-2.5">{item.productNameSnapshot}</td>
                <td className="py-2.5 font-mono text-xs">{item.skuSnapshot}</td>
                <td className="py-2.5 text-right">{item.quantity}</td>
                <td className="py-2.5 text-right">{formatCurrency(item.unitPriceSnapshot)}</td>
                <td className="py-2.5 text-right">{formatCurrency(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border">
              <td colSpan={2} className="py-3 font-medium">Total</td>
              <td className="py-3 text-right font-medium">{totalQty}</td>
              <td></td>
              <td className="py-3 text-right font-semibold text-base">{formatCurrency(c.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Stock impact */}
      {c.status === 'CONFIRMED' && c.stockMovements && c.stockMovements.length > 0 && (
        <section className="bg-surface-elevated border border-border rounded-lg p-5 mb-6">
          <h3 className="text-sm font-semibold mb-3">Stock Impact</h3>
          <div className="space-y-2">
            {c.stockMovements.map((m, i) => (
              <p key={i} className="text-sm text-danger">-{m.quantity} units of {m.product.name} ({m.product.sku})</p>
            ))}
          </div>
        </section>
      )}

      {c.status === 'DRAFT' && hasRole('ADMIN', 'SALES') && (
        <div className="bg-warning-bg border border-warning/20 rounded-lg p-4 mb-6 text-sm text-warning">
          Confirming this challan will remove {totalQty} units from warehouse stock.
        </div>
      )}

      {c.status === 'CANCELLED' && (
        <div className="bg-surface border border-border rounded-lg p-4 mb-6 text-sm text-text-muted">
          Cancellation does not restore stock because this challan was never confirmed.
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        {c.status === 'DRAFT' && hasRole('ADMIN', 'SALES') && (
          <>
            <button onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending} className="px-4 py-2 text-sm bg-accent text-white rounded-md disabled:opacity-50">
              {confirmMutation.isPending ? 'Confirming...' : 'Confirm Challan'}
            </button>
            <button onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending} className="px-4 py-2 text-sm border border-border rounded-md">
              Cancel Challan
            </button>
          </>
        )}
        {c.status === 'CONFIRMED' && (
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="flex items-center gap-1.5 px-4 py-2 text-sm border border-border rounded-md hover:bg-surface disabled:opacity-50"
          >
            <Download size={16} /> {downloadingPdf ? 'Downloading...' : 'Download PDF'}
          </button>
        )}
      </div>

      {/* Activity timeline */}
      {c.activities && c.activities.length > 0 && (
        <section className="bg-surface-elevated border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold mb-3">Activity Timeline</h3>
          <div className="space-y-3">
            {c.activities.map((a) => (
              <div key={a.id} className="text-sm">
                <p>{a.message}</p>
                <p className="text-xs text-text-muted">{a.createdBy?.name && `${a.createdBy.name} · `}{formatDateTime(a.createdAt)}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
