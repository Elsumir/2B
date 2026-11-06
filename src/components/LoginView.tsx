import React, { useState } from 'react';
import { useAuth, TEST_ACCOUNTS } from '../context/AuthContext';
import { Building2, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { signIn, quickLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Заполните email и пароль');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const { error: err } = await signIn(email.trim(), password);
      if (err) {
        setError('Неверный email или пароль');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ошибка при авторизации');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (key: 'manager' | 'worker1' | 'worker2') => {
    setError(null);
    setLoading(true);
    try {
      await quickLogin(key);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="text-center">
          <div className="w-11 h-11 rounded bg-slate-900 border border-slate-800 text-slate-200 flex items-center justify-center mx-auto shadow-md mb-3">
            <Building2 size={24} />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Строй-CRM</h1>
          <p className="mt-1 text-xs text-slate-400">
            Система учета объектов и контроля строительных задач
          </p>
        </div>

        {/* Login Card */}
        <div className="mt-6 bg-white py-6 px-6 sm:px-7 shadow-xl rounded-lg border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {error && (
              <div className="flex items-start gap-2 p-2.5 bg-rose-50 border border-rose-300 rounded text-rose-800 text-xs">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail size={15} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.ru"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 placeholder:text-slate-400 transition-all font-sans"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Пароль</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={15} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 placeholder:text-slate-400 transition-all font-sans"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-4 rounded text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-xs transition-all disabled:opacity-50"
            >
              <span>{loading ? 'Вход в систему...' : 'Войти'}</span>
              <ArrowRight size={14} />
            </button>
          </form>

          {/* Quick-Test Buttons for reviewers */}
          <div className="mt-5 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold mb-2 uppercase tracking-wider font-mono">
              <UserCheck size={13} className="text-slate-700" />
              <span>Быстрый вход для проверки:</span>
            </div>

            <div className="space-y-1.5">
              {/* Manager */}
              <button
                type="button"
                onClick={() => handleQuickLogin('manager')}
                disabled={loading}
                className="w-full text-left p-2 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{TEST_ACCOUNTS.manager.person}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-200 text-slate-800 rounded font-semibold">
                      Постановщик
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">{TEST_ACCOUNTS.manager.email}</div>
                </div>
                <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-900 transition-colors">→</span>
              </button>

              {/* Worker 1 */}
              <button
                type="button"
                onClick={() => handleQuickLogin('worker1')}
                disabled={loading}
                className="w-full text-left p-2 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{TEST_ACCOUNTS.worker1.person}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-200 text-slate-800 rounded font-semibold">
                      Исполнитель 1
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">{TEST_ACCOUNTS.worker1.email}</div>
                </div>
                <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-900 transition-colors">→</span>
              </button>

              {/* Worker 2 */}
              <button
                type="button"
                onClick={() => handleQuickLogin('worker2')}
                disabled={loading}
                className="w-full text-left p-2 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{TEST_ACCOUNTS.worker2.person}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-200 text-slate-800 rounded font-semibold">
                      Исполнитель 2
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">{TEST_ACCOUNTS.worker2.email}</div>
                </div>
                <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-900 transition-colors">→</span>
              </button>
            </div>
          </div>

          {/* Security Note */}
          <div className="mt-4 pt-3 flex items-center gap-1.5 text-[10px] text-slate-400 border-t border-slate-100 font-mono">
            <ShieldCheck size={12} className="text-slate-500 shrink-0" />
            <span>Открытая регистрация отключена (Требование безопасности 3.5).</span>
          </div>
        </div>
      </div>
    </div>
  );
};
