interface LoadingStateProps {
  rows?: number;
}

export function TableSkeleton({ rows = 5 }: LoadingStateProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 skeleton rounded-md" />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-surface-elevated border border-border rounded-lg p-5">
      <div className="h-4 w-24 skeleton mb-3" />
      <div className="h-8 w-16 skeleton mb-2" />
      <div className="h-3 w-32 skeleton" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 skeleton" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <TableSkeleton rows={8} />
    </div>
  );
}
