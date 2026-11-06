import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/crm';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  quickLogin: (preset: 'manager' | 'worker1' | 'worker2') => Promise<void>;
  isManager: boolean;
  isExecutor: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const TEST_ACCOUNTS = {
  manager: {
    email: 'manager@test2b.ru',
    password: 'Password123!',
    roleName: 'Постановщик',
    person: 'Алексей Смирнов',
  },
  worker1: {
    email: 'worker1@test2b.ru',
    password: 'Password123!',
    roleName: 'Исполнитель 1',
    person: 'Иван Петров (Электрик)',
  },
  worker2: {
    email: 'worker2@test2b.ru',
    password: 'Password123!',
    roleName: 'Исполнитель 2',
    person: 'Сергей Васильев (Отделочник)',
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Prevent duplicate concurrent profile fetches
  const fetchingUserIdRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    if (fetchingUserIdRef.current === userId) return;
    fetchingUserIdRef.current = userId;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error('Exception fetching profile:', err);
      setProfile(null);
    } finally {
      fetchingUserIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Single source of truth: listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      return { error };
    }
    if (data.user) {
      await fetchProfile(data.user.id);
    }
    setLoading(false);
    return { error: null };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setLoading(false);
  }, []);

  const quickLogin = useCallback(async (preset: 'manager' | 'worker1' | 'worker2') => {
    const creds = TEST_ACCOUNTS[preset];
    await signIn(creds.email, creds.password);
  }, [signIn]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  const isManager = profile?.role === 'manager';
  const isExecutor = profile?.role === 'executor';

  // Memoize context value to prevent unnecessary re-renders across all consumer components
  const contextValue = useMemo<AuthContextType>(() => ({
    user,
    profile,
    loading,
    signIn,
    signOut,
    quickLogin,
    isManager,
    isExecutor,
    refreshProfile,
  }), [user, profile, loading, signIn, signOut, quickLogin, isManager, isExecutor, refreshProfile]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
