// ============================================================
// Análise de Solo — JA Produtor
// ============================================================
// MIGRATION NECESSÁRIA: rode `database/analise-solo.sql` (ou similar)
// antes do primeiro uso para criar a tabela `analise_solo`.
// Schema esperado:
//   id uuid PK, fazenda_id uuid FK, talhao_id uuid FK,
//   cultura text, data_analise date, dados_resultados jsonb,
//   observacoes text, criado_em timestamptz default now()
// ============================================================
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Fazenda, Talhao } from "@/lib/types";
import { fmtData, hoje } from "@/lib/format";
import { CULTURAS_PADRAO } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import KpiCard from "@/components/ui/KpiCard";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FazendaSelector from "@/components/ui/FazendaSelector";

type Aba = "lista" | "nova" | "comparativo" | "recomendacoes";

type AnaliseSolo = {
  id: string;
  fazenda_id: string;
  talhao_id: string | null;
  cultura: string | null;
  data_analise: string;
  dados_resultados: Record<string, number | null>;
  observacoes: string | null;
  criado_em: string;
};

type AnaliseComRel = AnaliseSolo & {
  fazendas?: { nome: string } | null;
  talhoes?: { nome: string } | null;
};

// Parâmetros agrupados (30+) — agronomicamente ordenados
type Parametro = { key: string; nome: string; unidade: string; ideal: [number, number]; categoria: string };

const PARAMETROS: Parametro[] = [
  // pH e acidez
  { key: "ph_h2o", nome: "pH (H2O)", unidade: "", ideal: [6.0, 7.0], categoria: "Acidez" },
  { key: "ph_cacl2", nome: "pH (CaCl2)", unidade: "", ideal: [5.5, 6.5], categoria: "Acidez" },
  { key: "h_al", nome: "H+Al", unidade: "mmolc/dm³", ideal: [0, 30], categoria: "Acidez" },
  { key: "al", nome: "Alumínio (Al)", unidade: "mmolc/dm³", ideal: [0, 4], categoria: "Acidez" },
  // Matéria orgânica
  { key: "mo", nome: "Matéria Orgânica", unidade: "g/dm³", ideal: [25, 40], categoria: "Orgânico" },
  // Macronutrientes
  { key: "p", nome: "Fósforo (P)", unidade: "mg/dm³", ideal: [15, 60], categoria: "Macronutrientes" },
  { key: "k", nome: "Potássio (K)", unidade: "mmolc/dm³", ideal: [2, 5], categoria: "Macronutrientes" },
  { key: "ca", nome: "Cálcio (Ca)", unidade: "mmolc/dm³", ideal: [20, 45], categoria: "Macronutrientes" },
  { key: "mg", nome: "Magnésio (Mg)", unidade: "mmolc/dm³", ideal: [8, 15], categoria: "Macronutrientes" },
  { key: "s", nome: "Enxofre (S)", unidade: "mg/dm³", ideal: [10, 20], categoria: "Macronutrientes" },
  { key: "na", nome: "Sódio (Na)", unidade: "mmolc/dm³", ideal: [0, 1], categoria: "Macronutrientes" },
  // Micronutrientes
  { key: "b", nome: "Boro (B)", unidade: "mg/dm³", ideal: [0.5, 2], categoria: "Micronutrientes" },
  { key: "cu", nome: "Cobre (Cu)", unidade: "mg/dm³", ideal: [0.8, 5], categoria: "Micronutrientes" },
  { key: "fe", nome: "Ferro (Fe)", unidade: "mg/dm³", ideal: [12, 80], categoria: "Micronutrientes" },
  { key: "mn", nome: "Manganês (Mn)", unidade: "mg/dm³", ideal: [4, 15], categoria: "Micronutrientes" },
  { key: "zn", nome: "Zinco (Zn)", unidade: "mg/dm³", ideal: [1.2, 10], categoria: "Micronutrientes" },
  { key: "mo_micro", nome: "Molibdênio (Mo)", unidade: "mg/dm³", ideal: [0.05, 0.5], categoria: "Micronutrientes" },
  // CTC e saturação
  { key: "sb", nome: "Soma de Bases (SB)", unidade: "mmolc/dm³", ideal: [40, 100], categoria: "CTC" },
  { key: "ctc", nome: "CTC (T)", unidade: "mmolc/dm³", ideal: [60, 150], categoria: "CTC" },
  { key: "v_pct", nome: "Saturação por Bases V%", unidade: "%", ideal: [60, 70], categoria: "CTC" },
  { key: "m_pct", nome: "Saturação por Alumínio m%", unidade: "%", ideal: [0, 10], categoria: "CTC" },
  // Físicos
  { key: "argila", nome: "Argila", unidade: "%", ideal: [20, 60], categoria: "Físico" },
  { key: "silte", nome: "Silte", unidade: "%", ideal: [5, 40], categoria: "Físico" },
  { key: "areia", nome: "Areia", unidade: "%", ideal: [10, 70], categoria: "Físico" },
  // Outros
  { key: "ce", nome: "Cond. Elétrica", unidade: "dS/m", ideal: [0, 2], categoria: "Outros" },
  { key: "n_total", nome: "Nitrogênio total", unidade: "g/kg", ideal: [1, 3], categoria: "Outros" },
  { key: "c_org", nome: "Carbono orgânico", unidade: "g/kg", ideal: [10, 25], categoria: "Outros" },
  { key: "p_resina", nome: "P resina", unidade: "mg/dm³", ideal: [15, 40], categoria: "Outros" },
  { key: "k_pct", nome: "K (% CTC)", unidade: "%", ideal: [3, 5], categoria: "Outros" },
  { key: "ca_pct", nome: "Ca (% CTC)", unidade: "%", ideal: [50, 65], categoria: "Outros" },
  { key: "mg_pct", nome: "Mg (% CTC)", unidade: "%", ideal: [12, 20], categoria: "Outros" },
];

const CATEGORIAS_PARAM = ["Acidez", "Orgânico", "Macronutrientes", "Micronutrientes", "CTC", "Físico", "Outros"];

function statusParametro(p: Parametro, valor: number | null | undefined): "baixo" | "alto" | "ideal" | "sd" {
  if (valor === null || valor === undefined || isNaN(Number(valor))) return "sd";
  const v = Number(valor);
  if (v < p.ideal[0]) return "baixo";
  if (v > p.ideal[1]) return "alto";
  return "ideal";
}

function corStatus(st: "baixo" | "alto" | "ideal" | "sd"): string {
  return { baixo: "var(--warn)", alto: "var(--danger)", ideal: "var(--green)", sd: "var(--muted)" }[st];
}

export default function AnaliseSoloPage() {
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState<Aba>("lista");

  const [analises, setAnalises] = useState<AnaliseComRel[]>([]);
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);

  const [filtroFazenda, setFiltroFazenda] = useState("");
  const [filtroTalhao, setFiltroTalhao] = useState("");
  const [filtroCultura, setFiltroCultura] = useState("");

  const [editarAnalise, setEditarAnalise] = useState<AnaliseComRel | null>(null);
  const [verAnalise, setVerAnalise] = useState<AnaliseComRel | null>(null);
  const [excluirAnalise, setExcluirAnalise] = useState<AnaliseComRel | null>(null);

  // Form
  const [form, setForm] = useState(criarFormVazio());

  async function carregar() {
    setCarregando(true);
    try {
      const sb = getSupabase();
      const [f, t, a] = await Promise.all([
        sb.from("fazendas").select("*").eq("ativo", true).order("nome"),
        sb.from("talhoes").select("*").eq("ativo", true).order("nome"),
        sb.from("analise_solo")
          .select("*, fazendas(nome), talhoes(nome)")
          .order("data_analise", { ascending: false }),
      ]);
      if (f.error) throw f.error;
      if (t.error) throw t.error;
      if (a.error) {
        // tabela pode não existir ainda
        toast.error("Tabela analise_solo não encontrada. Rode a migration.");
        console.error(a.error);
      }
      setFazendas((f.data || []) as Fazenda[]);
      setTalhoes((t.data || []) as Talhao[]);
      setAnalises((a.data || []) as AnaliseComRel[]);
    } catch (e: any) {
      toast.error("Erro ao carregar: " + (e.message || e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  const filtradas = useMemo(() => {
    return analises.filter((a) => {
      if (filtroFazenda && a.fazenda_id !== filtroFazenda) return false;
      if (filtroTalhao && a.talhao_id !== filtroTalhao) return false;
      if (filtroCultura && (a.cultura || "").toUpperCase() !== filtroCultura) return false;
      return true;
    });
  }, [analises, filtroFazenda, filtroTalhao, filtroCultura]);

  const talhoesDoFiltro = useMemo(() => {
    if (!filtroFazenda) return talhoes;
    return talhoes.filter((t) => t.fazenda_id === filtroFazenda);
  }, [talhoes, filtroFazenda]);

  function criarFormVazio() {
    return {
      id: null as string | null,
      fazenda_id: "",
      talhao_id: "",
      cultura: "",
      data_analise: hoje(),
      observacoes: "",
      dados_resultados: {} as Record<string, number | null>,
    };
  }

  function abrirNova() {
    setForm(criarFormVazio());
    setAba("nova");
  }

  function abrirEditar(a: AnaliseComRel) {
    setForm({
      id: a.id,
      fazenda_id: a.fazenda_id,
      talhao_id: a.talhao_id || "",
      cultura: a.cultura || "",
      data_analise: a.data_analise,
      observacoes: a.observacoes || "",
      dados_resultados: { ...(a.dados_resultados || {}) },
    });
    setEditarAnalise(null);
    setAba("nova");
  }

  async function salvarForm() {
    if (!form.fazenda_id) { toast.error("Selecione a fazenda."); return; }
    if (!form.data_analise) { toast.error("Informe a data."); return; }
    try {
      const sb = getSupabase();
      // limpa valores vazios
      const dados: Record<string, number> = {};
      Object.entries(form.dados_resultados).forEach(([k, v]) => {
        if (v !== null && v !== undefined && !Number.isNaN(Number(v))) dados[k] = Number(v);
      });
      const payload = {
        fazenda_id: form.fazenda_id,
        talhao_id: form.talhao_id || null,
        cultura: form.cultura || null,
        data_analise: form.data_analise,
        dados_resultados: dados,
        observacoes: form.observacoes || null,
      };
      if (form.id) {
        const r = await sb.from("analise_solo").update(payload).eq("id", form.id);
        if (r.error) throw r.error;
        toast.success("Análise atualizada.");
      } else {
        const r = await sb.from("analise_solo").insert(payload);
        if (r.error) throw r.error;
        toast.success("Análise cadastrada.");
      }
      setForm(criarFormVazio());
      setAba("lista");
      await carregar();
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e.message || e));
    }
  }

  async function confirmarExcluir() {
    if (!excluirAnalise) return;
    try {
      const sb = getSupabase();
      const r = await sb.from("analise_solo").delete().eq("id", excluirAnalise.id);
      if (r.error) throw r.error;
      toast.success("Análise excluída.");
      setExcluirAnalise(null);
      await carregar();
    } catch (e: any) {
      toast.error("Erro: " + (e.message || e));
    }
  }

  const totalAnalises = analises.length;
  const fazendasAnalisadas = new Set(analises.map((a) => a.fazenda_id)).size;
  const ultimaData = analises[0]?.data_analise;
  const conformes = analises.filter((a) => {
    const dados = a.dados_resultados || {};
    return PARAMETROS.every((p) => {
      const v = dados[p.key];
      if (v === null || v === undefined) return true;
      return statusParametro(p, v) === "ideal";
    });
  }).length;

  return (
    <div>
      <PageHeader
        titulo="Análise de Solo"
        subtitulo="Registros laboratoriais por talhão, comparativo histórico e recomendações"
        icone="🧪"
        acoes={
          <>
            <FazendaSelector onChange={(id) => setFiltroFazenda(id || "")} />
            <button className="btn-primary" onClick={abrirNova}>+ Nova análise</button>
          </>
        }
      />

      <div className="grid-cards mb-6">
        <KpiCard rotulo="Análises" valor={String(totalAnalises)} icone="🧪" accent="blue" />
        <KpiCard rotulo="Fazendas analisadas" valor={String(fazendasAnalisadas)} icone="🏡" accent="green" />
        <KpiCard rotulo="Última análise" valor={ultimaData ? fmtData(ultimaData) : "—"} icone="📅" accent="purple" />
        <KpiCard rotulo="Totalmente conformes" valor={String(conformes)} icone="✅" accent={conformes > 0 ? "green" : "orange"} />
      </div>

      <div className="card mb-4" style={{ padding: 0 }}>
        <div className="flex border-b" style={{ borderColor: "var(--brd)" }}>
          {([
            { v: "lista", l: "📋 Lista" },
            { v: "nova", l: form.id ? "✏️ Editar" : "+ Nova análise" },
            { v: "comparativo", l: "📈 Comparativo" },
            { v: "recomendacoes", l: "💡 Recomendações" },
          ] as { v: Aba; l: string }[]).map((tab) => (
            <button
              key={tab.v}
              className="px-5 py-3 text-sm font-semibold"
              style={
                aba === tab.v
                  ? { borderBottom: "2px solid var(--green)", color: "var(--green)" }
                  : { color: "var(--muted)" }
              }
              onClick={() => setAba(tab.v)}
            >
              {tab.l}
            </button>
          ))}
        </div>

        {aba === "lista" && (
          <div className="p-4">
            <div className="flex flex-wrap items-end gap-3 mb-4">
              <div style={{ minWidth: 180 }}>
                <label className="label">Talhão</label>
                <select className="input" value={filtroTalhao} onChange={(e) => setFiltroTalhao(e.target.value)}>
                  <option value="">Todos</option>
                  {talhoesDoFiltro.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div style={{ minWidth: 160 }}>
                <label className="label">Cultura</label>
                <select className="input" value={filtroCultura} onChange={(e) => setFiltroCultura(e.target.value)}>
                  <option value="">Todas</option>
                  {CULTURAS_PADRAO.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button
                className="btn-ghost"
                onClick={() => { setFiltroTalhao(""); setFiltroCultura(""); }}
              >
                Limpar
              </button>
            </div>

            {carregando ? (
              <div className="text-center py-8" style={{ color: "var(--muted)" }}>Carregando...</div>
            ) : filtradas.length === 0 ? (
              <EmptyState
                icone="🧪"
                titulo="Nenhuma análise"
                descricao="Cadastre a primeira análise laboratorial."
                acao={<button className="btn-primary" onClick={abrirNova}>+ Nova análise</button>}
              />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Fazenda</th>
                      <th>Talhão</th>
                      <th>Cultura</th>
                      <th>Parâmetros</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtradas.map((a) => {
                      const dados = a.dados_resultados || {};
                      const preenchidos = Object.keys(dados).filter(
                        (k) => dados[k] !== null && dados[k] !== undefined,
                      ).length;
                      const problemas = PARAMETROS.filter((p) => {
                        const v = dados[p.key];
                        if (v === null || v === undefined) return false;
                        return statusParametro(p, v) !== "ideal";
                      }).length;
                      return (
                        <tr key={a.id}>
                          <td>{fmtData(a.data_analise)}</td>
                          <td>{a.fazendas?.nome || "—"}</td>
                          <td>{a.talhoes?.nome || "—"}</td>
                          <td>{a.cultura || "—"}</td>
                          <td>{preenchidos} parâmetros</td>
                          <td>
                            {problemas === 0 ? (
                              <span className="badge badge-success">Conforme</span>
                            ) : (
                              <span className="badge badge-warn">{problemas} fora do ideal</span>
                            )}
                          </td>
                          <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            <button className="btn-ghost" onClick={() => setVerAnalise(a)}>Ver</button>
                            <button className="btn-ghost" onClick={() => abrirEditar(a)}>Editar</button>
                            <button
                              className="btn-ghost"
                              style={{ color: "var(--danger)" }}
                              onClick={() => setExcluirAnalise(a)}
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {aba === "nova" && (
          <FormAnalise
            form={form}
            setForm={setForm}
            fazendas={fazendas}
            talhoes={talhoes}
            onSalvar={salvarForm}
            onCancelar={() => { setForm(criarFormVazio()); setAba("lista"); }}
          />
        )}

        {aba === "comparativo" && (
          <Comparativo
            analises={filtradas}
            talhoes={talhoes}
            filtroTalhao={filtroTalhao}
            setFiltroTalhao={setFiltroTalhao}
          />
        )}

        {aba === "recomendacoes" && <Recomendacoes analises={filtradas} />}
      </div>

      {verAnalise && (
        <VerAnaliseModal
          analise={verAnalise}
          onClose={() => setVerAnalise(null)}
          onEditar={() => { abrirEditar(verAnalise); setVerAnalise(null); }}
        />
      )}

      <ConfirmDialog
        open={!!excluirAnalise}
        titulo="Excluir análise?"
        mensagem="Esta ação não pode ser desfeita."
        textoConfirmar="Excluir"
        destrutivo
        onConfirmar={confirmarExcluir}
        onCancelar={() => setExcluirAnalise(null)}
      />
    </div>
  );
}

function FormAnalise({
  form, setForm, fazendas, talhoes, onSalvar, onCancelar,
}: {
  form: any;
  setForm: (f: any) => void;
  fazendas: Fazenda[];
  talhoes: Talhao[];
  onSalvar: () => void;
  onCancelar: () => void;
}) {
  const talhoesDaFaz = talhoes.filter((t) => t.fazenda_id === form.fazenda_id);

  function setDado(key: string, valor: string) {
    const dados = { ...form.dados_resultados };
    if (valor === "") delete dados[key];
    else dados[key] = parseFloat(valor);
    setForm({ ...form, dados_resultados: dados });
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div>
          <label className="label">Fazenda *</label>
          <select
            className="input"
            value={form.fazenda_id}
            onChange={(e) => setForm({ ...form, fazenda_id: e.target.value, talhao_id: "" })}
          >
            <option value="">Selecione...</option>
            {fazendas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Talhão</label>
          <select
            className="input"
            value={form.talhao_id}
            onChange={(e) => setForm({ ...form, talhao_id: e.target.value })}
          >
            <option value="">Geral</option>
            {talhoesDaFaz.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Cultura</label>
          <select
            className="input"
            value={form.cultura}
            onChange={(e) => setForm({ ...form, cultura: e.target.value })}
          >
            <option value="">—</option>
            {CULTURAS_PADRAO.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Data da análise *</label>
          <input
            type="date"
            className="input"
            value={form.data_analise}
            onChange={(e) => setForm({ ...form, data_analise: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Observações</label>
          <input
            className="input"
            value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
          />
        </div>
      </div>

      {CATEGORIAS_PARAM.map((cat) => {
        const params = PARAMETROS.filter((p) => p.categoria === cat);
        return (
          <div key={cat} className="mb-5">
            <h3 className="mb-2" style={{ fontSize: 14, color: "var(--green)" }}>{cat}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {params.map((p) => {
                const v = form.dados_resultados[p.key];
                const st = statusParametro(p, v);
                return (
                  <div key={p.key} className="rounded-ja p-3" style={{ background: "#fafcf8", border: "1px solid var(--brd)" }}>
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-xs font-semibold">{p.nome}</span>
                      <span className="text-xs" style={{ color: corStatus(st) }}>
                        {st === "ideal" ? "✓ Ideal" : st === "baixo" ? "⚠ Baixo" : st === "alto" ? "⚠ Alto" : "—"}
                      </span>
                    </div>
                    <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>
                      Ideal: {p.ideal[0]}–{p.ideal[1]} {p.unidade}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      placeholder="—"
                      value={v ?? ""}
                      onChange={(e) => setDado(p.key, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="flex justify-end gap-2 mt-4">
        <button className="btn-ghost" onClick={onCancelar}>Cancelar</button>
        <button className="btn-primary" onClick={onSalvar}>Salvar análise</button>
      </div>
    </div>
  );
}

function Comparativo({
  analises, talhoes, filtroTalhao, setFiltroTalhao,
}: {
  analises: AnaliseComRel[];
  talhoes: Talhao[];
  filtroTalhao: string;
  setFiltroTalhao: (v: string) => void;
}) {
  const [paramSelecionado, setParamSelecionado] = useState<string>("ph_cacl2");

  const dadosGrafico = useMemo(() => {
    const filtradas = filtroTalhao
      ? analises.filter((a) => a.talhao_id === filtroTalhao)
      : analises;
    return [...filtradas]
      .sort((a, b) => a.data_analise.localeCompare(b.data_analise))
      .map((a) => ({
        data: fmtData(a.data_analise),
        valor: a.dados_resultados?.[paramSelecionado] ?? null,
      }))
      .filter((d) => d.valor !== null);
  }, [analises, filtroTalhao, paramSelecionado]);

  const param = PARAMETROS.find((p) => p.key === paramSelecionado);

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div style={{ minWidth: 220 }}>
          <label className="label">Talhão</label>
          <select className="input" value={filtroTalhao} onChange={(e) => setFiltroTalhao(e.target.value)}>
            <option value="">Todos</option>
            {talhoes.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <div style={{ minWidth: 260 }}>
          <label className="label">Parâmetro</label>
          <select
            className="input"
            value={paramSelecionado}
            onChange={(e) => setParamSelecionado(e.target.value)}
          >
            {PARAMETROS.map((p) => (
              <option key={p.key} value={p.key}>{p.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {dadosGrafico.length === 0 ? (
        <EmptyState
          icone="📈"
          titulo="Sem histórico"
          descricao="Cadastre análises ao longo do tempo para ver a evolução."
        />
      ) : (
        <div className="card" style={{ height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="valor"
                name={`${param?.nome} (${param?.unidade || ""})`}
                stroke="#7CB342"
                strokeWidth={2}
                dot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
          {param && (
            <p className="text-xs text-center mt-2" style={{ color: "var(--muted)" }}>
              Faixa ideal: {param.ideal[0]}–{param.ideal[1]} {param.unidade}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Recomendacoes({ analises }: { analises: AnaliseComRel[] }) {
  // Para cada análise, lista parâmetros fora do ideal + observações
  const items = useMemo(() => {
    return analises
      .map((a) => {
        const dados = a.dados_resultados || {};
        const problemas = PARAMETROS
          .map((p) => {
            const v = dados[p.key];
            if (v === null || v === undefined) return null;
            const st = statusParametro(p, v);
            if (st === "ideal" || st === "sd") return null;
            return { p, v, st };
          })
          .filter(Boolean) as { p: Parametro; v: number; st: "baixo" | "alto" }[];
        return { analise: a, problemas };
      })
      .filter((x) => x.problemas.length > 0);
  }, [analises]);

  if (items.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          icone="✅"
          titulo="Tudo conforme"
          descricao="Nenhuma análise filtrada tem parâmetros fora da faixa ideal."
        />
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-3">
      {items.map(({ analise, problemas }) => (
        <div key={analise.id} className="card">
          <div className="flex items-start justify-between mb-2">
            <div>
              <strong>{analise.fazendas?.nome || "—"} {analise.talhoes && `· ${analise.talhoes.nome}`}</strong>
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                {fmtData(analise.data_analise)} · {analise.cultura || "Sem cultura"}
              </div>
            </div>
            <span className="badge badge-warn">{problemas.length} ponto(s)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {problemas.map(({ p, v, st }) => (
              <div
                key={p.key}
                className="rounded-ja p-2 text-sm"
                style={{
                  background: st === "baixo" ? "rgba(217,119,6,.08)" : "rgba(220,38,38,.08)",
                  border: `1px solid ${corStatus(st)}`,
                }}
              >
                <strong>{p.nome}:</strong> {v} {p.unidade}{" "}
                <span style={{ color: corStatus(st) }}>
                  ({st === "baixo" ? "abaixo" : "acima"} do ideal {p.ideal[0]}–{p.ideal[1]})
                </span>
                <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                  {sugestao(p, st)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function sugestao(p: Parametro, st: "baixo" | "alto"): string {
  const k = p.key;
  if (k === "ph_cacl2" || k === "ph_h2o") {
    return st === "baixo" ? "Considere calagem para correção da acidez." : "Avalie aplicação de enxofre/matéria orgânica.";
  }
  if (k === "v_pct") return st === "baixo" ? "Necessária calagem para elevar saturação por bases." : "Reduzir aplicações de cálcio/magnésio.";
  if (k === "m_pct") return st === "alto" ? "Toxicidade por alumínio — calagem urgente." : "Continue monitorando.";
  if (k === "p" || k === "p_resina") return st === "baixo" ? "Reforçar adubação fosfatada." : "Reduzir doses de P.";
  if (k === "k") return st === "baixo" ? "Aumentar adubação potássica." : "Reduzir adubação potássica.";
  if (k === "mo") return st === "baixo" ? "Incorporar matéria orgânica (esterco, palha, cobertura)." : "Excelente — manter manejo.";
  if (p.categoria === "Micronutrientes") {
    return st === "baixo" ? `Aplicar adubo com ${p.nome} ou foliar específico.` : "Reduzir ou suspender aplicações.";
  }
  return st === "baixo" ? "Avaliar correção." : "Avaliar manejo para reduzir excesso.";
}

function VerAnaliseModal({
  analise, onClose, onEditar,
}: {
  analise: AnaliseComRel;
  onClose: () => void;
  onEditar: () => void;
}) {
  const dados = analise.dados_resultados || {};
  return (
    <Modal
      open
      onClose={onClose}
      titulo={`Análise — ${fmtData(analise.data_analise)}`}
      larguraMax={780}
      rodape={
        <>
          <button className="btn-ghost" onClick={onClose}>Fechar</button>
          <button className="btn-primary" onClick={onEditar}>Editar</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
        <div>
          <div className="text-caps">Fazenda</div>
          <div>{analise.fazendas?.nome || "—"}</div>
        </div>
        <div>
          <div className="text-caps">Talhão</div>
          <div>{analise.talhoes?.nome || "—"}</div>
        </div>
        <div>
          <div className="text-caps">Cultura</div>
          <div>{analise.cultura || "—"}</div>
        </div>
        <div>
          <div className="text-caps">Data</div>
          <div>{fmtData(analise.data_analise)}</div>
        </div>
        {analise.observacoes && (
          <div className="col-span-2">
            <div className="text-caps">Observações</div>
            <div>{analise.observacoes}</div>
          </div>
        )}
      </div>

      {CATEGORIAS_PARAM.map((cat) => {
        const params = PARAMETROS.filter((p) => p.categoria === cat && dados[p.key] !== undefined && dados[p.key] !== null);
        if (params.length === 0) return null;
        return (
          <div key={cat} className="mb-4">
            <h4 style={{ color: "var(--green)", fontSize: 13, marginBottom: 6 }}>{cat}</h4>
            <table className="tbl" style={{ fontSize: 13 }}>
              <tbody>
                {params.map((p) => {
                  const v = dados[p.key]!;
                  const st = statusParametro(p, v);
                  return (
                    <tr key={p.key}>
                      <td>{p.nome}</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        {v} <span style={{ color: "var(--muted)", fontWeight: 400 }}>{p.unidade}</span>
                      </td>
                      <td style={{ textAlign: "right", color: corStatus(st) }}>
                        {st === "ideal" ? "✓ Ideal" : st === "baixo" ? "⚠ Baixo" : st === "alto" ? "⚠ Alto" : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </Modal>
  );
}
