'use client';
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase, Profile, AdminRole } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { isAdminRole, normalizeRole } from '@/lib/admin-actions';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileReady: boolean;
  profileError: string | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileReady, setProfileReady] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    setProfileReady(false);
    setProfileError(null);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      setProfile(null);
      setProfileError(error.message);
    } else if (!data) {
      setProfile(null);
      setProfileError(
        'No profile found for this account. In Supabase, open the profiles table and ensure a row exists with id = your auth user id and role = owner or admin.'
      );
    } else {
      setProfile({ ...data, role: normalizeRole(data.role) as AdminRole });
    }
    setProfileReady(true);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchProfile(s.user.id);
      else {
        setProfile(null);
        setProfileReady(true);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchProfile(s.user.id);
      else {
        setProfile(null);
        setProfileReady(true);
        setProfileError(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    const { data: { session: s } } = await supabase.auth.getSession();
    if (s?.user) await fetchProfile(s.user.id);
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setProfileReady(true);
  };

  const refreshProfile = async () => {
    if (user?.id) await fetchProfile(user.id);
  };

  const isAdmin = isAdminRole(profile?.role);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        profileReady,
        profileError,
        isAdmin,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
