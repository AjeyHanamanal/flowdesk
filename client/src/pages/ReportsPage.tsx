import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../services/api';
import { PageHeader } from '../components/PageHeader';

export function ReportsPage() {
  const { data: overview } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => dashboardApi.getOverview().then((r) => r.data),
  });

  const { data: pipeline } = useQuery({
    queryKey: ['challan-pipeline'],
    queryFn: () => dashboardApi.getChallanPipeline().then((r) => r.data),
  });

  return (
    <div className="animate-fade-in">
      <PageHeader title="Reports" subtitle="Operational summaries and business metrics" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-surface-elevated border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold mb-4">Business Overview</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-text-secondary">Total Customers</span><span className="font-medium">{overview?.totalCustomers as number ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-text-secondary">Active Customers</span><span className="font-medium">{overview?.activeCustomers as number ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-text-secondary">Total Products</span><span className="font-medium">{overview?.totalProducts as number ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-text-secondary">Low Stock Items</span><span className="font-medium text-warning">{overview?.lowStockCount as number ?? '—'}</span></div>
          </div>
        </section>

        <section className="bg-surface-elevated border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold mb-4">Challan Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-text-secondary">Draft</span><span className="font-medium">{pipeline?.draft as number ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-text-secondary">Confirmed</span><span className="font-medium text-success">{pipeline?.confirmed as number ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-text-secondary">Cancelled</span><span className="font-medium text-danger">{pipeline?.cancelled as number ?? '—'}</span></div>
          </div>
        </section>

        <section className="bg-surface-elevated border border-border rounded-lg p-5 md:col-span-2">
          <h3 className="text-sm font-semibold mb-4">Follow-up Status</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><p className="text-2xl font-semibold text-danger">{overview?.overdueFollowups as number ?? 0}</p><p className="text-xs text-text-muted">Overdue</p></div>
            <div><p className="text-2xl font-semibold text-warning">{overview?.todayFollowups as number ?? 0}</p><p className="text-xs text-text-muted">Today</p></div>
            <div><p className="text-2xl font-semibold">{overview?.operationsHealth ? (overview.operationsHealth as { score: number }).score : '—'}</p><p className="text-xs text-text-muted">Health Score</p></div>
          </div>
        </section>
      </div>
    </div>
  );
}

export function SettingsPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader title="Settings" subtitle="Application configuration" />
      <div className="bg-surface-elevated border border-border rounded-lg p-5">
        <p className="text-sm text-text-secondary">Settings and configuration options will be available in future releases.</p>
      </div>
    </div>
  );
}
