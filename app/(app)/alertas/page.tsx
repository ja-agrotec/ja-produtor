"use client";

// Central de alertas operacionais.
// Portado de modules/admin-alertas.js.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import type { Fazenda, Insumo, Maquina, Safra } from "@/lib/types";
import { fmt, fmtData, hoje } from "@/lib/format";
import { getFazendaSelecionada } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import KpiCard from "@/components/ui/KpiCard";
import EmptyState from "@/components/ui/EmptyState";
import FazendaSelector from "@/components/ui/FazendaSelector";

type Severidade = "alta" | "media" | "baixa";

type Alerta = {
  id: string;
  severidade: Severidade;
  categoria: string;
  icone: string;
  titulo: string;
  descricao: string;
  fazenda?: string;
  href: string;
};

const FILTROS = [
  { v: "", n: "Todos" },
  { v: "Estoque", n: "Estoque" },
  { v: "Máquinas", n: "Máquinas" },
  { v: "Safras", n: "Safras" },
  { v: "Sincronização", n: "Sincronização" },
];

export default function AlertasPage() {
  const [fazendaSel, setFazendaSel] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [alertas, setAlertas] = useState<Alerta[]>([]);

  useEffect(() => {
    setFazendaSel(getFazendaSelecionada());
    const onChange = (e: Event) => {
      const ev = e as CustomEvent<{ fazendaId: string | null }>;
      setFazendaSel(ev.detail?.fazendaId ?? null);
    };
    window.addEventListener("fazenda:changed", onChange);
    return () => window.removeEventListener("fazenda:changed", onChange);
  }, []);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fazendaSel]);

  async function carregar() {
    setCarregando(true);
    const sb = getSupabase();

    let qMaq = sb.from("maquinas").select("*").eq("ativo", true);
    let qSaf = sb.from("safras").select("*");
    let qOff = sb
      .from("lancamentos_offline")
      .select("id,fazenda_id,status", { count: "exact", head: false })
      .eq("status", "pendente");

    if (fazendaSel) {
      qMaq = qMaq.eq("fazenda_id", fazendaSel);
      qSaf = qSaf.eq("fazenda_id", fazendaSel);
    }

    const [rIns, rMaq, rSaf, rOff, rFaz] = await Promise.all([
      sb.from("insumos").select("*").eq("ativo", true),
      qMaq,
      qSaf,
      qOff,
      sb.from("fazendas").select("id,nome").eq("ativo", true),
    ]);

    const insumos = (rIns.data || []) as Insumo[];
    const maquinas = (rMaq.data || []) as Maquina[];
    const safras = (rSaf.data || []) as Safra[];
    const fazendas = (rFaz.data || []) as Pick<Fazenda, "id" | "nome">[];
    const offCount = rOff.count || 0;
    const fazMap: Record<string, string> = {};
    fazendas.forEach((f) => (fazMap[f.id] = f.nome));

    const today = hoje();
    const lista: Alerta[] = [];

    // Insumos abaixo do mínimo
    insumos.forEach((i) => {
      if ((i.estoque_minimo || 0) > 0 && (i.estoque_atual || 0) <= (i.estoque_minimo || 0)) {
        const zerado = (i.estoque_atual || 0) <= 0;
        lista.push({
          id: `ins-${i.id}`,
          severidade: zerado ? "alta" : "media",
          categoria: "Estoque",
          icone: "📦",
          titulo: zerado
            ? `Insumo zerado: ${i.nome}`
            : `Insumo abaixo do mínimo: ${i.nome}`,
          descricao: `Estoque atual: ${fmt(i.estoque_atual)} ${i.unidade || ""} · Mínimo: ${fmt(
            i.estoque_minimo,
          )} ${i.unidade || ""}`,
          href: "/insumos",
        });
      }
    });

    // Máquinas em manutenção / horímetro vencido
    maquinas.forEach((m) => {
      if (m.status === "manutencao") {
        lista.push({
          id: `maq-${m.id}-st`,
          severidade: "media",
          categoria: "Máquinas",
          icone: "🔧",
          titulo: `Máquina em manutenção: ${m.nome}`,
          descricao: "Status atual: em manutenção. Liberar ou concluir o reparo.",
          fazenda: fazMap[m.fazenda_id || ""] || undefined,
          href: "/maquinas",
        });
      }
      if (
        m.proxima_manutencao_h &&
        m.horimetro_atual &&
        m.horimetro_atual >= m.proxima_manutencao_h
      ) {
        lista.push({
          id: `maq-${m.id}-h`,
          severidade: "alta",
          categoria: "Máquinas",
          icone: "🔧",
          titulo: `Manutenção vencida: ${m.nome}`,
          descricao: `Horímetro ${fmt(m.horimetro_atual)}h ultrapassou previsão ${fmt(
            m.proxima_manutencao_h,
          )}h`,
          fazenda: fazMap[m.fazenda_id || ""] || undefined,
          href: "/maquinas",
        });
      }
    });

    // Safras vencidas (data_colheita < hoje sem encerrar)
    safras.forEach((s) => {
      if (
        s.data_colheita &&
        s.data_colheita <= today &&
        (s.status === "aberta" || s.status === "planejamento")
      ) {
        lista.push({
          id: `saf-${s.id}`,
          severidade: "media",
          categoria: "Safras",
          icone: "🌾",
          titulo: `Safra colhida sem fechamento: ${s.nome}`,
          descricao: `Cultura ${s.cultura} · Colheita prevista em ${fmtData(s.data_colheita)}`,
          fazenda: fazMap[s.fazenda_id] || undefined,
          href: "/safras",
        });
      }
    });

    // Lançamentos offline pendentes
    if (offCount > 0) {
      lista.push({
        id: "off-queue",
        severidade: "media",
        categoria: "Sincronização",
        icone: "🔄",
        titulo: `${offCount} lançamento(s) aguardando sincronização`,
        descricao: "Existem lançamentos offline pendentes de envio ao servidor.",
        href: "/offline",
      });
    }

    // Ordena por severidade
    const ord: Record<Severidade, number> = { alta: 0, media: 1, baixa: 2 };
    lista.sort((a, b) => ord[a.severidade] - ord[b.severidade]);
    setAlertas(lista);
    setCarregando(false);
  }

  const filtrados = useMemo(
    () => (filtro ? alertas.filter((a) => a.categoria === filtro) : alertas),
    [alertas, filtro],
  );

  const totAlta = useMemo(() => alertas.filter((a) => a.severidade === "alta").length, [alertas]);
  const totMedia = useMemo(() => alertas.filter((a) => a.severidade === "media").length, [alertas]);
  const totBaixa = useMemo(() => alertas.filter((a) => a.severidade === "baixa").length, [alertas]);

  function badgeClass(sev: Severidade) {
    if (sev === "alta") return "badge badge-danger";
    if (sev === "media") return "badge badge-warn";
    return "badge badge-info";
  }
  function corBorda(sev: Severidade) {
    if (sev === "alta") return "#e53935";
    if (sev === "media") return "#f57c00";
    return "#1565c0";
  }

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Central de Alertas"
        icone="🔔"
        subtitulo="Pendências operacionais consolidadas"
        acoes={
          <>
            <FazendaSelector onChange={(id) => setFazendaSel(id)} />
            <button className="btn-ghost" onClick={carregar} disabled={carregando}>
              🔄 Atualizar
            </button>
          </>
        }
      />

      <div className="grid-cards">
        <KpiCard rotulo="Críticos" valor={totAlta} icone="🚨" accent="red" />
        <KpiCard rotulo="Atenção" valor={totMedia} icone="⚠️" accent="orange" />
        <KpiCard rotulo="Informativos" valor={totBaixa} icone="ℹ️" accent="blue" />
        <KpiCard rotulo="Total" valor={alertas.length} icone="📋" accent="green" />
      </div>

      <div className="card flex flex-wrap gap-2 items-center">
        <span className="text-caps">Filtrar por:</span>
        {FILTROS.map((f) => (
          <button
            key={f.v}
            className={filtro === f.v ? "btn-primary" : "btn-ghost"}
            onClick={() => setFiltro(f.v)}
          >
            {f.n}
          </button>
        ))}
      </div>

      {carregando ? (
        <p style={{ color: "var(--muted)" }}>Carregando alertas...</p>
      ) : filtrados.length === 0 ? (
        <EmptyState
          icone="✅"
          titulo="Tudo em ordem!"
          descricao="Nenhum alerta operacional no momento."
        />
      ) : (
        <div className="grid-cards">
          {filtrados.map((a) => (
            <div
              key={a.id}
              className="card flex flex-col gap-2"
              style={{ borderLeft: `4px solid ${corBorda(a.severidade)}` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 22 }}>{a.icone}</span>
                  <span className="text-caps">{a.categoria}</span>
                </div>
                <span className={badgeClass(a.severidade)}>
                  {a.severidade === "alta" ? "Crítico" : a.severidade === "media" ? "Atenção" : "Info"}
                </span>
              </div>
              <div className="font-semibold text-sm" style={{ color: "var(--text)" }}>
                {a.titulo}
              </div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                {a.descricao}
              </div>
              <div
                className="flex items-center justify-between pt-2 border-t mt-1"
                style={{ borderColor: "var(--brd)" }}
              >
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  🏡 {a.fazenda || "Geral"}
                </span>
                <Link href={a.href} className="text-xs font-semibold" style={{ color: "#16a34a" }}>
                  Resolver →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
