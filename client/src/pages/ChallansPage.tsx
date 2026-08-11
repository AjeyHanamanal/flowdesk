import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Download, Search } from 'lucide-react';
import { challanApi } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { TableSkeleton } from '../components/LoadingState';
import { useAuth } from '../features/auth/AuthContext';
import { formatCurrency, formatDateTime } from '../utils/date';
import type { Challan } from '../types';

export function ChallansPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { hasRole } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['challans', page, search, status],
    queryFn: () => challanApi.list({
      page: String(page), limit: '20',
      ...(search && { search }),
      ...(status && { status }),
    }),
  });

  const challans = (data?.data || []) as Challan[];
  const meta = data?.meta;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Sales Challans"
        subtitle="Create, manage, and track delivery challans"
        actions={
          <>
            <button onClick={async () => {
              const res = await challanApi.exportCsv();
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'challans.csv'; a.click();
            }} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-md hover:bg-surface">
              <Download size={16} /> Export
            </button>
            {hasRole('ADMIN', 'SALES') && (
              <Link to="/app/challans/new" className="flex items-center gap-1.5 px-3 py-2 text-sm bg-accent text-white rounded-md hover:bg-accent-hover">
                <Plus size={16} /> Create Challan
              </Link>
            )}
          </>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search challans..." className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-accent/30" />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="px-3 py-2 text-sm border border-border rounded-md bg-surface-elevated">
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {isLoading ? <TableSkeleton /> : challans.length === 0 ? (
        <EmptyState title="No challans yet" description="Create your first sales challan to start dispatching orders." action={
          hasRole('ADMIN', 'SALES') ? <Link to="/app/challans/new" className="flex items-center gap-1.5 px-4 py-2 text-sm bg-accent text-white rounded-md"><Plus size={16} /> Create Challan</Link> : undefined
        } />
      ) : (
        <>
          <div className="bg-surface-elevated border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="text-left px-4 py-3 font-medium text-text-muted">Challan #</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-text-muted">Qty</th>
                  <th className="text-right px-4 py-3 font-medium text-text-muted hidden md:table-cell">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted hidden lg:table-cell">Created</th>
                </tr>
              </thead>
              <tbody>
                {challans.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface/50">
                    <td className="px-4 py-3"><Link to={`/app/challans/${c.id}`} className="font-mono font-medium hover:text-accent">{c.challanNumber}</Link></td>
                    <td className="px-4 py-3">{c.customer?.businessName}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 text-right">{c.totalQuantity}</td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">{formatCurrency(c.totalAmount)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-text-muted">{formatDateTime(c.createdAt)}</td>
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
