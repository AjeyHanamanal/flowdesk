import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, TrendingUp, Users, Package, FileText } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { dashboardApi, activityApi } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { PageSkeleton } from '../components/LoadingState';
import { greeting, formatDateTime } from '../utils/date';
import type { PulseAction, StockRiskItem, FollowupItem } from '../types';

function RiskBar({ percent }: { percent: number }) {
  return (
    <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${Math.min(100, percent)}%`,
          backgroundColor: percent > 50 ? '#b91c1c' : percent > 25 ? '#b45309' : '#2d6a4f',
        }}
      />
    </div>
  );
}

export function DashboardPage() {
  const { user, hasRole } = useAuth();

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => dashboardApi.getOverview().then((r) => r.data),
  });

  const { data: pulse } = useQuery({
    queryKey: ['operations-pulse'],
    queryFn: () => dashboardApi.getOperationsPulse().then((r) => r.data),
  });

  const { data: stockRisk } = useQuery({
    queryKey: ['stock-risk'],
    queryFn: () => dashboardApi.getStockRisk().then((r) => r.data),
    enabled: hasRole('ADMIN', 'WAREHOUSE'),
  });

  const { data: followups } = useQuery({
    queryKey: ['followups'],
    queryFn: () => dashboardApi.getFollowups().then((r) => r.data),
    enabled: hasRole('ADMIN', 'SALES'),
  });

  const { data: pipeline } = useQuery({
    queryKey: ['challan-pipeline'],
    queryFn: () => dashboardApi.getChallanPipeline().then((r) => r.data),
  });

  const { data: activityData } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => activityApi.list(1).then((r) => r.data),
  });

  if (overviewLoading) return <PageSkeleton />;

  const health = overview?.operationsHealth as { score: number; explanations: string[] } | undefined;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`${greeting()}, ${user?.name?.split(' ')[0]}`}
        subtitle="Here's what needs your attention today."
      />

      {health && (
        <div className="bg-surface-elevated border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-accent" />
              <h3 className="text-sm font-semibold">Operations Health</h3>
            </div>
            <span className="text-2xl font-semibold">{health.score}<span className="text-sm text-text-muted font-normal">/100</span></span>
          </div>
          <div className="w-full h-2 bg-surface rounded-full overflow-hidden mb-2">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${health.score}%` }} />
          </div>
          {health.explanations?.map((e, i) => (
            <p key={i} className="text-xs text-text-secondary">{e}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Customers', value: overview?.activeCustomers, total: overview?.totalCustomers, icon: Users },
          { label: 'Products', value: overview?.totalProducts, icon: Package },
          { label: 'Draft Challans', value: overview?.draftChallans, icon: FileText },
          { label: 'Low Stock', value: overview?.lowStockCount, icon: AlertTriangle, alert: true },
        ].map((metric) => (
          <div key={metric.label} className="bg-surface-elevated border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted font-medium">{metric.label}</span>
              <metric.icon size={16} className={metric.alert ? 'text-warning' : 'text-text-muted'} />
            </div>
            <p className="text-2xl font-semibold">{String(metric.value ?? '—')}</p>
            {metric.total !== undefined && (
              <p className="text-xs text-text-muted mt-1">{String(metric.total)} total</p>
            )}
          </div>
        ))}
      </div>

      {pulse && pulse.actions.length > 0 && (
        <section className="bg-surface-elevated border border-border rounded-lg">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Operations Pulse</h3>
            <p className="text-xs text-text-muted mt-0.5">{pulse.count} action{pulse.count !== 1 ? 's' : ''} need attention</p>
          </div>
          <div className="divide-y divide-border">
            {pulse.actions.map((action: PulseAction) => (
              <div key={action.id} className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-surface/50">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    action.priority === 'high' ? 'bg-danger' : action.priority === 'medium' ? 'bg-warning' : 'bg-text-muted'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{action.title}</p>
                    <p className="text-xs text-text-secondary mt-0.5 truncate">{action.description}</p>
                  </div>
                </div>
                <Link to={action.actionPath} className="text-xs font-medium text-accent hover:text-accent-hover whitespace-nowrap flex items-center gap-1">
                  {action.actionLabel} <ArrowRight size={12} />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stockRisk && stockRisk.length > 0 && (
          <section className="bg-surface-elevated border border-border rounded-lg">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold">Stock Risk Radar</h3>
            </div>
            <div className="divide-y divide-border">
              {(stockRisk as StockRiskItem[]).slice(0, 5).map((item) => (
                <Link key={item.id} to={`/app/inventory/${item.id}`} className="block px-5 py-3.5 hover:bg-surface/50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-text-muted">{item.sku} · {item.warehouse}</p>
                    </div>
                    <span className="text-xs font-medium text-danger">{item.riskPercent}% below</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <RiskBar percent={item.riskPercent} />
                    <span className="text-xs text-text-muted whitespace-nowrap">{item.currentStock}/{item.minimumStock}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {followups && followups.length > 0 && (
          <section className="bg-surface-elevated border border-border rounded-lg">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold">Customer Follow-up Queue</h3>
            </div>
            <div className="divide-y divide-border">
              {(followups as FollowupItem[]).slice(0, 5).map((item) => (
                <Link key={item.id} to={`/app/customers/${item.id}`} className="block px-5 py-3.5 hover:bg-surface/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.businessName}</p>
                      <p className="text-xs text-text-muted">{item.customerName} · {item.owner}</p>
                    </div>
                    <StatusBadge status={item.followUpState} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {pipeline && (
        <section className="bg-surface-elevated border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold mb-4">Challan Pipeline</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Draft', count: pipeline.draft, color: 'text-warning' },
              { label: 'Confirmed', count: pipeline.confirmed, color: 'text-success' },
              { label: 'Cancelled', count: pipeline.cancelled, color: 'text-danger' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className={`text-2xl font-semibold ${s.color}`}>{s.count as number}</p>
                <p className="text-xs text-text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {activityData && (
        <section className="bg-surface-elevated border border-border rounded-lg">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent Activity</h3>
            <Link to="/app/activity" className="text-xs text-accent hover:text-accent-hover">View all</Link>
          </div>
          <div className="divide-y divide-border">
            {(activityData as import('../types').ActivityEvent[]).slice(0, 5).map((event) => (
              <div key={event.id} className="px-5 py-3">
                <p className="text-sm">{event.message}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {event.createdBy?.name && `${event.createdBy.name} · `}
                  {formatDateTime(event.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
