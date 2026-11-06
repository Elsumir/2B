import React from 'react';
import { TaskStatus, STATUS_LABELS, STATUS_COLORS } from '../types/crm';

interface StatusBadgeProps {
  status: TaskStatus;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = React.memo(({ status, size = 'md', showDot = true }) => {
  const label = STATUS_LABELS[status] || status;
  const config = STATUS_COLORS[status] || STATUS_COLORS.new;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 tracking-tight',
    md: 'text-xs px-2.5 py-0.5 font-medium tracking-tight',
    lg: 'text-xs px-3 py-1 font-semibold tracking-wide uppercase',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-mono ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      )}
      <span className="font-sans">{label}</span>
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';
