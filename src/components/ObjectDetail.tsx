import React, { useState, useMemo } from 'react';
import { ConstructionObject, Task, TaskStatus } from '../types/crm';
import { useAuth } from '../context/AuthContext';
import { TaskCard } from './TaskCard';
import { ArrowLeft, Building2, MapPin, Plus, CheckSquare } from 'lucide-react';

interface ObjectDetailProps {
  object: ConstructionObject;
  tasks: Task[];
  loading: boolean;
  onBack: () => void;
  onSelectTask: (task: Task) => void;
  onCreateTask: (objectId: string) => void;
}

export const ObjectDetail: React.FC<ObjectDetailProps> = React.memo(({
  object,
  tasks,
  loading,
  onBack,
  onSelectTask,
  onCreateTask,
}) => {
  const { isManager } = useAuth();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Memoize filtered tasks to optimize list rendering
  const filteredTasks = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return tasks.filter((t) => {
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesSearch =
        !term ||
        t.title.toLowerCase().includes(term) ||
        t.description.toLowerCase().includes(term) ||
        (t.executor && t.executor.full_name.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [tasks, statusFilter, searchTerm]);

  // Memoize status counts
  const statusCounts = useMemo(() => {
    return tasks.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [tasks]);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={13} />
          <span>К списку объектов</span>
        </button>
      </div>

      {/* Object Header Banner */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <span className="text-[10px] font-mono font-semibold tracking-wider text-slate-400 uppercase">
              Карточка объекта
            </span>
            <h2 className="text-xl font-bold text-slate-900 leading-snug">{object.name}</h2>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin size={13} className="text-slate-400 shrink-0" />
              <span>{object.address}</span>
            </div>
          </div>
        </div>

        {isManager && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onCreateTask(object.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-xs transition-colors shrink-0"
            >
              <Plus size={14} />
              <span>Создать задачу</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap text-xs ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Все ({tasks.length})
          </button>

          <button
            onClick={() => setStatusFilter('new')}
            className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap text-xs ${
              statusFilter === 'new'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Новые ({statusCounts['new'] || 0})
          </button>

          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap text-xs ${
              statusFilter === 'in_progress'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            В работе ({statusCounts['in_progress'] || 0})
          </button>

          <button
            onClick={() => setStatusFilter('under_review')}
            className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap text-xs ${
              statusFilter === 'under_review'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            На проверке ({statusCounts['under_review'] || 0})
          </button>

          <button
            onClick={() => setStatusFilter('revision')}
            className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap text-xs ${
              statusFilter === 'revision'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            На доработке ({statusCounts['revision'] || 0})
          </button>

          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap text-xs ${
              statusFilter === 'completed'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Приняты ({statusCounts['completed'] || 0})
          </button>
        </div>

        {/* Search */}
        <div>
          <input
            type="text"
            placeholder="Поиск по задачам..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-56 px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
          />
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-lg border border-slate-200 p-4 h-32 animate-pulse" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center max-w-md mx-auto">
          <div className="w-10 h-10 rounded bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <CheckSquare size={20} />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Задачи не найдены</h3>
          <p className="text-xs text-slate-500 mt-1">
            {searchTerm || statusFilter !== 'all'
              ? 'По выбранным фильтрам задачи отсутствуют.'
              : 'На этом объекте пока нет задач.'}
          </p>
          {isManager && (
            <button
              onClick={() => onCreateTask(object.id)}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus size={14} />
              <span>Создать задачу</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTasks.map((t) => (
            <TaskCard key={t.id} task={t} onSelect={onSelectTask} />
          ))}
        </div>
      )}
    </div>
  );
});

ObjectDetail.displayName = 'ObjectDetail';
