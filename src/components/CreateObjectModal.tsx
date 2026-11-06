import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Building2, AlertCircle } from 'lucide-react';
import { ConstructionObject } from '../types/crm';

interface CreateObjectModalProps {
  isOpen: boolean;
  objectToEdit?: ConstructionObject | null;
  onClose: () => void;
  onSubmit: (data: { name: string; address: string }) => Promise<void>;
}

export const CreateObjectModal: React.FC<CreateObjectModalProps> = ({
  isOpen,
  objectToEdit,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
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

  useEffect(() => {
    if (objectToEdit) {
      setName(objectToEdit.name);
      setAddress(objectToEdit.address);
    } else {
      setName('');
      setAddress('');
    }
    setError(null);
  }, [objectToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Название объекта обязательно');
      return;
    }
    if (!address.trim()) {
      setError('Адрес объекта обязателен');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), address: address.trim() });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ошибка при сохранении объекта');
      }
    } finally {
      setSubmitting(false);
    }
  };

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
            <Building2 size={16} className="text-slate-700" />
            <h3 className="font-semibold text-slate-900 text-sm">
              {objectToEdit ? 'Редактировать объект' : 'Новый строительный объект'}
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
              Название объекта <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="например: ЖК «Северные Высоты»"
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 placeholder:text-slate-400 font-sans"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Адрес стройки <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="например: г. Москва, ул. Полярная, д. 28, корп. 1"
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
              {submitting ? 'Сохранение...' : objectToEdit ? 'Сохранить изменения' : 'Создать объект'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};
