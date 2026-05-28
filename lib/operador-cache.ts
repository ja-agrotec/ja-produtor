// ============================================================
// Cache local do Operador (PWA /operador) — offline-first.
//
// Mantem em localStorage tudo o que o operador precisa pra fazer
// lancamentos sem internet:
//   - perfil dele (operador_id, fazenda_id, nome)
//   - listas de referencia: fazenda, talhoes, safras, categorias,
//     insumos, maquinas, operadores
//
// Quando volta online: re-baixa diffs (linhas com atualizado_em maior
// que a ultima sync) e mescla com o cache local.
// ============================================================
"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Fazenda, Talhao, Safra, Categoria, Insumo, Maquina, Operador, Usuario,
} from "./types";

export type PerfilOperador = {
  usuario_id: string;        // public.usuarios.id
  auth_id: string;            // auth.users.id (sessao)
  operador_id?: string | null;
  nome: string;
  fazenda_id: string;
  email: string;
};

export type ReferenciasCache = {
  perfil: PerfilOperador | null;
  fazenda: Fazenda | null;
  talhoes: Talhao[];
  safras: Safra[];
  categorias: Categoria[];
  insumos: Insumo[];
  maquinas: Maquina[];
  operadores: Operador[];
  ultima_sync: string | null;
};

const LS_KEY = "op_referencias_cache_v1";

const VAZIO: ReferenciasCache = {
  perfil: null,
  fazenda: null,
  talhoes: [],
  safras: [],
  categorias: [],
  insumos: [],
  maquinas: [],
  operadores: [],
  ultima_sync: null,
};

export function lerCache(): ReferenciasCache {
  if (typeof window === "undefined") return VAZIO;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return VAZIO;
    return { ...VAZIO, ...(JSON.parse(raw) as ReferenciasCache) };
  } catch {
    return VAZIO;
  }
}

function salvarCache(c: ReferenciasCache) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(c));
}

export function limparCache() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LS_KEY);
}

/**
 * Bootstrap: chamado a primeira vez que o operador loga.
 * Baixa todos os dados de referencia da fazenda dele.
 */
export async function bootstrap(sb: SupabaseClient, authUserId: string): Promise<ReferenciasCache | null> {
  // 1. Resolve perfil do operador
  const { data: usr } = await sb
    .from("usuarios")
    .select("*")
    .eq("auth_id", authUserId)
    .maybeSingle();
  const u = usr as Usuario | null;
  if (!u) return null;
  if (!u.fazenda_id) {
    throw new Error("Operador sem fazenda atribuida. Peca ao produtor pra vincular sua conta a uma fazenda.");
  }

  // Tenta achar operadores.cpf == usuarios.cpf (heuristica simples). Senao deixa null.
  let operador_id: string | null = null;
  // (omitido por enquanto — manda lancamentos com operador_id=null. Produtor pode
  // vincular depois.)

  const perfil: PerfilOperador = {
    usuario_id: u.id,
    auth_id: u.auth_id || authUserId,
    operador_id,
    nome: u.nome,
    fazenda_id: u.fazenda_id,
    email: u.email,
  };

  return sincronizarReferencias(sb, perfil);
}

/**
 * Sync (re-baixa tudo). Idempotente. Chame quando voltar online.
 */
export async function sincronizarReferencias(
  sb: SupabaseClient,
  perfil: PerfilOperador,
): Promise<ReferenciasCache> {
  const fid = perfil.fazenda_id;

  const [rFaz, rTal, rSaf, rCat, rIns, rMaq, rOp] = await Promise.all([
    sb.from("fazendas").select("*").eq("id", fid).maybeSingle(),
    sb.from("talhoes").select("*").eq("ativo", true).eq("fazenda_id", fid).order("nome"),
    sb.from("safras").select("*").eq("fazenda_id", fid).order("nome"),
    sb.from("categorias_lancamento").select("*").eq("ativo", true).order("nome"),
    sb.from("insumos").select("*").eq("ativo", true).order("nome"),
    sb.from("maquinas").select("*").eq("ativo", true).order("nome"),
    sb.from("operadores").select("*").eq("ativo", true).eq("fazenda_id", fid).order("nome"),
  ]);

  // insumos: globais OR da fazenda
  const insumosFiltrados = (rIns.data || []).filter((i: any) => i.global || !i.fazenda_id || i.fazenda_id === fid);
  // maquinas: da fazenda OR globais
  const maquinasFiltradas = (rMaq.data || []).filter((m: any) => !m.fazenda_id || m.fazenda_id === fid);

  const cache: ReferenciasCache = {
    perfil,
    fazenda: (rFaz.data as Fazenda) || null,
    talhoes: (rTal.data || []) as Talhao[],
    safras: (rSaf.data || []) as Safra[],
    categorias: (rCat.data || []) as Categoria[],
    insumos: insumosFiltrados as Insumo[],
    maquinas: maquinasFiltradas as Maquina[],
    operadores: (rOp.data || []) as Operador[],
    ultima_sync: new Date().toISOString(),
  };
  salvarCache(cache);
  return cache;
}

/**
 * Util pra encontrar entidade no cache (perf: sem chamar Supabase).
 */
export function acharNoCache<T extends { id: string }>(lista: T[], id: string | null | undefined): T | undefined {
  if (!id) return undefined;
  return lista.find((x) => x.id === id);
}
