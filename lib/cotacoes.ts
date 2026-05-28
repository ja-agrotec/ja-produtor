// Helper de leitura de cotacoes diarias.
// Usado pela /home e (futuramente) /ia-operacional.
"use client";

import { getSupabase } from "./supabase";

export type CotacaoExterna = {
  cultura: string;
  preco_saca: number;
  data: string;
  praca: string | null;
  fonte: string;
  variacao_pct: number | null;
};

/**
 * Le a view v_cotacoes_ultimas — uma row por cultura, a mais recente.
 */
export async function lerUltimasCotacoes(): Promise<CotacaoExterna[]> {
  const sb = getSupabase();
  const r = await sb
    .from("v_cotacoes_ultimas")
    .select("cultura, preco_saca, data, praca, fonte, variacao_pct");
  if (r.error || !r.data) return [];
  return r.data as CotacaoExterna[];
}
