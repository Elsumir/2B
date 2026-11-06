import React, { useState, useMemo } from 'react';
import { Task, TaskStatus, ConstructionObject } from '../types/crm';
import { useAuth } from '../context/AuthContext';
import { TaskCard } from './TaskCard';
import { CheckSquare, Plus } from 'lucide-react';

interface MyTasksViewProps {
  tasks: Task[];
  objects: ConstructionObject[];
  loading: boolean;
  onSelectTask: (task: Task) => void;
  onCreateTask?: () => void;
}

export const MyTasksView: React.FC<MyTasksViewProps> = React.memo(({
  tasks,
  objects,
  loading,
  onSelectTask,
  onCreateTask,
}) => {
  const { isManager } = useAuth();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [objectFilter, setObjectFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Memoize filtered tasks
  const filteredTasks = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return tasks.filter((t) => {
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesObject = objectFilter === 'all' || t.object_id === objectFilter;
      const matchesSearch =
        !term ||
        t.title.toLowerCase().includes(term) ||
        t.description.toLowerCase().includes(term) ||
        (t.object && t.object.name.toLowerCase().includes(term));
      return matchesStatus && matchesObject && matchesSearch;
    });
  }, [tasks, statusFilter, objectFilter, searchTerm]);

  // Memoize status counts
  const statusCounts = useMemo(() => {
    return tasks.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [tasks]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {isManager ? 'Все задачи строительных объектов' : 'Мои назначенные задачи'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isManager
              ? 'Контроль выполнения работ и статусов по всем объектам'
              : 'Задачи, где вы назначены ответственным исполнителем'}
          </p>
        </div>

        {isManager && onCreateTask && (
          <button
            onClick={onCreateTask}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-xs transition-colors shrink-0"
          >
            <Plus size={14} />
            <span>Создать задачу</span>
          </button>
        )}
      </div>


      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Status Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 text-xs">
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

          {/* Search + Object selector */}
          <div className="flex items-center gap-2">
            <select
              value={objectFilter}
              onChange={(e) => setObjectFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 max-w-[160px]"
            >
              <option value="all">Все объекты</option>
              {objects.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Поиск по задачам..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-52 px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Task Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
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
            {searchTerm || statusFilter !== 'all' || objectFilter !== 'all'
              ? 'По выбранным критериям задачи отсутствуют.'
              : 'У вас пока нет задач.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTasks.map((t) => (
            <TaskCard key={t.id} task={t} onSelect={onSelectTask} showObject={true} />
          ))}
        </div>
      )}
    </div>
  );
});

MyTasksView.displayName = 'MyTasksView';
