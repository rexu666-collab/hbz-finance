import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (!error && data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        username,
      } as any);

      for (const cat of [
        { name: 'Maaş', type: 'income', color: '#10b981', icon: 'briefcase' },
        { name: 'Ek Gelir', type: 'income', color: '#3b82f6', icon: 'trending-up' },
        { name: 'Market', type: 'expense', color: '#f59e0b', icon: 'shopping-cart' },
        { name: 'Fatura', type: 'expense', color: '#ef4444', icon: 'zap' },
        { name: 'Ulaşım', type: 'expense', color: '#8b5cf6', icon: 'car' },
        { name: 'Sağlık', type: 'expense', color: '#ec4899', icon: 'heart' },
        { name: 'Eğlence', type: 'expense', color: '#06b6d4', icon: 'film' },
        { name: 'Eğitim', type: 'expense', color: '#6366f1', icon: 'book-open' },
        { name: 'Yatırım', type: 'expense', color: '#84cc16', icon: 'bar-chart-2' },
      ]) {
        await supabase.from('categories').insert({
          user_id: data.user.id,
          ...cat,
          is_default: true,
        } as any);
      }
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
