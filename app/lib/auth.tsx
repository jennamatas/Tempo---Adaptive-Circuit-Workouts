import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  fitness_level: string;
  body_weight_kg: number;
  weekly_goal: number;
  onboarding_completed: boolean;
};

type AuthState = {
  userId: string | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (data) setProfile(data as Profile);
    else {
      // ensure a profile exists
      const { data: created } = await supabase
        .from('profiles')
        .upsert({ id: uid })
        .select()
        .single();
      if (created) setProfile(created as Profile);
    }
  }, []);

  const init = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id ?? null;
    setUserId(uid);
    if (uid) await loadProfile(uid);
    setLoading(false);
  }, [loadProfile]);

  useEffect(() => {
    init();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user.id ?? null;
      setUserId(uid);
      if (uid) loadProfile(uid);
      else setProfile(null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [init, loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;

    // Ensure we have an active session (some setups need an explicit sign-in)
    if (!data.session) {
      await supabase.auth.signInWithPassword({ email: email.trim(), password });
    }
    // Ensure profile row exists (trigger may not run on hosted setup)
    const uid = data.user?.id;
    if (uid) {
      await supabase.from('profiles').upsert({ id: uid, email: email.trim(), full_name: fullName });
      await loadProfile(uid);
      setUserId(uid);
    }
  };


  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUserId(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) throw error;
  };

  const refreshProfile = async () => {
    if (userId) await loadProfile(userId);
  };

  return (
    <AuthContext.Provider value={{ userId, profile, loading, signIn, signUp, signOut, resetPassword, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
