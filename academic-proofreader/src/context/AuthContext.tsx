"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isCloudEnabled } from "@/lib/supabase/client";

interface AuthContextValue {
  /** false when Supabase env vars are absent → app runs in local mode. */
  cloudEnabled: boolean;
  supabase: SupabaseClient | null;
  session: Session | null;
  userId: string | null;
  userEmail: string | null;
  /** Access token for Authorization headers on API routes (or null). */
  accessToken: string | null;
  authLoading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const cloudEnabled = isCloudEnabled();
  const supabase = getSupabaseBrowserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(cloudEnabled);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setSession(data.session);
        setAuthLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setAuthLoading(false);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      if (!supabase) return "Supabase is not configured.";
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? error.message : null;
    },
    [supabase]
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      if (!supabase) return "Supabase is not configured.";
      const { error } = await supabase.auth.signUp({ email, password });
      return error ? error.message : null;
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      cloudEnabled,
      supabase,
      session,
      userId: session?.user?.id ?? null,
      userEmail: session?.user?.email ?? null,
      accessToken: session?.access_token ?? null,
      authLoading,
      signIn,
      signUp,
      signOut,
    }),
    [cloudEnabled, supabase, session, authLoading, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider.");
  return ctx;
}
