import React, { useState, useEffect, useRef } from 'react';
import { useAuth, TEST_ACCOUNTS } from '../context/AuthContext';
import { Building2, CheckSquare, LogOut, ArrowLeftRight, ChevronDown, Briefcase } from 'lucide-react';

interface NavbarProps {
  currentTab: 'objects' | 'tasks';
  onTabChange: (tab: 'objects' | 'tasks') => void;
  onSelectObject?: (objectId: string | null) => void;
}

export const Navbar: React.FC<NavbarProps> = React.memo(({ currentTab, onTabChange, onSelectObject }) => {
  const { profile, isManager, signOut, quickLogin } = useAuth();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!switcherOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [switcherOpen]);

  const handleTabClick = (tab: 'objects' | 'tasks') => {
    if (onSelectObject) onSelectObject(null);
    onTabChange(tab);
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left Brand + Navigation */}
          <div className="flex items-center gap-6">
            <div
              className="flex items-center gap-2.5 cursor-pointer select-none"
              onClick={() => handleTabClick('objects')}
            >
              <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
                <Building2 size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-white leading-none">Строй-CRM</span>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase mt-0.5">Объекты & Задачи</span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex items-center space-x-1">
              <button
                onClick={() => handleTabClick('objects')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  currentTab === 'objects'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Building2 size={14} />
                <span>Объекты</span>
              </button>

              <button
                onClick={() => handleTabClick('tasks')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  currentTab === 'tasks'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <CheckSquare size={14} />
                <span>{isManager ? 'Все задачи' : 'Мои задачи'}</span>
              </button>
            </nav>
          </div>

          {/* Right User Actions & Quick Switcher */}
          <div className="flex items-center gap-2">
            {/* Quick Account Switcher dropdown with outside click detection */}
            <div className="relative" ref={switcherRef}>
              <button
                onClick={() => setSwitcherOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors border border-slate-700"
                title="Переключение тестовой учетной записи"
              >
                <ArrowLeftRight size={12} className="text-slate-400" />
                <span className="hidden sm:inline">Сменить роль</span>
                <ChevronDown size={12} className="text-slate-400" />
              </button>

              {switcherOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white text-slate-900 rounded-lg shadow-xl border border-slate-200 py-1 z-50 text-xs animate-in fade-in"
                  onClick={() => setSwitcherOpen(false)}
                >
                  <div className="px-3 py-1.5 font-semibold text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-100">
                    Быстрое переключение учетной записи:
                  </div>

                  <button
                    onClick={() => quickLogin('manager')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex flex-col transition-colors border-l-2 border-transparent hover:border-slate-900"
                  >
                    <span className="font-semibold text-slate-900">Постановщик: Алексей Смирнов</span>
                    <span className="text-[11px] text-slate-500">{TEST_ACCOUNTS.manager.email} (Видит всё)</span>
                  </button>

                  <button
                    onClick={() => quickLogin('worker1')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex flex-col transition-colors border-l-2 border-transparent hover:border-slate-900"
                  >
                    <span className="font-semibold text-slate-900">Исполнитель 1: Иван Петров</span>
                    <span className="text-[11px] text-slate-500">{TEST_ACCOUNTS.worker1.email} (3 объекта)</span>
                  </button>

                  <button
                    onClick={() => quickLogin('worker2')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex flex-col transition-colors border-l-2 border-transparent hover:border-slate-900"
                  >
                    <span className="font-semibold text-slate-900">Исполнитель 2: Сергей Васильев</span>
                    <span className="text-[11px] text-slate-500">{TEST_ACCOUNTS.worker2.email} (1 объект)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Current User Badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="flex flex-col text-right">
                <span className="text-xs font-semibold text-white leading-tight">
                  {profile?.full_name || 'Пользователь'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium flex items-center justify-end gap-1">
                  <Briefcase size={10} />
                  <span>{isManager ? 'Постановщик' : 'Исполнитель'}</span>
                </span>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={signOut}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors ml-1"
              title="Выйти"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
});

Navbar.displayName = 'Navbar';
