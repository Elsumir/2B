import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckSquare, AlertCircle } from 'lucide-react';
import { ConstructionObject, Task, UserProfile } from '../types/crm';
import { supabase } from '../lib/supabase';

interface CreateTaskModalProps {
  isOpen: boolean;
  defaultObjectId?: string;
  taskToEdit?: Task | null;
  objects: ConstructionObject[];
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    object_id: string;
    executor_id: string | null;
  }) => Promise<void>;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  defaultObjectId,
  taskToEdit,
  objects,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [objectId, setObjectId] = useState('');
  const [executorId, setExecutorId] = useState('');
  const [executors, setExecutors] = useState<UserProfile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lock body scroll and close on Escape key while modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  // Load available executors (profiles with role = 'executor')
  useEffect(() => {
    if (isOpen) {
      supabase
        .from('profiles')
        .select('*')
        .eq('role', 'executor')
        .then(({ data, error: err }) => {
          if (!err && data) {
            setExecutors(data);
          }
        });
    }
  }, [isOpen]);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description);
      setObjectId(taskToEdit.object_id);
      setExecutorId(taskToEdit.executor_id || '');
    } else {
      setTitle('');
      setDescription('');
      setObjectId(defaultObjectId || (objects.length > 0 ? objects[0].id : ''));
      setExecutorId('');
    }
    setError(null);
  }, [taskToEdit, defaultObjectId, objects, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Название задачи обязательно');
      return;
    }
    if (!objectId) {
      setError('Выберите объект стройки');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        object_id: objectId,
        executor_id: executorId || null,
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ошибка при сохранении задачи');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const modalNode = (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-14 px-4 pb-8 overflow-y-auto bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-lg w-full shadow-2xl border border-slate-300 overflow-hidden shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <CheckSquare size={16} className="text-slate-700" />
            <h3 className="font-semibold text-slate-900 text-sm">
              {taskToEdit ? 'Редактировать задачу' : 'Новая задача по объекту'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && (
            <div className="flex items-start gap-2 p-2.5 bg-rose-50 border border-rose-300 rounded text-rose-800 text-xs">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Название задачи <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="например: Монтаж вводного распределительного щита"
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 placeholder:text-slate-400 font-sans"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Строительный объект <span className="text-rose-600">*</span>
            </label>
            <select
              value={objectId}
              onChange={(e) => setObjectId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 bg-white"
            >
              <option value="">Выберите объект...</option>
              {objects.map((obj) => (
                <option key={obj.id} value={obj.id}>
                  {obj.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ответственный исполнитель
            </label>
            <select
              value={executorId}
              onChange={(e) => setExecutorId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 bg-white"
            >
              <option value="">Не назначен (назначить позже)</option>
              {executors.map((exec) => (
                <option key={exec.id} value={exec.id}>
                  {exec.full_name} ({exec.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Технические требования и описание
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Технические условия, чертежи, примечания..."
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 placeholder:text-slate-400 font-sans"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3.5 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded shadow-xs transition-colors disabled:opacity-50"
            >
              {submitting ? 'Сохранение...' : taskToEdit ? 'Сохранить изменения' : 'Создать задачу'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};
