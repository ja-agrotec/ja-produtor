"use client";

// Qualidade (visão simplificada por cultura).
// Portado de modules/admin-qualidade.js.
//
// DECISÃO: os módulos legados admin-qualidade.js e admin-qualidade-lotes.js
// operam ambos sobre a tabela qualidade_registro. Esta página é uma visão
// READ-ONLY agrupada por cultura, com limiares de alerta hardcoded.
// CRUD completo fica em /qualidade-lotes.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import type { Fazenda, QualidadeRegistro, Safra } from "@/lib/types";
import { fmtData } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import KpiCard from "@/components/ui/KpiCard";

type LimiarParam = {
  k: string;
  l: string;
  un: string;
  alertaAcima?: number;
  alertaAbaixo?: number;
};

const LIMIARES: Record<string, LimiarParam[]> = {
  cafe: [
    { k: "umidade", l: "Umidade", un: "%", alertaAcima: 12 },
    { k: "bebida", l: "Bebida", un: "pts", alertaAbaixo: 80 },
    { k: "defeitos", l: "Defeitos", un: "d/300g", alertaAcima: 360 },
    { k: "peneira", l: "Peneira", un: "" },
    { k: "tipo", l: "Tipo", un: "" },
  ],
  soja: [
    { k: "umidade", l: "Umidade", un: "%", alertaAcima: 14 },
    { k: "impureza", l: "Impurezas", un: "%", alertaAcima: 1 },
    { k: "proteina", l: "Proteína", un: "%", alertaAbaixo: 36 },
    { k: "oleo", l: "Óleo", un: "%", alertaAbaixo: 18 },
  ],
  milho: [
    { k: "umidade", l: "Umidade", un: "%", alertaAcima: 14 },
    { k: "ardidos", l: "Ardidos", un: "%", alertaAcima: 6 },
    { k: "quebrados", l: "Quebrados", un: "%", alertaAcima: 6 },
    { k: "ph", l: "PH (kg)", un: "kg", alertaAbaixo: 72 },
  ],
  cana: [
    { k: "atr", l: "ATR", un: "kg/t", alertaAbaixo: 120 },
    { k: "brix", l: "Brix", un: "%", alertaAbaixo: 16 },
    { k: "pol", l: "Pol", un: "%", alertaAbaixo: 14 },
    { k: "fibra", l: "Fibra", un: "%", alertaAcima: 14 },
  ],
};

const CULTURAS_INFO = [
  { v: "cafe", n: "Café", icon: "☕", cor: "#4e342e" },
  { v: "soja", n: "Soja", icon: "🌱", cor: "#2d7d32" },
  { v: "milho", n: "Milho", icon: "🌽", cor: "#f9a825" },
  { v: "cana", n: "Cana", icon: "🎋", cor: "#1565c0" },
];

export default function QualidadePage() {
  const [carregando, setCarregando] = useState(true);
  const [registros, setRegistros] = useState<QualidadeRegistro[]>([]);
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [safras, setSafras] = useState<Safra[]>([]);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    const sb = getSupabase();
    const [rReg, rFaz, rSaf] = await Promise.all([
      sb
        .from("qualidade_registro")
        .select("*")
        .order("data_registro", { ascending: false }),
      sb.from("fazendas").select("id,nome").eq("ativo", true),
      sb.from("safras").select("id,nome,cultura,ano_agricola"),
    ]);
    setRegistros((rReg.data || []) as QualidadeRegistro[]);
    setFazendas((rFaz.data || []) as Fazenda[]);
    setSafras((rSaf.data || []) as Safra[]);
    setCarregando(false);
  }

  const fazMap = useMemo(() => {
    const m: Record<string, string> = {};
    fazendas.forEach((f) => (m[f.id] = f.nome));
    return m;
  }, [fazendas]);

  const safMap = useMemo(() => {
    const m: Record<string, Safra> = {};
    safras.forEach((s) => (m[s.id] = s));
    return m;
  }, [safras]);

  const porCultura = useMemo(() => {
    const grupos: Record<string, QualidadeRegistro[]> = {};
    registros.forEach((r) => {
      const c = (r.cultura || "outros").toLowerCase();
      if (!grupos[c]) grupos[c] = [];
      grupos[c].push(r);
    });
    return grupos;
  }, [registros]);

  function checarAlerta(r: QualidadeRegistro, p: LimiarParam): boolean {
    const v = r.dados_qualidade?.[p.k];
    if (v === undefined || v === null || v === "") return false;
    const num = typeof v === "number" ? v : parseFloat(v);
    if (isNaN(num)) return false;
    if (p.alertaAcima !== undefined && num > p.alertaAcima) return true;
    if (p.alertaAbaixo !== undefined && num < p.alertaAbaixo) return true;
    return false;
  }

  function totalAlertas(culturaKey: string): number {
    const params = LIMIARES[culturaKey] || [];
    const recs = porCultura[culturaKey] || [];
    let count = 0;
    recs.forEach((r) => {
      params.forEach((p) => {
        if (checarAlerta(r, p)) count++;
      });
    });
    return count;
  }

  const totalRegistros = registros.length;
  const totalAlertasGeral = useMemo(
    () => CULTURAS_INFO.reduce((s, c) => s + totalAlertas(c.v), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [registros],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Qualidade"
        icone="🏆"
        subtitulo="Visão consolidada por cultura · alertas e parâmetros chave"
        acoes={
          <Link href="/qualidade-lotes" className="btn-primary">
            Gerenciar lotes →
          </Link>
        }
      />

      <div className="grid-cards">
        <KpiCard
          rotulo="Registros Totais"
          valor={totalRegistros}
          icone="📋"
          accent="green"
        />
        <KpiCard
          rotulo="Alertas Geral"
          valor={totalAlertasGeral}
          icone="⚠️"
          accent={totalAlertasGeral > 0 ? "red" : "green"}
        />
        {CULTURAS_INFO.map((c) => (
          <KpiCard
            key={c.v}
            rotulo={c.n}
            valor={porCultura[c.v]?.length || 0}
            icone={c.icon}
            accent="blue"
            hint={`${totalAlertas(c.v)} alerta(s)`}
          />
        ))}
      </div>

      {carregando ? (
        <p style={{ color: "var(--muted)" }}>Carregando registros...</p>
      ) : totalRegistros === 0 ? (
        <EmptyState
          icone="🏆"
          titulo="Sem registros de qualidade"
          descricao="Cadastre análises em Qualidade de Lotes."
          acao={
            <Link href="/qualidade-lotes" className="btn-primary">
              Ir para Qualidade de Lotes
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {CULTURAS_INFO.map((c) => {
            const recs = porCultura[c.v] || [];
            if (recs.length === 0) return null;
            const params = LIMIARES[c.v] || [];
            return (
              <section key={c.v}>
                <div
                  className="flex items-center gap-3 pb-2 mb-3"
                  style={{ borderBottom: `2px solid ${c.cor}` }}
                >
                  <span style={{ fontSize: 22 }}>{c.icon}</span>
                  <h2 style={{ color: c.cor, margin: 0 }}>{c.n}</h2>
                  <span className="badge badge-info">{recs.length} registro(s)</span>
                  {totalAlertas(c.v) > 0 && (
                    <span className="badge badge-danger">⚠ {totalAlertas(c.v)} alerta(s)</span>
                  )}
                </div>

                <div className="grid-cards-lg">
                  {recs.slice(0, 12).map((r) => {
                    const dq = r.dados_qualidade || {};
                    const safra = safMap[r.safra_id || ""];
                    return (
                      <div
                        key={r.id}
                        className="card"
                        style={{ borderLeft: `3px solid ${c.cor}` }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-sm">
                              {safra?.nome || dq._lote_ref || "Sem identificação"}
                            </div>
                            <div className="text-xs" style={{ color: "var(--muted)" }}>
                              {fazMap[r.fazenda_id] || "—"} · {fmtData(r.data_registro)}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {params.map((p) => {
                            const v = dq[p.k];
                            if (v === undefined || v === null || v === "") return null;
                            const alerta = checarAlerta(r, p);
                            return (
                              <div
                                key={p.k}
                                className="p-2 rounded-ja"
                                style={{
                                  background: alerta ? "rgba(229,57,53,.08)" : "#f0f7eb",
                                }}
                              >
                                <div className="text-caps">{p.l}</div>
                                <div
                                  className="font-bold text-sm"
                                  style={{ color: alerta ? "#e53935" : c.cor }}
                                >
                                  {v} {p.un}
                                  {alerta ? " ⚠" : ""}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {r.observacoes && (
                          <div
                            className="text-xs mt-2 p-2 rounded-ja"
                            style={{
                              background: "#fafafa",
                              fontStyle: "italic",
                              color: "var(--muted)",
                            }}
                          >
                            {r.observacoes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
