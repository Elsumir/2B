import React from 'react';
import { Task } from '../types/crm';
import { StatusBadge } from './StatusBadge';
import { Building2, User, Calendar } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onSelect?: (task: Task) => void;
  showObject?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = React.memo(({
  task,
  onClick,
  onSelect,
  showObject = false,
}) => {
  const handleClick = React.useCallback(() => {
    if (onSelect) {
      onSelect(task);
    } else if (onClick) {
      onClick();
    }
  }, [onSelect, onClick, task]);

  const formattedDate = React.useMemo(() => {
    try {
      const d = new Date(task.created_at);
      return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return task.created_at;
    }
  }, [task.created_at]);

  return (
    <div
      onClick={handleClick}
      className="group bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-400 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-3"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-900 group-hover:text-slate-700 transition-colors line-clamp-2 leading-snug">
            {task.title}
          </h4>
          <StatusBadge status={task.status} size="sm" />
        </div>

        {task.description && (
          <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-3">
          {showObject && task.object && (
            <span className="inline-flex items-center gap-1 font-medium text-slate-700 truncate max-w-[130px]">
              <Building2 size={13} className="text-slate-400 shrink-0" />
              <span className="truncate">{task.object.name}</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1 text-slate-600">
            <User size={13} className="text-slate-400 shrink-0" />
            <span className="truncate max-w-[130px]">
              {task.executor ? task.executor.full_name : <span className="text-amber-700 font-medium">Не назначен</span>}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1 text-slate-400 shrink-0 text-[11px] font-mono">
          <Calendar size={12} />
          <span>{formattedDate}</span>
        </div>
      </div>
    </div>
  );
});

TaskCard.displayName = 'TaskCard';
