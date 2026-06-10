import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { usePostHog } from 'posthog-react-native';
import { supabase } from './supabase';
import {
  isGuestActive,
  getLocalProfile,
  startGuest,
  endGuest,
  LocalProfile,
} from './local';

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
  isGuest: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

const localToProfile = (lp: LocalProfile): Profile => ({
  id: 'guest',
  email: null,
  full_name: lp.full_name,
  fitness_level: lp.fitness_level,
  body_weight_kg: lp.body_weight_kg,
  weekly_goal: lp.weekly_goal,
  onboarding_completed: lp.onboarding_completed,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const posthog = usePostHog();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  // Mirror of `isGuest` readable inside the (stale-closure) auth-state listener.
  const isGuestRef = useRef(false);
  useEffect(() => {
    isGuestRef.current = isGuest;
  }, [isGuest]);

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
    if (uid) {
      setUserId(uid);
      await loadProfile(uid);
      posthog.identify(uid, {
        $set: { email: data.session?.user.email ?? null },
      });
    } else if (await isGuestActive()) {
      setIsGuest(true);
      setProfile(localToProfile(await getLocalProfile()));
    }
    setLoading(false);
  }, [loadProfile, posthog]);

  useEffect(() => {
    init();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user.id ?? null;
      if (uid) {
        setIsGuest(false);
        setUserId(uid);
        loadProfile(uid);
        posthog.identify(uid, {
          $set: { email: session?.user.email ?? null },
        });
      } else if (event === 'SIGNED_OUT') {
        // Don't clobber a guest session that init() established.
        setUserId(null);
        if (!isGuestRef.current) setProfile(null);
      }
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [init, loadProfile, posthog]);

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
      posthog.identify(uid, {
        $set: { email: email.trim(), name: fullName },
        $set_once: { first_sign_up_date: new Date().toISOString() },
      });
    }
  };

  const continueAsGuest = async () => {
    await startGuest();
    setProfile(localToProfile(await getLocalProfile()));
    setIsGuest(true);
  };

  const signOut = async () => {
    posthog.reset();
    if (isGuest) {
      await endGuest();
      setIsGuest(false);
    } else {
      await supabase.auth.signOut();
    }
    setProfile(null);
    setUserId(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) throw error;
  };

  const refreshProfile = async () => {
    if (isGuest) setProfile(localToProfile(await getLocalProfile()));
    else if (userId) await loadProfile(userId);
  };

  return (
    <AuthContext.Provider
      value={{
        userId,
        profile,
        isGuest,
        loading,
        signIn,
        signUp,
        continueAsGuest,
        signOut,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
