"use client";

// Dashboard analítico (gráficos + KPIs).
// Portado de modules/admin-dashboard.js — Chart.js trocado por recharts.

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Categoria, Fazenda, Insumo, Lancamento } from "@/lib/types";
import { fmtBRL, fmtBRLShort } from "@/lib/format";
import { getFazendaSelecionada } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import KpiCard from "@/components/ui/KpiCard";
import EmptyState from "@/components/ui/EmptyState";
import FazendaSelector from "@/components/ui/FazendaSelector";
import {
  LineChart,
  BarChart,
  PieChart,
  AreaChart,
  ResponsiveContainer,
  Line,
  Bar,
  Area,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const CORES = [
  "#7CB342",
  "#8BC34A",
  "#f57c00",
  "#1565c0",
  "#6a1b9a",
  "#e53935",
  "#2e7d32",
  "#A5D6A7",
];

const MESES = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function DashboardPage() {
  const [fazendaSel, setFazendaSel] = useState<string | null>(null);
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);

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
  }, [fazendaSel, dataDe, dataAte, categoriaFiltro]);

  async function carregar() {
    setCarregando(true);
    const sb = getSupabase();

    let qLanc = sb
      .from("lancamentos")
      .select("*")
      .eq("status", "confirmado")
      .order("data_lancamento", { ascending: true })
      .limit(1000);

    if (fazendaSel) qLanc = qLanc.eq("fazenda_id", fazendaSel);
    if (dataDe) qLanc = qLanc.gte("data_lancamento", dataDe);
    if (dataAte) qLanc = qLanc.lte("data_lancamento", dataAte);
    if (categoriaFiltro) qLanc = qLanc.eq("categoria_id", categoriaFiltro);

    const [rLanc, rCat, rIns] = await Promise.all([
      qLanc,
      sb.from("categorias_lancamento").select("*").order("nome"),
      sb.from("insumos").select("id,nome,categoria,estoque_atual,preco_unitario,unidade,ativo,estoque_minimo,criado_em,atualizado_em").eq("ativo", true),
    ]);

    setLancamentos((rLanc.data || []) as Lancamento[]);
    setCategorias((rCat.data || []) as Categoria[]);
    setInsumos((rIns.data || []) as Insumo[]);
    setCarregando(false);
  }

  const catMap = useMemo(() => {
    const m: Record<string, string> = {};
    categorias.forEach((c) => {
      m[c.id] = c.nome || "Sem categoria";
    });
    return m;
  }, [categorias]);

  // KPIs
  const totalDespesas = useMemo(
    () =>
      lancamentos
        .filter((l) => l.tipo === "despesa")
        .reduce((s, l) => s + (l.custo_total || 0), 0),
    [lancamentos],
  );
  const totalReceitas = useMemo(
    () =>
      lancamentos
        .filter((l) => l.tipo === "receita")
        .reduce((s, l) => s + (l.custo_total || 0), 0),
    [lancamentos],
  );
  const lucro = totalReceitas - totalDespesas;
  const roi = totalDespesas > 0 ? (lucro / totalDespesas) * 100 : 0;

  const topInsumoMap = useMemo(() => {
    const m: Record<string, number> = {};
    lancamentos
      .filter((l) => l.tipo === "despesa" && l.insumo_id)
      .forEach((l) => {
        const nome = insumos.find((i) => i.id === l.insumo_id)?.nome || "Outro";
        m[nome] = (m[nome] || 0) + (l.custo_total || 0);
      });
    const arr = Object.entries(m).sort((a, b) => b[1] - a[1]);
    return arr[0] || ["—", 0];
  }, [lancamentos, insumos]);

  const topCategoriaMap = useMemo(() => {
    const m: Record<string, number> = {};
    lancamentos
      .filter((l) => l.tipo === "despesa")
      .forEach((l) => {
        const nome = catMap[l.categoria_id || ""] || "Sem categoria";
        m[nome] = (m[nome] || 0) + (l.custo_total || 0);
      });
    const arr = Object.entries(m).sort((a, b) => b[1] - a[1]);
    return arr[0] || ["—", 0];
  }, [lancamentos, catMap]);

  // Despesas dos últimos 12 meses (LineChart)
  const dadosLinha = useMemo(() => {
    const byMonth: Record<string, number> = {};
    lancamentos
      .filter((l) => l.tipo === "despesa" && l.data_lancamento)
      .forEach((l) => {
        const key = l.data_lancamento.slice(0, 7);
        byMonth[key] = (byMonth[key] || 0) + (l.custo_total || 0);
      });
    const keys = Object.keys(byMonth).sort().slice(-12);
    return keys.map((k) => {
      const [y, m] = k.split("-");
      return {
        mes: `${MESES[parseInt(m)]}/${y.slice(2)}`,
        despesas: byMonth[k],
      };
    });
  }, [lancamentos]);

  // Top 5 categorias (BarChart)
  const dadosBar = useMemo(() => {
    const m: Record<string, number> = {};
    lancamentos
      .filter((l) => l.tipo === "despesa")
      .forEach((l) => {
        const nome = catMap[l.categoria_id || ""] || "Sem categoria";
        m[nome] = (m[nome] || 0) + (l.custo_total || 0);
      });
    return Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nome, valor]) => ({ nome, valor }));
  }, [lancamentos, catMap]);

  // Distribuição por categoria (PieChart)
  const dadosPie = useMemo(() => {
    return dadosBar.map((d) => ({ name: d.nome, value: d.valor }));
  }, [dadosBar]);

  // Receitas vs despesas por mês (AreaChart)
  const dadosArea = useMemo(() => {
    const byMonth: Record<string, { rec: number; desp: number }> = {};
    lancamentos.forEach((l) => {
      if (!l.data_lancamento) return;
      const key = l.data_lancamento.slice(0, 7);
      if (!byMonth[key]) byMonth[key] = { rec: 0, desp: 0 };
      if (l.tipo === "despesa") byMonth[key].desp += l.custo_total || 0;
      else byMonth[key].rec += l.custo_total || 0;
    });
    const keys = Object.keys(byMonth).sort().slice(-12);
    return keys.map((k) => {
      const [y, m] = k.split("-");
      return {
        mes: `${MESES[parseInt(m)]}/${y.slice(2)}`,
        receitas: byMonth[k].rec,
        despesas: byMonth[k].desp,
      };
    });
  }, [lancamentos]);

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Dashboard Analytics"
        icone="📊"
        subtitulo="Gráficos e KPIs da operação"
        acoes={<FazendaSelector onChange={(id) => setFazendaSel(id)} />}
      />

      {/* Filtros */}
      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label">De</label>
          <input
            type="date"
            className="input"
            value={dataDe}
            onChange={(e) => setDataDe(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Até</label>
          <input
            type="date"
            className="input"
            value={dataAte}
            onChange={(e) => setDataAte(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Categoria</label>
          <select
            className="input"
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        {(dataDe || dataAte || categoriaFiltro) && (
          <button
            className="btn-ghost"
            onClick={() => {
              setDataDe("");
              setDataAte("");
              setCategoriaFiltro("");
            }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid-cards">
        <KpiCard
          rotulo="Total Despesas"
          valor={fmtBRLShort(totalDespesas)}
          icone="💸"
          accent="red"
        />
        <KpiCard
          rotulo="Total Receitas"
          valor={fmtBRLShort(totalReceitas)}
          icone="💰"
          accent="green"
        />
        <KpiCard
          rotulo="Lucro"
          valor={fmtBRLShort(lucro)}
          icone="📈"
          accent={lucro >= 0 ? "green" : "red"}
        />
        <KpiCard
          rotulo="ROI"
          valor={`${roi.toFixed(1)}%`}
          icone="🎯"
          accent={roi >= 0 ? "blue" : "red"}
        />
        <KpiCard
          rotulo="Top Insumo"
          valor={String(topInsumoMap[0]).slice(0, 18)}
          icone="🌾"
          hint={fmtBRL(topInsumoMap[1] as number)}
          accent="purple"
        />
        <KpiCard
          rotulo="Top Categoria"
          valor={String(topCategoriaMap[0]).slice(0, 18)}
          icone="🏷️"
          hint={fmtBRL(topCategoriaMap[1] as number)}
          accent="orange"
        />
      </div>

      {carregando && (
        <p style={{ color: "var(--muted)" }}>Carregando dados...</p>
      )}

      {!carregando && lancamentos.length === 0 ? (
        <EmptyState
          icone="📊"
          titulo="Nenhum lançamento no período"
          descricao="Ajuste os filtros ou registre lançamentos para gerar análises."
        />
      ) : (
        <>
          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>📅 Despesas mensais (12m)</h3>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <LineChart data={dadosLinha}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis
                      tickFormatter={(v) => fmtBRLShort(v)}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip formatter={(v: number) => fmtBRL(v)} />
                    <Line
                      type="monotone"
                      dataKey="despesas"
                      stroke="#e53935"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 12 }}>🏷️ Top 5 categorias</h3>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={dadosBar} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => fmtBRLShort(v)}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis dataKey="nome" type="category" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => fmtBRL(v)} />
                    <Bar dataKey="valor" fill="#7CB342" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 12 }}>🥧 Distribuição por categoria</h3>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={dadosPie}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={50}
                      dataKey="value"
                      label={(e) => e.name}
                    >
                      {dadosPie.map((_, idx) => (
                        <Cell key={idx} fill={CORES[idx % CORES.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmtBRL(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 12 }}>📉 Receitas vs Despesas</h3>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <AreaChart data={dadosArea}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis
                      tickFormatter={(v) => fmtBRLShort(v)}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip formatter={(v: number) => fmtBRL(v)} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="receitas"
                      stackId="1"
                      stroke="#2e7d32"
                      fill="#A5D6A7"
                    />
                    <Area
                      type="monotone"
                      dataKey="despesas"
                      stackId="2"
                      stroke="#e53935"
                      fill="#ef9a9a"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
