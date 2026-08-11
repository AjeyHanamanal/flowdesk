import { useQuery } from '@tanstack/react-query';
import { activityApi } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { TableSkeleton } from '../components/LoadingState';
import { formatDateTime } from '../utils/date';
import type { ActivityEvent } from '../types';

export function ActivityPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['activity'],
    queryFn: () => activityApi.list(1).then((r) => r.data),
  });

  const events = (data || []) as ActivityEvent[];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Activity Center" subtitle="Unified business activity feed across all operations" />

      {isLoading ? <TableSkeleton rows={10} /> : events.length === 0 ? (
        <EmptyState title="No operational events yet" description="Activity will appear here as your team works." />
      ) : (
        <div className="bg-surface-elevated border border-border rounded-lg divide-y divide-border">
          {events.map((event) => (
            <div key={event.id} className="px-5 py-4 hover:bg-surface/50">
              <p className="text-sm">{event.message}</p>
              <div className="flex items-center gap-2 mt-1.5">
                {event.createdBy && (
                  <span className="text-xs text-text-muted">{event.createdBy.name} · {event.createdBy.role}</span>
                )}
                <span className="text-xs text-text-muted">{formatDateTime(event.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
