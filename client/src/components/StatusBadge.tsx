import clsx from 'clsx';

const statusStyles: Record<string, string> = {
  LEAD: 'bg-info-bg text-info',
  ACTIVE: 'bg-success-bg text-success',
  INACTIVE: 'bg-surface text-text-muted border border-border',
  DRAFT: 'bg-warning-bg text-warning',
  CONFIRMED: 'bg-success-bg text-success',
  CANCELLED: 'bg-danger-bg text-danger',
  low: 'bg-danger-bg text-danger',
  healthy: 'bg-success-bg text-success',
  out: 'bg-danger-bg text-danger',
  overdue: 'bg-danger-bg text-danger',
  today: 'bg-warning-bg text-warning',
  upcoming: 'bg-info-bg text-info',
  RETAIL: 'bg-surface text-text-secondary border border-border',
  WHOLESALE: 'bg-accent-subtle text-accent',
  DISTRIBUTOR: 'bg-info-bg text-info',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = statusStyles[status] || 'bg-surface text-text-secondary border border-border';
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-sm capitalize', style, className)}>
      {status.toLowerCase().replace(/_/g, ' ')}
    </span>
  );
}
