import React, { useState, useMemo } from 'react';
import { ConstructionObject } from '../types/crm';
import { useAuth } from '../context/AuthContext';
import { ObjectCard } from './ObjectCard';
import { Building2, Plus } from 'lucide-react';

interface ObjectsListProps {
  objects: ConstructionObject[];
  loading: boolean;
  onSelectObject: (objectId: string) => void;
  onCreateObject: () => void;
  onEditObject: (object: ConstructionObject) => void;
  onDeleteObject: (object: ConstructionObject) => void;
}

export const ObjectsList: React.FC<ObjectsListProps> = React.memo(({
  objects,
  loading,
  onSelectObject,
  onCreateObject,
  onEditObject,
  onDeleteObject,
}) => {
  const { isManager, isExecutor } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Memoize search results to eliminate redundant filtering
  const filteredObjects = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return objects;
    return objects.filter(
      (obj) =>
        obj.name.toLowerCase().includes(term) ||
        obj.address.toLowerCase().includes(term)
    );
  }, [objects, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Строительные объекты</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isManager
              ? 'Учет площадок, адресов и задач строительных объектов'
              : 'Объекты, на которых вам поручено выполнение задач'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Поиск по названию или адресу..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 w-full sm:w-64"
          />

          {isManager && (
            <button
              onClick={onCreateObject}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-xs transition-colors shrink-0"
            >
              <Plus size={14} />
              <span>Добавить объект</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Objects */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-lg border border-slate-200 p-5 h-40 animate-pulse" />
          ))}
        </div>
      ) : filteredObjects.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center max-w-md mx-auto">
          <div className="w-10 h-10 rounded bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <Building2 size={20} />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Объекты не найдены</h3>
          <p className="text-xs text-slate-500 mt-1">
            {searchTerm
              ? 'По запросу ничего не найдено.'
              : isExecutor
              ? 'На текущий момент у вас нет назначенных задач ни на одном объекте.'
              : 'В базе пока нет объектов. Добавьте первый объект.'}
          </p>
          {isManager && !searchTerm && (
            <button
              onClick={onCreateObject}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium shadow-xs transition-colors"
            >
              <Plus size={14} />
              <span>Создать объект</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredObjects.map((obj) => (
            <ObjectCard
              key={obj.id}
              object={obj}
              isManager={isManager}
              onSelect={onSelectObject}
              onEdit={onEditObject}
              onDelete={onDeleteObject}
            />
          ))}
        </div>
      )}
    </div>
  );
});

ObjectsList.displayName = 'ObjectsList';
