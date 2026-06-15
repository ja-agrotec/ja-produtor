// Helpers de limite de plano. Roda no client (com RLS protegendo
// a leitura de planos/usuarios) e no /admin pra exibir contagens.

import { getSupabase } from "@/lib/supabase";

export type Plano = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  max_fazendas: number | null; // null = ilimitado
};

export type StatusLimite = {
  plano: Plano | null;
  usado: number;
  limite: number | null;
  podeCriar: boolean;
  motivo?: string;
};

// Conta fazendas ativas criadas pelo usuario logado.
// usuarios.id != auth.users.id, entao pegamos primeiro o usuarios.id.
export async function statusLimiteFazendas(
  authUserId: string,
): Promise<StatusLimite> {
  const sb = getSupabase();

  // 1) Pega usuarios.id + plano_id desse auth user
  const rU = await sb
    .from("usuarios")
    .select("id, plano_id")
    .eq("auth_id", authUserId)
    .maybeSingle();

  if (rU.error || !rU.data) {
    return {
      plano: null,
      usado: 0,
      limite: null,
      podeCriar: false,
      motivo: "Usuario nao encontrado",
    };
  }

  const usuarioId = rU.data.id;
  const planoId = rU.data.plano_id;

  // 2) Pega o plano
  let plano: Plano | null = null;
  if (planoId) {
    const rP = await sb
      .from("planos")
      .select("id, codigo, nome, descricao, max_fazendas")
      .eq("id", planoId)
      .maybeSingle();
    if (!rP.error && rP.data) plano = rP.data as Plano;
  }

  // 3) Conta fazendas criadas por esse usuario
  const rF = await sb
    .from("fazendas")
    .select("id", { count: "exact", head: true })
    .eq("ativo", true)
    .eq("criado_por", usuarioId);

  const usado = rF.count ?? 0;
  const limite = plano?.max_fazendas ?? null;
  const podeCriar = limite === null || usado < limite;

  return {
    plano,
    usado,
    limite,
    podeCriar,
    motivo: podeCriar
      ? undefined
      : `Limite do plano ${plano?.nome || "atual"} atingido (${usado}/${limite}). Faca upgrade.`,
  };
}

export async function listarPlanos(): Promise<Plano[]> {
  const sb = getSupabase();
  const r = await sb
    .from("planos")
    .select("id, codigo, nome, descricao, max_fazendas")
    .eq("ativo", true)
    .order("ordem");
  if (r.error) return [];
  return (r.data || []) as Plano[];
}

export function formatarLimite(plano: Plano | null): string {
  if (!plano) return "Sem plano";
  if (plano.max_fazendas === null) return "ilimitado";
  return `${plano.max_fazendas} fazenda(s)`;
}
