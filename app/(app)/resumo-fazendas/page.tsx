"use client";

// Ranking comparativo de fazendas.
// Portado de modules/admin-resumo-fazendas.js.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import type { Fazenda, Insumo, Lancamento, Maquina, Safra, Talhao, VendaGraos } from "@/lib/types";
import { fmt, fmtBRL, fmtBRLShort, fmtInt, fmtPct } from "@/lib/format";
import { setFazendaSelecionada } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import KpiCard from "@/components/ui/KpiCard";
import EmptyState from "@/components/ui/EmptyState";

type ResumoFazenda = {
  fazenda: Fazenda;
  talhoes: number;
  safrasAtivas: number;
  safrasTotal: number;
  areaTalhoes: number;
  areaPlantada: number;
  despesa: number;
  receita: number;
  margem: number;
  roi: number;
  alertas: number;
  culturas: string[];
};

export default function ResumoFazendasPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [dados, setDados] = useState<ResumoFazenda[]>([]);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    const sb = getSupabase();
    const [rFaz, rTal, rSaf, rLan, rVen, rIns, rMaq] = await Promise.all([
      sb.from("fazendas").select("*").eq("ativo", true).order("nome"),
      sb.from("talhoes").select("id,fazenda_id,area_ha").eq("ativo", true),
      sb.from("safras").select("id,fazenda_id,status,cultura,area_ha,producao_sc"),
      sb.from("lancamentos").select("fazenda_id,tipo,custo_total"),
      sb.from("vendas_graos").select("fazenda_id,quantidade_sc,preco_saca"),
      sb.from("insumos").select("fazenda_id,estoque_atual,estoque_minimo").eq("ativo", true),
      sb
        .from("maquinas")
        .select("fazenda_id,horimetro_atual,proxima_manutencao_h")
        .eq("ativo", true),
    ]);

    const fazendas = (rFaz.data || []) as Fazenda[];
    const talhoes = (rTal.data || []) as Talhao[];
    const safras = (rSaf.data || []) as Safra[];
    const lan = (rLan.data || []) as Lancamento[];
    const ven = (rVen.data || []) as VendaGraos[];
    const ins = (rIns.data || []) as Insumo[];
    const maq = (rMaq.data || []) as Maquina[];

    const list: ResumoFazenda[] = fazendas.map((f) => {
      const tals = talhoes.filter((t) => t.fazenda_id === f.id);
      const safsAt = safras.filter(
        (s) => s.fazenda_id === f.id && s.status === "aberta",
      );
      const safsAll = safras.filter((s) => s.fazenda_id === f.id);
      const desp = lan
        .filter((l) => l.fazenda_id === f.id && l.tipo === "despesa")
        .reduce((s, l) => s + (l.custo_total || 0), 0);
      const rec = lan
        .filter((l) => l.fazenda_id === f.id && l.tipo === "receita")
        .reduce((s, l) => s + (l.custo_total || 0), 0);
      const recVen = ven
        .filter((v) => v.fazenda_id === f.id)
        .reduce((s, v) => s + (v.quantidade_sc || 0) * (v.preco_saca || 0), 0);
      const recTotal = rec + recVen;
      const margem = recTotal - desp;
      const roi = desp > 0 ? (margem / desp) * 100 : 0;
      const insCrit = ins.filter(
        (i) =>
          i.fazenda_id === f.id &&
          (i.estoque_minimo || 0) > 0 &&
          (i.estoque_atual || 0) <= (i.estoque_minimo || 0),
      ).length;
      const maqAlert = maq.filter(
        (m) =>
          m.fazenda_id === f.id &&
          m.proxima_manutencao_h &&
          m.horimetro_atual &&
          (m.horimetro_atual || 0) >= (m.proxima_manutencao_h || 0),
      ).length;

      return {
        fazenda: f,
        talhoes: tals.length,
        safrasAtivas: safsAt.length,
        safrasTotal: safsAll.length,
        areaTalhoes: tals.reduce((s, t) => s + (t.area_ha || 0), 0),
        areaPlantada: safsAt.reduce((s, x) => s + (x.area_ha || 0), 0),
        despesa: desp,
        receita: recTotal,
        margem,
        roi,
        alertas: insCrit + maqAlert,
        culturas: Array.from(
          new Set(safsAt.map((s) => s.cultura).filter(Boolean)),
        ) as string[],
      };
    });

    list.sort((a, b) => b.roi - a.roi);
    setDados(list);
    setCarregando(false);
  }

  const totFaz = dados.length;
  const totArea = useMemo(
    () => dados.reduce((s, d) => s + (d.fazenda.area_total_ha || 0), 0),
    [dados],
  );
  const totDesp = useMemo(() => dados.reduce((s, d) => s + d.despesa, 0), [dados]);
  const totRec = useMemo(() => dados.reduce((s, d) => s + d.receita, 0), [dados]);
  const totMargem = totRec - totDesp;
  const roiMedio = totDesp > 0 ? (totMargem / totDesp) * 100 : 0;

  function abrirFazenda(id: string) {
    setFazendaSelecionada(id);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("fazenda:changed", { detail: { fazendaId: id } }),
      );
    }
    router.push("/home");
  }

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Resumo das Fazendas"
        icone="📍"
        subtitulo="Ranking comparativo · ordenado por ROI"
      />

      <div className="grid-cards">
        <KpiCard rotulo="Fazendas Ativas" valor={totFaz} icone="🏡" accent="green" />
        <KpiCard
          rotulo="Área Total (ha)"
          valor={fmtInt(totArea)}
          icone="🌍"
          accent="blue"
        />
        <KpiCard
          rotulo="Custo Total"
          valor={fmtBRLShort(totDesp)}
          icone="💸"
          accent="red"
        />
        <KpiCard
          rotulo="Receita Total"
          valor={fmtBRLShort(totRec)}
          icone="💰"
          accent="green"
        />
        <KpiCard
          rotulo="ROI Médio"
          valor={`${roiMedio.toFixed(1)}%`}
          icone="🎯"
          accent={roiMedio >= 0 ? "blue" : "red"}
        />
      </div>

      {carregando ? (
        <p style={{ color: "var(--muted)" }}>Carregando fazendas...</p>
      ) : dados.length === 0 ? (
        <EmptyState
          icone="🏡"
          titulo="Nenhuma fazenda ativa"
          descricao="Cadastre fazendas para ver o comparativo."
          acao={
            <Link href="/fazendas" className="btn-primary">
              + Cadastrar fazenda
            </Link>
          }
        />
      ) : (
        <div className="grid-cards-lg">
          {dados.map((d, idx) => {
            const liderRoi = idx === 0 && d.roi > 0;
            const corMargem = d.margem > 0 ? "#16a34a" : d.margem < 0 ? "#e53935" : "#6b7280";
            return (
              <div
                key={d.fazenda.id}
                className="card flex flex-col gap-3"
                style={
                  liderRoi
                    ? { boxShadow: "0 4px 16px rgba(124,179,66,.25)", borderTop: "3px solid #7CB342" }
                    : undefined
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {liderRoi && (
                        <span className="badge badge-success">🥇 Mais rentável</span>
                      )}
                      <h3 className="truncate">{d.fazenda.nome}</h3>
                    </div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>
                      {d.fazenda.cidade || "—"}
                      {d.fazenda.estado ? ` / ${d.fazenda.estado}` : ""}
                      {d.fazenda.certificada ? " · 🏅 Certificada" : ""}
                    </div>
                  </div>
                  {d.alertas > 0 && (
                    <span className="badge badge-danger">⚠ {d.alertas}</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-ja" style={{ background: "#f0f7eb" }}>
                    <div className="text-caps">Área</div>
                    <div className="font-bold">
                      {fmtInt(d.fazenda.area_total_ha || d.areaTalhoes)} ha
                    </div>
                  </div>
                  <div className="p-2 rounded-ja" style={{ background: "#f0f7eb" }}>
                    <div className="text-caps">Talhões</div>
                    <div className="font-bold">{d.talhoes}</div>
                  </div>
                  <div className="p-2 rounded-ja" style={{ background: "#f0f7eb" }}>
                    <div className="text-caps">Safras</div>
                    <div className="font-bold">
                      {d.safrasAtivas} ativas / {d.safrasTotal}
                    </div>
                  </div>
                  <div className="p-2 rounded-ja" style={{ background: "#f0f7eb" }}>
                    <div className="text-caps">Área Plantada</div>
                    <div className="font-bold">{fmtInt(d.areaPlantada)} ha</div>
                  </div>
                </div>

                <div
                  className="text-xs p-2 rounded-ja"
                  style={{ background: "#fafafa", border: "1px dashed var(--brd)" }}
                >
                  <strong>Culturas:</strong>{" "}
                  {d.culturas.length ? d.culturas.join(", ") : "Sem safras ativas"}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-caps">Receita</div>
                    <div className="font-bold" style={{ color: "#2e7d32" }}>
                      {fmtBRLShort(d.receita)}
                    </div>
                  </div>
                  <div>
                    <div className="text-caps">Despesa</div>
                    <div className="font-bold" style={{ color: "#e53935" }}>
                      {fmtBRLShort(d.despesa)}
                    </div>
                  </div>
                </div>

                <div
                  className="p-2 rounded-ja flex items-center justify-between"
                  style={{
                    background:
                      d.margem >= 0 ? "rgba(124,179,66,.10)" : "rgba(229,57,53,.10)",
                  }}
                >
                  <div>
                    <div className="text-caps">Margem</div>
                    <div className="font-bold" style={{ color: corMargem, fontSize: 16 }}>
                      {fmtBRLShort(d.margem)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-caps">ROI</div>
                    <div className="font-bold" style={{ color: corMargem, fontSize: 16 }}>
                      {fmt(d.roi, 1)}%
                    </div>
                  </div>
                </div>

                <button className="btn-primary" onClick={() => abrirFazenda(d.fazenda.id)}>
                  Ver Home da Fazenda →
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
