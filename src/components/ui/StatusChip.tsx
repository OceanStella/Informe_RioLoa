import { Check } from 'lucide-react';

interface StatusChipProps {
  status: 'ready' | 'pending' | 'error' | 'warning';
  label: string;
}

export function StatusChip({ status, label }: StatusChipProps) {
  return (
    <span className={`status-chip is-${status}`}>
      {status === 'ready' ? (
        <span className="status-icon" aria-hidden="true">
          <Check size={10} strokeWidth={3.25} />
        </span>
      ) : (
        <span className="status-dot" aria-hidden="true" />
      )}
      {label}
    </span>
  );
}
