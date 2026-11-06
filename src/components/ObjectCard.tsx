import React, { useCallback } from 'react';
import { ConstructionObject } from '../types/crm';
import { MapPin, CheckSquare, ChevronRight, Edit2, Trash2 } from 'lucide-react';

interface ObjectCardProps {
  object: ConstructionObject;
  isManager: boolean;
  onSelect: (objectId: string) => void;
  onEdit: (object: ConstructionObject) => void;
  onDelete: (object: ConstructionObject) => void;
}

export const ObjectCard: React.FC<ObjectCardProps> = React.memo(({
  object,
  isManager,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const handleSelect = useCallback(() => {
    onSelect(object.id);
  }, [onSelect, object.id]);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(object);
  }, [onEdit, object]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(object);
  }, [onDelete, object]);

  return (
    <div
      className="group bg-white rounded-lg border border-slate-200 hover:border-slate-400 hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden cursor-pointer"
      onClick={handleSelect}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Объект #{object.id.slice(0, 8)}
          </span>

          {isManager && (
            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100">
              <button
                onClick={handleEdit}
                className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                title="Редактировать"
              >
                <Edit2 size={13} />
              </button>
              <button
                onClick={handleDelete}
                className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                title="Удалить"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        <h3 className="mt-2 text-base font-bold text-slate-900 group-hover:text-slate-700 transition-colors line-clamp-1">
          {object.name}
        </h3>

        <div className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500 line-clamp-2">
          <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
          <span>{object.address}</span>
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
        <span className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
          <CheckSquare size={13} className="text-slate-400" />
          <span>Задач: {object.tasks_count ?? 0}</span>
        </span>

        <span className="inline-flex items-center gap-0.5 font-semibold text-slate-800 text-xs group-hover:translate-x-0.5 transition-transform">
          <span>Открыть</span>
          <ChevronRight size={13} />
        </span>
      </div>
    </div>
  );
});

ObjectCard.displayName = 'ObjectCard';
