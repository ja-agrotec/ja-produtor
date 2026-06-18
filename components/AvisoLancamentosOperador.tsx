"use client";

// Card sticky no /home que mostra lancamentos recentes feitos por
// operadores da fazenda - o admin/superadmin sabe na hora que houve
// movimentacao de campo sem precisar abrir /lancamentos.
//
// Logica:
//  - Le timestamp do "ultimo visto" no localStorage
//  - Busca lancamentos com usuario_id IN operadores da fazenda
//    criados depois desse timestamp (ou ultimas 24h se nunca viu)
//  - Mostra card destacado com count + lista ate 5
//  - Botao "Marcar como visto" salva timestamp atual e some
//  - Auto-refresh a cada 60s pra capturar novos sem reload

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { fmtBRL, fmtData } from "@/lib/format";

const LS_VISTO_EM = "ja_avisos_lancamentos_operador_visto_em";

type LancamentoRecente = {
  id: string;
  data_lancamento: string;
  descricao: string | null;
  custo_total: number | null;
  tipo: string;
  criado_em: string;
  fazenda_nome?: string;
  operador_nome?: string;
};

function lerVistoEm(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LS_VISTO_EM);
}

function dataLimitePadrao(): string {
  // Se user nunca marcou, busca ultimas 24h
  const d = new Date();
  d.setHours(d.getHours() - 24);
  return d.toISOString();
}

export default function AvisoLancamentosOperador() {
  const [lancs, setLancs] = useState<LancamentoRecente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [dispensandoIds, setDispensandoIds] = useState(false);

  const buscar = useCallback(async () => {
    const sb = getSupabase();
    // 1. Pega IDs de usuarios com role=operador (RLS limita aos da fazenda do admin)
    const rOps = await sb.from("usuarios").select("id, nome").eq("role", "operador").eq("ativo", true);
    if (rOps.error || !rOps.data || rOps.data.length === 0) {
      setLancs([]);
      setCarregando(false);
      return;
    }
    const opIds = rOps.data.map((u) => u.id);
    const opMap: Record<string, string> = {};
    rOps.data.forEach((u) => { opMap[u.id] = u.nome; });

    // 2. Busca lancamentos desses operadores apos timestamp visto
    const visto = lerVistoEm() || dataLimitePadrao();
    const rL = await sb
      .from("lancamentos")
      .select("id, data_lancamento, descricao, custo_total, tipo, criado_em, usuario_id, fazenda_id, fazendas(nome)")
      .in("usuario_id", opIds)
      .gt("criado_em", visto)
      .order("criado_em", { ascending: false })
      .limit(10);

    if (rL.error) {
      setLancs([]);
    } else {
      setLancs(
        (rL.data || []).map((l: any) => ({
          id: l.id,
          data_lancamento: l.data_lancamento,
          descricao: l.descricao,
          custo_total: l.custo_total,
          tipo: l.tipo,
          criado_em: l.criado_em,
          fazenda_nome: l.fazendas?.nome,
          operador_nome: opMap[l.usuario_id] || "?",
        })),
      );
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    void buscar();
    const t = setInterval(() => void buscar(), 60_000);
    return () => clearInterval(t);
  }, [buscar]);

  function marcarVisto() {
    setDispensandoIds(true);
    try {
      localStorage.setItem(LS_VISTO_EM, new Date().toISOString());
    } catch { /* ignore */ }
    setLancs([]);
    setDispensandoIds(false);
  }

  if (carregando) return null;
  if (lancs.length === 0) return null;

  return (
    <div
      className="card relative overflow-hidden"
      style={{
        borderLeft: "4px solid var(--green)",
        background: "linear-gradient(135deg, rgba(124,179,66,0.06) 0%, rgba(124,179,66,0.02) 100%)",
      }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 22 }}>🚜</span>
          <div>
            <h3 className="m-0" style={{ color: "var(--dark)" }}>
              {lancs.length} lancamento{lancs.length > 1 ? "s" : ""} do{lancs.length > 1 ? "s" : ""} operador{lancs.length > 1 ? "es" : ""}
            </h3>
            <p className="text-xs m-0" style={{ color: "var(--muted)" }}>
              Movimentacao recente do campo
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Link
            href="/lancamentos"
            className="text-xs"
            style={{ color: "var(--green)", fontWeight: 600 }}
          >
            Ver todos →
          </Link>
          <button
            onClick={marcarVisto}
            disabled={dispensandoIds}
            className="text-xs px-2 py-1 rounded"
            style={{ background: "var(--green-bg)", color: "var(--muted)", border: "1px solid var(--brd)" }}
          >
            ✓ Marcar como visto
          </button>
        </div>
      </div>

      <div className="space-y-1.5 mt-3">
        {lancs.slice(0, 5).map((l) => {
          const ehDespesa = l.tipo === "despesa";
          return (
            <div
              key={l.id}
              className="flex items-center justify-between py-2 px-2 rounded text-sm"
              style={{ background: "rgba(255,255,255,0.5)" }}
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate" style={{ color: "var(--text)" }}>
                  {l.descricao || "(sem descricao)"}
                </div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>
                  👤 {l.operador_nome} · {l.fazenda_nome || "—"} · {fmtData(l.data_lancamento)}
                </div>
              </div>
              <div
                className="text-sm font-bold whitespace-nowrap ml-2"
                style={{ color: ehDespesa ? "#e53935" : "#2d7d32" }}
              >
                {ehDespesa ? "−" : "+"}{fmtBRL(l.custo_total || 0)}
              </div>
            </div>
          );
        })}
        {lancs.length > 5 && (
          <div className="text-xs text-center pt-1" style={{ color: "var(--muted)" }}>
            + {lancs.length - 5} a mais — clique em &quot;Ver todos&quot; pra abrir
          </div>
        )}
      </div>
    </div>
  );
}
