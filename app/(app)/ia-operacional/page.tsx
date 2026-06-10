"use client";

// IA Operacional — primeiro tenta /api/ia-operacional (Claude Haiku).
// Se a API nao responder (sem key, fora do ar), cai pro fallback
// heuristico com regras hardcoded.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import type { Insumo, Lancamento, Safra, Talhao, VendaGraos } from "@/lib/types";
import { fmt, fmtBRL } from "@/lib/format";
import { getFazendaSelecionada, CULTURAS_PADRAO } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import KpiCard from "@/components/ui/KpiCard";
import EmptyState from "@/components/ui/EmptyState";
import FazendaSelector from "@/components/ui/FazendaSelector";

type Prioridade = "alta" | "media" | "baixa";

type Item = {
  id: string;
  icone: string;
  titulo: string;
  descricao: string;
  prioridade: Prioridade;
  acao: { label: string; href: string };
};

type Fonte = "ia" | "heuristica";

// Agrega dados em metricas enxutas pra mandar pro Claude sem
// estourar tokens. Cita so o que importa: producao, custo, vendas,
// estoque critico, talhoes ociosos.
function montarSnapshot(d: {
  lan: Lancamento[];
  saf: Safra[];
  ven: VendaGraos[];
  ins: Insumo[];
  tal: Talhao[];
  periodoMeses: string;
  cultura: string;
}) {
  const despesas = d.lan
    .filter((l) => l.tipo === "despesa")
    .reduce((s, l) => s + (l.custo_total || 0), 0);
  const receitas = d.lan
    .filter((l) => l.tipo === "receita")
    .reduce((s, l) => s + (l.custo_total || 0), 0);

  const safras = d.saf.map((s) => ({
    nome: s.nome,
    cultura: s.cultura,
    status: s.status,
    area_ha: s.area_ha,
    produtividade_sc_ha: s.produtividade_sc_ha,
    custo_total: s.custo_total,
    receita_total: s.receita_total,
    data_plantio: s.data_plantio,
    data_colheita: s.data_colheita,
  }));

  const vendas = d.ven.slice(0, 15).map((v) => ({
    cultura: v.cultura,
    quantidade_sc: v.quantidade_sc,
    preco_saca: v.preco_saca,
    valor_total: Number(v.quantidade_sc || 0) * Number(v.preco_saca || 0),
    status: v.status,
    data_contrato: v.data_contrato,
  }));

  const insumosCriticos = d.ins
    .filter((i) => (i.estoque_minimo || 0) > 0 && (i.estoque_atual || 0) <= (i.estoque_minimo || 0))
    .slice(0, 10)
    .map((i) => ({
      nome: i.nome,
      categoria: i.categoria,
      estoque_atual: i.estoque_atual,
      estoque_minimo: i.estoque_minimo,
      unidade: i.unidade,
    }));

  const talhoesSemCultura = d.tal.filter((t) => !t.cultura_atual).length;
  const areaOciosa = d.tal
    .filter((t) => !t.cultura_atual)
    .reduce((s, t) => s + (t.area_ha || 0), 0);

  return {
    filtros: { periodo_meses: d.periodoMeses, cultura: d.cultura || "todas" },
    totais: {
      despesas_periodo: Math.round(despesas),
      receitas_periodo: Math.round(receitas),
      lucro_periodo: Math.round(receitas - despesas),
      qtd_safras: d.saf.length,
      qtd_talhoes: d.tal.length,
      qtd_insumos_ativos: d.ins.length,
      talhoes_sem_cultura: talhoesSemCultura,
      area_ociosa_ha: Math.round(areaOciosa),
    },
    safras,
    vendas_recentes: vendas,
    insumos_em_alerta: insumosCriticos,
  };
}

async function tentarIA(snapshot: ReturnType<typeof montarSnapshot>): Promise<{
  oportunidades: any[];
  riscos: any[];
  acoes: any[];
  resumo?: string;
} | null> {
  try {
    const r = await fetch("/api/ia-operacional", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(snapshot),
    });
    if (!r.ok) return null;
    const d = await r.json();
    if (!d || !Array.isArray(d.oportunidades)) return null;
    return d;
  } catch {
    return null;
  }
}

const BENCH_PROD: Record<string, number> = {
  SOJA: 60,
  MILHO: 170,
  CAFÉ: 30,
  CANA: 1500,
};

export default function IaOperacionalPage() {
  const [fazendaSel, setFazendaSel] = useState<string | null>(null);
  const [cultura, setCultura] = useState("");
  const [periodoMeses, setPeriodoMeses] = useState("12");
  const [carregando, setCarregando] = useState(true);

  const [oportunidades, setOportunidades] = useState<Item[]>([]);
  const [riscos, setRiscos] = useState<Item[]>([]);
  const [acoes, setAcoes] = useState<Item[]>([]);
  const [fonte, setFonte] = useState<Fonte>("heuristica");
  const [resumoIA, setResumoIA] = useState<string>("");

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
  }, [fazendaSel, cultura, periodoMeses]);

  async function carregar() {
    setCarregando(true);
    const sb = getSupabase();

    const dataLimite = new Date();
    dataLimite.setMonth(dataLimite.getMonth() - parseInt(periodoMeses || "12"));
    const dataLimiteStr = dataLimite.toISOString().slice(0, 10);

    let qLanc = sb
      .from("lancamentos")
      .select("*")
      .gte("data_lancamento", dataLimiteStr);
    let qSaf = sb.from("safras").select("*");
    let qVen = sb
      .from("vendas_graos")
      .select("*")
      .order("data_contrato", { ascending: false })
      .limit(100);
    let qTal = sb.from("talhoes").select("*").eq("ativo", true);

    if (fazendaSel) {
      qLanc = qLanc.eq("fazenda_id", fazendaSel);
      qSaf = qSaf.eq("fazenda_id", fazendaSel);
      qVen = qVen.eq("fazenda_id", fazendaSel);
      qTal = qTal.eq("fazenda_id", fazendaSel);
    }
    if (cultura) {
      qSaf = qSaf.eq("cultura", cultura);
      qVen = qVen.eq("cultura", cultura);
      qTal = qTal.eq("cultura_atual", cultura);
    }

    const [rL, rS, rV, rI, rT] = await Promise.all([
      qLanc,
      qSaf,
      qVen,
      sb.from("insumos").select("*").eq("ativo", true),
      qTal,
    ]);
    const lan = (rL.data || []) as Lancamento[];
    const saf = (rS.data || []) as Safra[];
    const ven = (rV.data || []) as VendaGraos[];
    const ins = (rI.data || []) as Insumo[];
    const tal = (rT.data || []) as Talhao[];

    // Tenta IA real primeiro (snapshot enxuto pra nao estourar tokens)
    const snapshot = montarSnapshot({ lan, saf, ven, ins, tal, periodoMeses, cultura });
    const respIA = await tentarIA(snapshot);
    if (respIA) {
      const mapIA = (lista: any[], pad: string): Item[] =>
        (lista || []).map((it, i) => ({
          id: `ia-${pad}-${i}`,
          icone: it.icone || (pad === "op" ? "💡" : pad === "ri" ? "⚠️" : "🎯"),
          titulo: it.titulo,
          descricao: it.descricao,
          prioridade: it.prioridade,
          acao: it.acao || { label: "Abrir", href: "/dashboard" },
        }));
      setOportunidades(mapIA(respIA.oportunidades, "op"));
      setRiscos(mapIA(respIA.riscos, "ri"));
      setAcoes(mapIA(respIA.acoes, "ac"));
      setResumoIA(respIA.resumo || "");
      setFonte("ia");
      setCarregando(false);
      return;
    }

    // Fallback heuristico
    setFonte("heuristica");
    setResumoIA("");
    const oport: Item[] = [];
    const risc: Item[] = [];
    const ac: Item[] = [];

    // 1) Área ociosa: talhões sem safra ativa
    const safrasAtivasIds = new Set(
      saf.filter((s) => s.status === "aberta").map((s) => s.id),
    );
    const talhoesSemSafra = tal.filter((t) => !t.cultura_atual);
    if (talhoesSemSafra.length > 0) {
      const areaOciosa = talhoesSemSafra.reduce((s, t) => s + (t.area_ha || 0), 0);
      oport.push({
        id: "area-ociosa",
        icone: "🌱",
        titulo: `${talhoesSemSafra.length} talhão(ões) sem cultura definida`,
        descricao: `Total de ${fmt(areaOciosa, 0)} ha potencialmente ociosos. Considere planejar novo plantio.`,
        prioridade: "media",
        acao: { label: "Ver talhões", href: "/talhoes" },
      });
    }

    // 2) Volatilidade de preço: cultura com >20% std dev
    const venPorCult: Record<string, number[]> = {};
    ven.forEach((v) => {
      if (!v.cultura || !v.preco_saca) return;
      if (!venPorCult[v.cultura]) venPorCult[v.cultura] = [];
      venPorCult[v.cultura].push(v.preco_saca);
    });
    Object.entries(venPorCult).forEach(([c, prices]) => {
      if (prices.length < 3) return;
      const media = prices.reduce((a, b) => a + b, 0) / prices.length;
      const variancia =
        prices.reduce((a, b) => a + Math.pow(b - media, 2), 0) / prices.length;
      const std = Math.sqrt(variancia);
      const coef = media > 0 ? std / media : 0;
      if (coef > 0.2) {
        risc.push({
          id: `vol-${c}`,
          icone: "📉",
          titulo: `Alta volatilidade no preço de ${c}`,
          descricao: `Desvio padrão de ${fmtBRL(std)} (${(coef * 100).toFixed(1)}%) sobre média de ${fmtBRL(
            media,
          )}. Avalie travar preço.`,
          prioridade: "media",
          acao: { label: "Vendas de grãos", href: "/vendas-graos" },
        });
      }
      const ultimo = prices[0];
      if (ultimo > media * 1.05) {
        oport.push({
          id: `alta-${c}`,
          icone: "📈",
          titulo: `Preço de ${c} em alta`,
          descricao: `Último contrato ${fmtBRL(ultimo)}/sc · média ${fmtBRL(media)} (+${(
            (ultimo / media - 1) *
            100
          ).toFixed(1)}%). Oportunidade de venda.`,
          prioridade: "alta",
          acao: { label: "Registrar venda", href: "/vendas-graos" },
        });
      }
    });

    // 3) Estoque crítico
    const insCriticos = ins.filter(
      (i) =>
        (i.estoque_minimo || 0) > 0 &&
        (i.estoque_atual || 0) <= (i.estoque_minimo || 0),
    );
    const insZerados = insCriticos.filter((i) => (i.estoque_atual || 0) <= 0);
    if (insZerados.length > 0) {
      risc.push({
        id: "ins-zerado",
        icone: "⚠️",
        titulo: `${insZerados.length} insumo(s) zerado(s)`,
        descricao: `Itens críticos sem estoque: ${insZerados
          .slice(0, 3)
          .map((i) => i.nome)
          .join(", ")}${insZerados.length > 3 ? "..." : ""}`,
        prioridade: "alta",
        acao: { label: "Repor estoque", href: "/insumos" },
      });
    } else if (insCriticos.length > 0) {
      risc.push({
        id: "ins-baixo",
        icone: "📦",
        titulo: `${insCriticos.length} insumo(s) abaixo do mínimo`,
        descricao: "Reabastecer antes do próximo ciclo operacional.",
        prioridade: "media",
        acao: { label: "Ver insumos", href: "/insumos" },
      });
    }

    // 4) Concentração: 1 insumo > 40% do custo da safra
    const totalDesp = lan
      .filter((l) => l.tipo === "despesa")
      .reduce((s, l) => s + (l.custo_total || 0), 0);
    if (totalDesp > 0) {
      const porInsumo: Record<string, number> = {};
      lan
        .filter((l) => l.tipo === "despesa" && l.insumo_id)
        .forEach((l) => {
          porInsumo[l.insumo_id!] = (porInsumo[l.insumo_id!] || 0) + (l.custo_total || 0);
        });
      const top = Object.entries(porInsumo).sort((a, b) => b[1] - a[1])[0];
      if (top && top[1] / totalDesp > 0.4) {
        const nome = ins.find((i) => i.id === top[0])?.nome || "Insumo";
        risc.push({
          id: "concentr",
          icone: "📊",
          titulo: `Concentração elevada: ${nome}`,
          descricao: `Representa ${((top[1] / totalDesp) * 100).toFixed(
            1,
          )}% das despesas. Diversifique fornecedores ou revise contratos.`,
          prioridade: "media",
          acao: { label: "Insumos", href: "/insumos" },
        });
      }
    }

    // 5) Produtividade acima/abaixo do benchmark
    saf.forEach((s) => {
      const benchKey = (s.cultura || "").toUpperCase();
      const bench = BENCH_PROD[benchKey];
      if (!bench || !s.produtividade_sc_ha) return;
      if (s.produtividade_sc_ha > bench * 1.1) {
        oport.push({
          id: `prod-${s.id}`,
          icone: "🏆",
          titulo: `Safra ${s.nome} excepcional`,
          descricao: `Produtividade ${fmt(s.produtividade_sc_ha, 1)} sc/ha vs benchmark ${bench} sc/ha`,
          prioridade: "baixa",
          acao: { label: "Ver safra", href: "/safras" },
        });
      } else if (s.produtividade_sc_ha < bench * 0.85) {
        risc.push({
          id: `prod-low-${s.id}`,
          icone: "📉",
          titulo: `Produtividade baixa em ${s.nome}`,
          descricao: `${fmt(s.produtividade_sc_ha, 1)} sc/ha vs benchmark ${bench} sc/ha. Revise manejo.`,
          prioridade: "alta",
          acao: { label: "Ver safra", href: "/safras" },
        });
      }
    });

    // Ações prioritárias
    if (insZerados.length > 0) {
      ac.push({
        id: "ac-zerados",
        icone: "🚨",
        titulo: `Repor ${insZerados.length} insumo(s) zerado(s) urgentemente`,
        descricao: "Itens críticos podem comprometer próximas operações.",
        prioridade: "alta",
        acao: { label: "Repor agora", href: "/insumos" },
      });
    }
    if (talhoesSemSafra.length > 0) {
      ac.push({
        id: "ac-ocioso",
        icone: "🌱",
        titulo: `Definir cultura para ${talhoesSemSafra.length} talhão(ões)`,
        descricao: "Área ociosa reduzindo retorno potencial.",
        prioridade: "media",
        acao: { label: "Ver talhões", href: "/talhoes" },
      });
    }
    const today = new Date().toISOString().slice(0, 10);
    const safPend = saf.filter(
      (s) =>
        s.data_colheita &&
        s.data_colheita <= today &&
        (s.status === "aberta" || s.status === "planejamento"),
    );
    if (safPend.length > 0) {
      ac.push({
        id: "ac-fech",
        icone: "📈",
        titulo: `Fechar ${safPend.length} safra(s) já colhida(s)`,
        descricao: "Pendência de fechamento impacta análise de ROI.",
        prioridade: "alta",
        acao: { label: "Ir para safras", href: "/safras" },
      });
    }

    // Sort por prioridade
    const ord: Record<Prioridade, number> = { alta: 0, media: 1, baixa: 2 };
    const sortFn = (a: Item, b: Item) => ord[a.prioridade] - ord[b.prioridade];
    oport.sort(sortFn);
    risc.sort(sortFn);
    ac.sort(sortFn);

    setOportunidades(oport);
    setRiscos(risc);
    setAcoes(ac);
    setCarregando(false);
  }

  function badgeFor(p: Prioridade) {
    if (p === "alta") return "badge badge-danger";
    if (p === "media") return "badge badge-warn";
    return "badge badge-info";
  }

  function Card({ item }: { item: Item }) {
    const cor = item.prioridade === "alta" ? "#e53935" : item.prioridade === "media" ? "#f57c00" : "#1565c0";
    return (
      <div className="card flex flex-col gap-2" style={{ borderLeft: `4px solid ${cor}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 22 }}>{item.icone}</span>
          </div>
          <span className={badgeFor(item.prioridade)}>
            {item.prioridade === "alta"
              ? "Prioridade alta"
              : item.prioridade === "media"
                ? "Prioridade média"
                : "Prioridade baixa"}
          </span>
        </div>
        <div className="font-semibold text-sm">{item.titulo}</div>
        <div className="text-xs" style={{ color: "var(--muted)" }}>
          {item.descricao}
        </div>
        <Link href={item.acao.href} className="text-xs font-semibold" style={{ color: "#2d7d32" }}>
          {item.acao.label} →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="IA Operacional"
        icone="🤖"
        subtitulo={
          fonte === "ia"
            ? "Diagnostico Claude Haiku sobre dados da fazenda"
            : "Heuristicas locais (IA indisponivel no momento)"
        }
        acoes={<FazendaSelector onChange={(id) => setFazendaSel(id)} />}
      />

      <div className="card flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">Cultura</label>
          <select
            className="input"
            value={cultura}
            onChange={(e) => setCultura(e.target.value)}
          >
            <option value="">Todas</option>
            {CULTURAS_PADRAO.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Período (meses)</label>
          <select
            className="input"
            value={periodoMeses}
            onChange={(e) => setPeriodoMeses(e.target.value)}
          >
            <option value="3">3 meses</option>
            <option value="6">6 meses</option>
            <option value="12">12 meses</option>
            <option value="24">24 meses</option>
          </select>
        </div>
      </div>

      <div
        className="rounded-ja-lg p-5 text-white flex items-center gap-3"
        style={{ background: "linear-gradient(135deg,#16a34a 0%,#22c55e 100%)" }}
      >
        <span style={{ fontSize: 42 }}>{fonte === "ia" ? "🧠" : "📊"}</span>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wider opacity-85 flex items-center gap-2">
            Diagnostico geral
            <span
              className="px-2 py-0.5 rounded text-[10px] font-semibold"
              style={{ background: "rgba(255,255,255,0.25)" }}
            >
              {fonte === "ia" ? "Claude Haiku" : "Heuristica local"}
            </span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>
            {oportunidades.length} oportunidades · {riscos.length} riscos · {acoes.length} acoes prioritarias
          </div>
          {resumoIA && (
            <div className="text-xs opacity-90 mt-1" style={{ maxWidth: 720 }}>
              {resumoIA}
            </div>
          )}
        </div>
      </div>

      <div className="grid-cards">
        <KpiCard
          rotulo="Oportunidades"
          valor={oportunidades.length}
          icone="💡"
          accent="green"
        />
        <KpiCard rotulo="Riscos" valor={riscos.length} icone="⚠️" accent="red" />
        <KpiCard
          rotulo="Ações Prioritárias"
          valor={acoes.length}
          icone="🎯"
          accent="orange"
        />
      </div>

      {carregando ? (
        <p style={{ color: "var(--muted)" }}>Analisando...</p>
      ) : (
        <>
          <section>
            <h2 style={{ marginBottom: 12 }}>🎯 Próximas ações priorizadas</h2>
            {acoes.length === 0 ? (
              <EmptyState
                icone="✅"
                titulo="Operação rodando bem!"
                descricao="Nenhuma ação prioritária identificada."
              />
            ) : (
              <div className="grid-cards">
                {acoes.map((a) => (
                  <Card key={a.id} item={a} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 style={{ marginBottom: 12 }}>💡 Oportunidades</h2>
            {oportunidades.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Nenhuma oportunidade identificada agora.
              </p>
            ) : (
              <div className="grid-cards">
                {oportunidades.map((o) => (
                  <Card key={o.id} item={o} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 style={{ marginBottom: 12 }}>⚠️ Riscos</h2>
            {riscos.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Nenhum risco detectado.
              </p>
            ) : (
              <div className="grid-cards">
                {riscos.map((r) => (
                  <Card key={r.id} item={r} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
