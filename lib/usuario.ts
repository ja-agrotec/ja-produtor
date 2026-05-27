// Helpers para identificar o usuario logado no Supabase (auth) e
// resolver seu registro correspondente em public.usuarios

"use client";
import { getSupabase } from "./supabase";
import type { Usuario } from "./types";

export async function getUsuarioAtual(): Promise<Usuario | null> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("usuarios")
    .select("*")
    .eq("auth_id", user.id)
    .maybeSingle();
  return (data as Usuario | null) || null;
}
