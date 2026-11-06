import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageSquare, AlertCircle } from 'lucide-react';

interface ActionCommentModalProps {
  isOpen: boolean;
  title: string;
  actionButtonText: string;
  actionButtonVariant?: 'primary' | 'danger' | 'success';
  requireComment?: boolean;
  placeholder?: string;
  onClose: () => void;
  onSubmit: (comment: string) => Promise<void>;
}

export const ActionCommentModal: React.FC<ActionCommentModalProps> = ({
  isOpen,
  title,
  actionButtonText,
  actionButtonVariant = 'primary',
  requireComment = false,
  placeholder = 'Введите комментарий...',
  onClose,
  onSubmit,
}) => {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requireComment && !comment.trim()) {
      setError('Комментарий обязателен для этого действия');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(comment.trim());
      setComment('');
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Произошла ошибка при выполнении операции');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const buttonClasses = {
    primary: 'bg-slate-900 hover:bg-slate-800 text-white',
    danger: 'bg-rose-800 hover:bg-rose-900 text-white',
    success: 'bg-emerald-800 hover:bg-emerald-900 text-white',
  }[actionButtonVariant];

  const modalNode = (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-16 px-4 pb-8 overflow-y-auto bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-md w-full shadow-2xl border border-slate-300 overflow-hidden shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-slate-600" />
            <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && (
            <div className="flex items-start gap-2 p-2.5 bg-rose-50 border border-rose-300 rounded text-rose-800 text-xs">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Комментарий {requireComment ? <span className="text-rose-600">* (обязательно)</span> : <span className="text-slate-400 font-normal">(опционально)</span>}
            </label>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 placeholder:text-slate-400 font-sans"
              autoFocus
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
              className={`px-3.5 py-1.5 text-xs font-semibold rounded shadow-xs transition-colors disabled:opacity-50 ${buttonClasses}`}
            >
              {submitting ? 'Сохранение...' : actionButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};
