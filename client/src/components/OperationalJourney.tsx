import type { OperationalStep } from '../types';
import { Check, Circle, Ban } from 'lucide-react';
import clsx from 'clsx';

interface OperationalJourneyProps {
  steps: OperationalStep[];
}

export function OperationalJourney({ steps }: OperationalJourneyProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-0">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center">
          <div className={clsx(
            'flex items-center gap-2 px-3 py-2 rounded-md text-sm',
            step.completed && 'bg-success-bg text-success',
            step.current && 'bg-accent-subtle text-accent ring-1 ring-accent/30',
            step.blocked && 'bg-surface text-text-muted opacity-50',
            !step.completed && !step.current && !step.blocked && 'bg-surface text-text-muted'
          )}>
            {step.completed ? <Check size={14} /> : step.blocked ? <Ban size={14} /> : <Circle size={14} />}
            <span className="font-medium whitespace-nowrap">{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className="hidden sm:block w-6 h-px bg-border mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}
