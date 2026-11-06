import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Calendar,
  User,
  Building2,
  Clock,
  Play,
  Send,
  CheckCircle,
  RotateCcw,
  Edit2,
  Trash2,
  History,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { Task, TaskHistoryItem, TaskStatus, STATUS_LABELS } from '../types/crm';
import { StatusBadge } from './StatusBadge';
import { ActionCommentModal } from './ActionCommentModal';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onTaskUpdated,
  onEditTask,
  onDeleteTask,
}) => {
  const { user, isManager, isExecutor } = useAuth();
  const [history, setHistory] = useState<TaskHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // Revision comment modal state
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [optionalCommentModal, setOptionalCommentModal] = useState<{
    isOpen: boolean;
    targetStatus: TaskStatus;
    title: string;
    variant: 'primary' | 'success';
    buttonText: string;
  } | null>(null);

  // Prevent background body scroll and close on Escape key when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          // If a nested comment modal is open, let that close instead
          if (isRevisionModalOpen || optionalCommentModal) {
            return;
          }
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose, isRevisionModalOpen, optionalCommentModal]);

  const fetchHistory = async (taskId: string) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('task_history')
        .select(`
          id,
          task_id,
          user_id,
          from_status,
          to_status,
          comment,
          created_at,
          user:profiles!task_history_user_id_fkey(full_name, email, role)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching task history:', error);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setHistory((data as any) || []);
      }
    } catch (err) {
      console.error('Exception fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (task && isOpen) {
      fetchHistory(task.id);
      setActionError(null);
    }
  }, [task?.id, isOpen]);

  if (!isOpen || !task) return null;

  const isAssignedExecutor = isExecutor && task.executor_id === user?.id;

  // Execute transition via secure RPC
  const handleStatusTransition = async (newStatus: TaskStatus, comment?: string) => {
    setActionError(null);
    setIsChangingStatus(true);
    try {
      const { error } = await supabase.rpc('change_task_status', {
        p_task_id: task.id,
        p_new_status: newStatus,
        p_comment: comment || null,
      });

      if (error) {
        throw error;
      }

      await fetchHistory(task.id);
      onTaskUpdated();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError('Не удалось изменить статус задачи');
      }
    } finally {
      setIsChangingStatus(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const modalNode = (
    <>
      <div
        className="fixed inset-0 z-40 flex items-start justify-center pt-8 sm:pt-12 px-4 pb-6 overflow-y-auto bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        onClick={onClose}
      >
        {/* Rigid spatial fixation: pinned top at pt-8/12, fixed h-[620px] max-h-[calc(100vh-4rem)] preventing any twitching/jumping */}
        <div
          className="bg-white rounded-lg max-w-2xl w-full h-[620px] max-h-[calc(100vh-4rem)] shadow-2xl border border-slate-300 overflow-hidden flex flex-col shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar - Fixed height */}
          <div className="h-14 px-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <StatusBadge status={task.status} size="lg" />
              {task.object && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-600 font-medium bg-white px-2 py-0.5 rounded border border-slate-200">
                  <Building2 size={12} className="text-slate-400" />
                  {task.object.name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {isManager && (
                <>
                  {onEditTask && (
                    <button
                      onClick={() => onEditTask(task)}
                      className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
                      title="Редактировать"
                    >
                      <Edit2 size={15} />
                    </button>
                  )}
                  {onDeleteTask && (
                    <button
                      onClick={() => onDeleteTask(task)}
                      className="p-1 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                      title="Удалить"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </>
              )}
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Main Body - Scrollable inside fixed frame */}
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {/* Title & Description */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-snug">{task.title}</h2>
              <p className="mt-1.5 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                {task.description || <span className="text-slate-400 italic">Описание не указано</span>}
              </p>
            </div>

            {/* Error Message if Action Failed */}
            {actionError && (
              <div className="flex items-start gap-2 p-2.5 bg-rose-50 border border-rose-300 rounded-md text-rose-800 text-xs shrink-0">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold">Отклонено базой данных:</div>
                  <div className="mt-0.5">{actionError}</div>
                </div>
              </div>
            )}

            {/* Meta Attributes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-slate-50 rounded-md border border-slate-200 text-xs shrink-0">
              <div className="flex items-center gap-2 text-slate-600">
                <User size={14} className="text-slate-400 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Исполнитель</span>
                  <span className="font-medium text-slate-900">
                    {task.executor ? task.executor.full_name : <span className="text-amber-700 font-medium">Не назначен</span>}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-600">
                <Building2 size={14} className="text-slate-400 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Объект</span>
                  <span className="font-medium text-slate-900">{task.object?.name || '—'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-600">
                <Calendar size={14} className="text-slate-400 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Дата создания</span>
                  <span className="font-medium text-slate-900 font-mono text-[11px]">{formatDate(task.created_at)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-600">
                <Clock size={14} className="text-slate-400 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Обновлено</span>
                  <span className="font-medium text-slate-900 font-mono text-[11px]">{formatDate(task.updated_at)}</span>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS (STRICTLY ACCORDING TO ROLE & STATUS MACHINE) */}
            <div className="p-3 bg-slate-100 rounded-md border border-slate-200 space-y-1.5 shrink-0">
              <div className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                <span>Доступные действия:</span>
                <span className="text-[11px] font-normal text-slate-500 font-mono">
                  {isManager ? 'Роль: Постановщик' : isAssignedExecutor ? 'Роль: Исполнитель' : 'Действия недоступны'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {/* 1. Executor: 'new' -> 'in_progress' */}
                {isAssignedExecutor && task.status === 'new' && (
                  <button
                    onClick={() => handleStatusTransition('in_progress')}
                    disabled={isChangingStatus}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
                  >
                    <Play size={14} />
                    <span>Взять в работу</span>
                  </button>
                )}

                {/* 2. Executor: 'in_progress' -> 'under_review' */}
                {isAssignedExecutor && task.status === 'in_progress' && (
                  <button
                    onClick={() =>
                      setOptionalCommentModal({
                        isOpen: true,
                        targetStatus: 'under_review',
                        title: 'Отправить задачу на проверку постановщику',
                        variant: 'primary',
                        buttonText: 'Отправить на проверку',
                      })
                    }
                    disabled={isChangingStatus}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
                  >
                    <Send size={14} />
                    <span>Отправить на проверку</span>
                  </button>
                )}

                {/* 3. Executor: 'revision' -> 'in_progress' */}
                {isAssignedExecutor && task.status === 'revision' && (
                  <button
                    onClick={() => handleStatusTransition('in_progress')}
                    disabled={isChangingStatus}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
                  >
                    <Play size={14} />
                    <span>Взять повторно в работу</span>
                  </button>
                )}

                {/* 4. Manager: 'under_review' -> 'completed' */}
                {isManager && task.status === 'under_review' && (
                  <button
                    onClick={() =>
                      setOptionalCommentModal({
                        isOpen: true,
                        targetStatus: 'completed',
                        title: 'Принять выполненную задачу',
                        variant: 'success',
                        buttonText: 'Принять задачу',
                      })
                    }
                    disabled={isChangingStatus}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
                  >
                    <CheckCircle size={14} />
                    <span>Принять задачу</span>
                  </button>
                )}

                {/* 5. Manager: 'under_review' -> 'revision' (MANDATORY COMMENT!) */}
                {isManager && task.status === 'under_review' && (
                  <button
                    onClick={() => setIsRevisionModalOpen(true)}
                    disabled={isChangingStatus}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-800 hover:bg-rose-900 text-white rounded text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
                  >
                    <RotateCcw size={14} />
                    <span>Вернуть на доработку</span>
                  </button>
                )}

                {/* No actions available notice */}
                {((!isManager && !isAssignedExecutor) ||
                  (isManager && task.status !== 'under_review') ||
                  (isAssignedExecutor && (task.status === 'under_review' || task.status === 'completed'))) && (
                  <span className="text-xs text-slate-500 italic py-0.5">
                    {task.status === 'completed'
                      ? '✓ Задача принята постановщиком.'
                      : task.status === 'under_review' && isAssignedExecutor
                      ? 'Ожидает проверки руководителем.'
                      : 'В текущем статусе нет доступных действий для вашей роли.'}
                  </span>
                )}
              </div>
            </div>

            {/* AUDIT TIMELINE (REQUIREMENT 2.4 & SECURITY 74) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <History size={14} className="text-slate-500" />
                  <span>История статусов и замечаний ({history.length})</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Неизменяемый журнал СУБД</span>
              </div>

              {loadingHistory ? (
                <div className="h-28 flex items-center justify-center text-xs text-slate-400 bg-slate-50 rounded border border-slate-100">
                  <span>Загрузка истории...</span>
                </div>
              ) : history.length === 0 ? (
                <div className="py-3 text-center text-xs text-slate-400 italic bg-slate-50 rounded">
                  История пуста
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item, idx) => (
                    <div key={item.id || idx} className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="font-medium text-slate-900">
                          <span>{item.user?.full_name || 'Система'}</span>
                          <span className="text-[10px] text-slate-500 font-normal ml-1">
                            ({item.user?.role === 'manager' ? 'Постановщик' : 'Исполнитель'})
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatDate(item.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-700">
                        {item.from_status ? (
                          <>
                            <span className="font-mono text-[11px] text-slate-600">{STATUS_LABELS[item.from_status]}</span>
                            <span className="text-slate-400 font-bold">→</span>
                            <span className="font-mono text-[11px] font-semibold text-slate-900">
                              {STATUS_LABELS[item.to_status]}
                            </span>
                          </>
                        ) : (
                          <span className="font-medium text-slate-800">
                            Создание задачи со статусом «{STATUS_LABELS[item.to_status]}»
                          </span>
                        )}
                      </div>

                      {item.comment && (
                        <div className="mt-1 flex items-start gap-1.5 p-2 bg-white rounded text-xs text-slate-800 border border-slate-200">
                          <MessageSquare size={13} className="text-slate-400 shrink-0 mt-0.5" />
                          <span className="italic">{item.comment}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer - Fixed height */}
          <div className="h-12 px-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-slate-100 rounded transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>

      {/* Mandatory Comment Modal when Returning to Revision */}
      <ActionCommentModal
        isOpen={isRevisionModalOpen}
        title="Возврат задачи на доработку"
        actionButtonText="Вернуть на доработку"
        actionButtonVariant="danger"
        requireComment={true}
        placeholder="Укажите конкретные замечания и что именно необходимо переделать..."
        onClose={() => setIsRevisionModalOpen(false)}
        onSubmit={async (comment) => {
          await handleStatusTransition('revision', comment);
        }}
      />

      {/* Optional Comment Modal for other actions */}
      {optionalCommentModal && (
        <ActionCommentModal
          isOpen={optionalCommentModal.isOpen}
          title={optionalCommentModal.title}
          actionButtonText={optionalCommentModal.buttonText}
          actionButtonVariant={optionalCommentModal.variant}
          requireComment={false}
          placeholder="Примечание к действию (опционально)..."
          onClose={() => setOptionalCommentModal(null)}
          onSubmit={async (comment) => {
            await handleStatusTransition(optionalCommentModal.targetStatus, comment);
          }}
        />
      )}
    </>
  );

  return createPortal(modalNode, document.body);
};
