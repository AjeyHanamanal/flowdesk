import type { TimelineEvent } from '../types';
import { format, isToday, isYesterday } from '../utils/date';

interface TimelineProps {
  events: TimelineEvent[];
}

function formatDateLabel(date: string) {
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM dd');
}

export function Timeline({ events }: TimelineProps) {
  if (events.length === 0) {
    return <p className="text-sm text-text-muted py-4">No timeline events yet.</p>;
  }

  const grouped = events.reduce((acc, event) => {
    const label = formatDateLabel(event.timestamp);
    if (!acc[label]) acc[label] = [];
    acc[label].push(event);
    return acc;
  }, {} as Record<string, TimelineEvent[]>);

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([date, items]) => (
        <div key={date}>
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">{date}</h4>
          <div className="space-y-4 border-l-2 border-border ml-2 pl-5">
            {items.map((event) => (
              <div key={event.id} className="relative">
                <div className="absolute -left-[1.65rem] top-1.5 w-2.5 h-2.5 rounded-full bg-surface-elevated border-2 border-border" />
                <p className="text-sm font-medium text-text-primary">{event.title}</p>
                <p className="text-sm text-text-secondary mt-0.5">{event.description}</p>
                {event.actor && (
                  <p className="text-xs text-text-muted mt-1">by {event.actor}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
