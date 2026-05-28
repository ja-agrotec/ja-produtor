// ============================================================
// Helpers compartilhados pro modulo offline (lancamentos)
// - enfileirar: salva 1 item na fila localStorage
// - lerFila / tamanhoFila: leitura
// - sincronizar (granular): tenta cada item, mantem so os com erro
// - emConexaoReal: ping ao proprio dominio (mais confiavel que navigator.onLine)
// - eventos custom pra UI reativa entre paginas
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { LS_OFFLINE_QUEUE } from "./utils";

export const EVT_QUEUE_CHANGED = "ja:offline-queue-changed";
export const EVT_CONNECTION_CHANGED = "ja:connection-changed";
export const LS_ULTIMA_SYNC = "ja_agro_offline_ultima_sync";

export type OfflineItem = {
  tabela?: string;
  payload?: any;
  status?: string;
  criado_em?: string;
  modulo?: string;
  tipo?: string;
  descricao?: string;
  categoria?: string;
  valor?: number | string;
  [k: string]: any;
};

export function lerFila(): OfflineItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_OFFLINE_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function tamanhoFila(): number {
  return lerFila().length;
}

export function salvarFila(fila: OfflineItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_OFFLINE_QUEUE, JSON.stringify(fila));
  window.dispatchEvent(new CustomEvent(EVT_QUEUE_CHANGED, { detail: { size: fila.length } }));
}

export function enfileirar(item: OfflineItem) {
  if (typeof window === "undefined") return;
  const fila = lerFila();
  const enriquecido: OfflineItem = {
    ...item,
    criado_em: item.criado_em || new Date().toISOString(),
    status: "pendente",
  };
  fila.push(enriquecido);
  salvarFila(fila);
}

export function removerDaFila(idx: number) {
  const fila = lerFila();
  if (idx < 0 || idx >= fila.length) return;
  fila.splice(idx, 1);
  salvarFila(fila);
}

export function limparFila() {
  salvarFila([]);
}

/**
 * Sincroniza fila GRANULAR (1 insert por item).
 * - Sucessos saem da fila.
 * - Erros ficam com status='erro: <msg>' na fila.
 * Retorna { ok, erros }.
 */
export async function sincronizar(sb: SupabaseClient): Promise<{ ok: number; erros: number }> {
  const fila = lerFila();
  if (fila.length === 0) return { ok: 0, erros: 0 };

  let ok = 0;
  let erros = 0;
  const restante: OfflineItem[] = [];

  for (const item of fila) {
    const tabela = item.tabela || "lancamentos";
    let payload = item.payload || { ...item };
    if (!item.payload) {
      // Strip metadata interna de fila do payload inlined
      delete (payload as any).criado_em;
      delete (payload as any).status;
      delete (payload as any).tabela;
      delete (payload as any).modulo;
    }
    const r = await sb.from(tabela).insert(payload);
    if (r.error) {
      erros++;
      restante.push({ ...item, status: "erro: " + r.error.message });
    } else {
      ok++;
    }
  }

  salvarFila(restante);
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_ULTIMA_SYNC, new Date().toISOString());
  }
  return { ok, erros };
}

/**
 * Verifica conexao REAL com o backend via HEAD ao manifest.webmanifest
 * (asset estatico leve, sempre disponivel se o dominio estiver alcancavel).
 * Retorna true se conseguiu resposta (qualquer 2xx/3xx), false em network error.
 */
export async function emConexaoReal(timeoutMs = 5000): Promise<boolean> {
  if (typeof window === "undefined") return true;
  if (!navigator.onLine) return false;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch("/manifest.webmanifest", {
      method: "HEAD",
      cache: "no-store",
      signal: ctrl.signal,
    });
    return r.ok || r.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function ultimaSincronizacao(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LS_ULTIMA_SYNC);
}
