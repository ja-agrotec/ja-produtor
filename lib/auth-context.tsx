"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

interface AuthCtx { user: User | null; loading: boolean; }
const Ctx = createContext<AuthCtx>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    // getSession() le APENAS do localStorage - nao faz request HTTP.
    // Isso e crucial pra PWA offline: getUser() faria request a
    // Supabase, falharia sem rede, user=null, layout redirecionava
    // pra /login, /login nao esta no cache do SW = "Voce esta off-line".
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <Ctx.Provider value={{ user, loading }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
