"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { AnaliseSolo, Fazenda, Talhao } from "@/lib/types";
import { fmtData, hoje } from "@/lib/format";
import { CULTURAS_PADRAO } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import KpiCard from "@/components/ui/KpiCard";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// ===== Parametros agronomicos (organizados em grupos) =====
type Param = { k: string; label: string; unidade: string; ideal?: [number, number] };
type Grupo = { titulo: string; params: Param[] };

const GRUPOS_PARAMS: Grupo[] = [
  {
    titulo: "Acidez",
    params: [
      { k: "pH_h2o",   label: "pH (H2O)",   unidade: "",          ideal: [6.0, 7.0] },
      { k: "pH_cacl2", label: "pH (CaCl2)", unidade: "",          ideal: [5.5, 6.5] },
      { k: "Al",       label: "Al",         unidade: "cmolc/dm3", ideal: [0, 0.3] },
      { k: "H_Al",     label: "H+Al",       unidade: "cmolc/dm3", ideal: [0, 5] },
      { k: "m",        label: "m (sat. Al)", unidade: "%",        ideal: [0, 15] },
    ],
  },
  {
    titulo: "Macronutrientes primarios",
    params: [
      { k: "MO", label: "Matéria orgânica", unidade: "%",         ideal: [2.5, 5] },
      { k: "P",  label: "Fósforo (P)",      unidade: "mg/dm3",    ideal: [15, 40] },
      { k: "K",  label: "Potássio (K)",     unidade: "cmolc/dm3", ideal: [0.15, 0.4] },
      { k: "N",  label: "Nitrogênio total", unidade: "g/kg",      ideal: [1.5, 3] },
    ],
  },
  {
    titulo: "Macronutrientes secundarios",
    params: [
      { k: "Ca", label: "Cálcio (Ca)",   unidade: "cmolc/dm3", ideal: [2.5, 7] },
      { k: "Mg", label: "Magnésio (Mg)", unidade: "cmolc/dm3", ideal: [0.5, 2] },
      { k: "S",  label: "Enxofre (S)",   unidade: "mg/dm3",    ideal: [5, 20] },
    ],
  },
  {
    titulo: "Capacidade de troca",
    params: [
      { k: "SB",  label: "Soma de bases (SB)", unidade: "cmolc/dm3", ideal: [3, 8] },
      { k: "CTC", label: "CTC (T)",            unidade: "cmolc/dm3", ideal: [5, 15] },
      { k: "V",   label: "V% (sat. bases)",    unidade: "%",         ideal: [50, 80] },
    ],
  },
  {
    titulo: "Micronutrientes",
    params: [
      { k: "B",  label: "Boro",     unidade: "mg/dm3", ideal: [0.3, 1] },
      { k: "Cu", label: "Cobre",    unidade: "mg/dm3", ideal: [0.5, 4] },
      { k: "Fe", label: "Ferro",    unidade: "mg/dm3", ideal: [10, 50] },
      { k: "Mn", label: "Manganês", unidade: "mg/dm3", ideal: [5, 30] },
      { k: "Zn", label: "Zinco",    unidade: "mg/dm3", ideal: [1, 5] },
    ],
  },
  {
    titulo: "Outros",
    params: [
      { k: "Na",     label: "Sódio",  unidade: "cmolc/dm3" },
      { k: "Argila", label: "Argila", unidade: "%" },
      { k: "Silte",  label: "Silte",  unidade: "%" },
      { k: "Areia",  label: "Areia",  unidade: "%" },
    ],
  },
];

const TODOS_PARAMS: Param[] = GRUPOS_PARAMS.flatMap((g) => g.params);

const STATUS_OPCOES = [
  { v: "pendente",  label: "Pendente",  badge: "badge-warn" },
  { v: "concluido", label: "Concluído", badge: "badge-info" },
  { v: "aprovado",  label: "Aprovado",  badge: "badge-success" },
];

function classificar(p: Param, valor: number): "abaixo" | "ideal" | "acima" | "sem_ref" {
  if (!p.ideal) return "sem_ref";
  if (valor < p.ideal[0]) return "abaixo";
  if (valor > p.ideal[1]) return "acima";
  return "ideal";
}

function gerarRecomendacoes(r: AnaliseSolo): string[] {
  const sug: string[] = [];
  const v = r.resultados || {};
  const num = (k: string) => Number(v[k]);

  if (v.pH_h2o && num("pH_h2o") < 5.5) sug.push("pH baixo: avaliar calagem para correção da acidez");
  if (v.pH_h2o && num("pH_h2o") > 7.5) sug.push("pH alto: solo alcalino pode reduzir disponibilidade de P, Fe, Mn, Zn, Cu");
  if (v.MO && num("MO") < 2) sug.push("MO baixa: aumentar matéria orgânica via adubação verde, esterco ou cobertura morta");
  if (v.P && num("P") < 10) sug.push("Fósforo baixo: adubação fosfatada recomendada (superfosfato, MAP, fosfato natural)");
  if (v.K && num("K") < 0.15) sug.push("Potássio baixo: aplicar KCl ou sulfato de potássio");
  if (v.Ca && num("Ca") < 2) sug.push("Cálcio baixo: calagem com calcário calcítico/dolomítico");
  if (v.Mg && num("Mg") < 0.5) sug.push("Magnésio baixo: calcário dolomítico ou sulfato de magnésio");
  if (v.Al && num("Al") > 0.5) sug.push("Alumínio tóxico elevado: calagem urgente para neutralizar Al3+");
  if (v.V && num("V") < 50) sug.push("Saturação de bases (V%) baixa: calagem para elevar V% acima de 60%");
  if (v.S && num("S") < 5) sug.push("Enxofre baixo: gesso agrícola ou sulfato de amônio");
  if (v.B && num("B") < 0.3) sug.push("Boro baixo: aplicação foliar ou via solo (ácido bórico, bórax)");
  if (v.Zn && num("Zn") < 1) sug.push("Zinco baixo: sulfato de zinco via solo ou foliar");

  return sug;
}

type Tab = "lista" | "comparativo" | "recomendacoes";

const FORM_INICIAL = {
  id: null as string | null,
  fazenda_id: "",
  talhao_id: "" as string,
  data_coleta: hoje(),
  laboratorio: "",
  numero_amostra: "",
  profundidade: "0-20cm",
  cultura_referencia: "" as string,
  recomendacoes: "",
  status: "pendente",
  observacoes: "",
  resultados: {} as Record<string, string>,
};

export default function AnaliseSoloPage() {
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState<Tab>("lista");
  const [analises, setAnalises] = useState<AnaliseSolo[]>([]);
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);

  const [filtroFazenda, setFiltroFazenda] = useState<string>("");
  const [filtroTalhao, setFiltroTalhao] = useState<string>("");
  const [filtroCultura, setFiltroCultura] = useState<string>("");
  const [dataDe, setDataDe] = useState<string>("");
  const [dataAte, setDataAte] = useState<string>("");

  const [form, setForm] = useState(FORM_INICIAL);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluir, setExcluir] = useState<AnaliseSolo | null>(null);

  const [paramSel, setParamSel] = useState<string>("pH_h2o");
  const [talhaoCompare, setTalhaoCompare] = useState<string>("");

  async function carregar() {
    setCarregando(true);
    try {
      const sb = getSupabase();
      const [f, t, a] = await Promise.all([
        sb.from("fazendas").select("*").eq("ativo", true).order("nome"),
        sb.from("talhoes").select("*").eq("ativo", true).order("nome"),
        sb.from("analise_solo").select("*").order("data_coleta", { ascending: false }),
      ]);
      if (f.error) throw f.error;
      if (t.error) throw t.error;
      if (a.error) throw a.error;
      setFazendas((f.data || []) as Fazenda[]);
      setTalhoes((t.data || []) as Talhao[]);
      setAnalises((a.data || []) as AnaliseSolo[]);
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
      if (filtroCultura && a.cultura_referencia !== filtroCultura) return false;
      if (dataDe && (a.data_coleta || "") < dataDe) return false;
      if (dataAte && (a.data_coleta || "") > dataAte) return false;
      return true;
    });
  }, [analises, filtroFazenda, filtroTalhao, filtroCultura, dataDe, dataAte]);

  const kpis = useMemo(() => {
    const total = filtradas.length;
    const pendentes = filtradas.filter((a) => a.status === "pendente").length;
    const concluidas = filtradas.filter((a) => a.status === "concluido" || a.status === "aprovado").length;
    const labs = Array.from(new Set(filtradas.map((a) => a.laboratorio).filter(Boolean)));
    return { total, pendentes, concluidas, ultimoLab: labs[0] || "—" };
  }, [filtradas]);

  const dadosCompare = useMemo(() => {
    if (!paramSel) return [];
    const escopo = talhaoCompare
      ? analises.filter((a) => a.talhao_id === talhaoCompare)
      : analises;
    return escopo
      .filter((a) => a.resultados && a.resultados[paramSel] != null && a.resultados[paramSel] !== "")
      .sort((a, b) => (a.data_coleta || "").localeCompare(b.data_coleta || ""))
      .map((a) => ({
        data: a.data_coleta,
        valor: Number(a.resultados[paramSel]),
        talhao: talhoes.find((t) => t.id === a.talhao_id)?.nome || "?",
      }));
  }, [analises, talhoes, paramSel, talhaoCompare]);

  function abrirNova() {
    setForm({ ...FORM_INICIAL, fazenda_id: filtroFazenda || fazendas[0]?.id || "" });
    setModalAberto(true);
  }

  function abrirEditar(a: AnaliseSolo) {
    const resultadosStr: Record<string, string> = {};
    Object.keys(a.resultados || {}).forEach((k) => {
      resultadosStr[k] = String((a.resultados as any)[k] ?? "");
    });
    setForm({
      id: a.id,
      fazenda_id: a.fazenda_id,
      talhao_id: a.talhao_id || "",
      data_coleta: a.data_coleta || hoje(),
      laboratorio: a.laboratorio || "",
      numero_amostra: a.numero_amostra || "",
      profundidade: a.profundidade || "0-20cm",
      cultura_referencia: a.cultura_referencia || "",
      recomendacoes: a.recomendacoes || "",
      status: a.status || "pendente",
      observacoes: a.observacoes || "",
      resultados: resultadosStr,
    });
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.fazenda_id) { toast.error("Selecione uma fazenda."); return; }
    if (!form.data_coleta) { toast.error("Informe a data de coleta."); return; }

    const resultadosNum: Record<string, any> = {};
    Object.keys(form.resultados).forEach((k) => {
      const v = form.resultados[k];
      if (v !== "" && v != null) {
        const n = parseFloat(v);
        resultadosNum[k] = isNaN(n) ? v : n;
      }
    });

    setSalvando(true);
    try {
      const sb = getSupabase();
      const payload = {
        fazenda_id: form.fazenda_id,
        talhao_id: form.talhao_id || null,
        data_coleta: form.data_coleta,
        laboratorio: form.laboratorio || null,
        numero_amostra: form.numero_amostra || null,
        profundidade: form.profundidade || null,
        cultura_referencia: form.cultura_referencia || null,
        recomendacoes: form.recomendacoes || null,
        status: form.status || "pendente",
        observacoes: form.observacoes || null,
        resultados: resultadosNum,
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
      setModalAberto(false);
      await carregar();
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e.message || e));
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExcluir() {
    if (!excluir) return;
    try {
      const sb = getSupabase();
      const r = await sb.from("analise_solo").delete().eq("id", excluir.id);
      if (r.error) throw r.error;
      toast.success("Análise removida.");
      setExcluir(null);
      await carregar();
    } catch (e: any) {
      toast.error("Erro ao excluir: " + (e.message || e));
    }
  }

  const talhoesFormFiltrados = useMemo(
    () => talhoes.filter((t) => !form.fazenda_id || t.fazenda_id === form.fazenda_id),
    [talhoes, form.fazenda_id],
  );

  return (
    <div>
      <PageHeader
        titulo="Análise de Solo"
        subtitulo="Laudos agronômicos por talhão, com comparativo histórico e recomendações"
        icone="🧪"
        acoes={<button className="btn-primary" onClick={abrirNova}>+ Nova Análise</button>}
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b" style={{ borderColor: "var(--brd)" }}>
        {([
          ["lista", "📋 Lista"],
          ["comparativo", "📈 Comparativo"],
          ["recomendacoes", "💡 Recomendações"],
        ] as [Tab, string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setAba(k)}
            className="px-4 py-2 text-sm font-semibold"
            style={{
              color: aba === k ? "var(--dark)" : "var(--muted)",
              borderBottom: aba === k ? "2px solid var(--green)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ====== LISTA ====== */}
      {aba === "lista" && (
        <>
          <div className="grid-cards mb-4">
            <KpiCard rotulo="Análises"        valor={String(kpis.total)}      icone="📋" accent="blue" />
            <KpiCard rotulo="Pendentes"       valor={String(kpis.pendentes)}  icone="⏳" accent="orange" />
            <KpiCard rotulo="Concluídas"      valor={String(kpis.concluidas)} icone="✅" accent="green" />
            <KpiCard rotulo="Últ. laboratório" valor={kpis.ultimoLab as any}  icone="🔬" accent="purple" />
          </div>

          <div className="card mb-4">
            <div className="flex flex-wrap items-end gap-3">
              <div style={{ minWidth: 180 }}>
                <label className="label">Fazenda</label>
                <select className="input" value={filtroFazenda} onChange={(e) => { setFiltroFazenda(e.target.value); setFiltroTalhao(""); }}>
                  <option value="">Todas</option>
                  {fazendas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
              <div style={{ minWidth: 180 }}>
                <label className="label">Talhão</label>
                <select className="input" value={filtroTalhao} onChange={(e) => setFiltroTalhao(e.target.value)}>
                  <option value="">Todos</option>
                  {talhoes.filter((t) => !filtroFazenda || t.fazenda_id === filtroFazenda).map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>
              <div style={{ minWidth: 160 }}>
                <label className="label">Cultura ref.</label>
                <select className="input" value={filtroCultura} onChange={(e) => setFiltroCultura(e.target.value)}>
                  <option value="">Todas</option>
                  {CULTURAS_PADRAO.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">De</label>
                <input type="date" className="input" value={dataDe} onChange={(e) => setDataDe(e.target.value)} />
              </div>
              <div>
                <label className="label">Até</label>
                <input type="date" className="input" value={dataAte} onChange={(e) => setDataAte(e.target.value)} />
              </div>
              <button className="btn-ghost" onClick={() => {
                setFiltroFazenda(""); setFiltroTalhao(""); setFiltroCultura(""); setDataDe(""); setDataAte("");
              }}>Limpar</button>
            </div>
          </div>

          {carregando ? (
            <div className="card text-center" style={{ color: "var(--muted)", padding: 32 }}>Carregando...</div>
          ) : filtradas.length === 0 ? (
            <EmptyState
              icone="🧪"
              titulo="Nenhuma análise"
              descricao="Cadastre laudos de análise de solo para acompanhar a fertilidade dos talhões."
              acao={<button className="btn-primary" onClick={abrirNova}>+ Nova Análise</button>}
            />
          ) : (
            <div className="card" style={{ overflowX: "auto" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Data coleta</th>
                    <th>Fazenda</th>
                    <th>Talhão</th>
                    <th>Profundidade</th>
                    <th>Cultura ref.</th>
                    <th>Laboratório</th>
                    <th>Nº amostra</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((a) => {
                    const f = fazendas.find((x) => x.id === a.fazenda_id);
                    const t = talhoes.find((x) => x.id === a.talhao_id);
                    const st = STATUS_OPCOES.find((s) => s.v === a.status) || STATUS_OPCOES[0];
                    return (
                      <tr key={a.id}>
                        <td>{fmtData(a.data_coleta)}</td>
                        <td>{f?.nome || "—"}</td>
                        <td>{t?.nome || "—"}</td>
                        <td>{a.profundidade || "—"}</td>
                        <td>{a.cultura_referencia || "—"}</td>
                        <td>{a.laboratorio || "—"}</td>
                        <td>{a.numero_amostra || "—"}</td>
                        <td><span className={"badge " + st.badge}>{st.label}</span></td>
                        <td style={{ textAlign: "right" }}>
                          <button className="btn-ghost" onClick={() => abrirEditar(a)}>Editar</button>
                          <button className="btn-ghost" style={{ color: "var(--danger)" }} onClick={() => setExcluir(a)}>Excluir</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ====== COMPARATIVO ====== */}
      {aba === "comparativo" && (
        <>
          <div className="card mb-4">
            <div className="flex flex-wrap items-end gap-3">
              <div style={{ minWidth: 240 }}>
                <label className="label">Parâmetro</label>
                <select className="input" value={paramSel} onChange={(e) => setParamSel(e.target.value)}>
                  {GRUPOS_PARAMS.map((g) => (
                    <optgroup key={g.titulo} label={g.titulo}>
                      {g.params.map((p) => (
                        <option key={p.k} value={p.k}>{p.label} ({p.unidade || "—"})</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div style={{ minWidth: 200 }}>
                <label className="label">Talhão</label>
                <select className="input" value={talhaoCompare} onChange={(e) => setTalhaoCompare(e.target.value)}>
                  <option value="">Todos os talhões</option>
                  {talhoes.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
            </div>
          </div>

          {dadosCompare.length < 2 ? (
            <EmptyState icone="📈" titulo="Dados insuficientes" descricao="Precisa de pelo menos 2 análises com esse parâmetro para gerar o gráfico." />
          ) : (
            <div className="card">
              <h3 className="mb-3">Evolução de {TODOS_PARAMS.find((p) => p.k === paramSel)?.label}</h3>
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={dadosCompare}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dde8da" />
                  <XAxis dataKey="data" tickFormatter={(d) => fmtData(d)} />
                  <YAxis />
                  <Tooltip labelFormatter={(d) => fmtData(d as string)} />
                  <Legend />
                  <Line type="monotone" dataKey="valor" stroke="#7CB342" strokeWidth={2} dot={{ r: 4 }} name={paramSel} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* ====== RECOMENDACOES ====== */}
      {aba === "recomendacoes" && (
        <>
          {filtradas.length === 0 ? (
            <EmptyState icone="💡" titulo="Sem análises" descricao="Cadastre análises pra gerar recomendações automáticas." />
          ) : (
            <div className="space-y-3">
              {filtradas.slice(0, 20).map((a) => {
                const sugs = gerarRecomendacoes(a);
                const f = fazendas.find((x) => x.id === a.fazenda_id);
                const t = talhoes.find((x) => x.id === a.talhao_id);
                return (
                  <div key={a.id} className="card">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <strong>{f?.nome || "—"}</strong>
                        {t && <> · {t.nome}</>}
                        <span style={{ color: "var(--muted)", fontSize: 12 }}> · {fmtData(a.data_coleta)}</span>
                      </div>
                      <button className="btn-ghost" onClick={() => abrirEditar(a)}>Ver</button>
                    </div>
                    {a.recomendacoes && (
                      <div className="text-sm mb-2" style={{ color: "var(--text)" }}>
                        <strong>Laudo:</strong> {a.recomendacoes}
                      </div>
                    )}
                    {sugs.length === 0 ? (
                      <p className="text-sm" style={{ color: "var(--muted)" }}>Parâmetros dentro da faixa ideal. Sem recomendações automáticas.</p>
                    ) : (
                      <ul className="text-sm space-y-1" style={{ color: "var(--text)" }}>
                        {sugs.map((s, i) => <li key={i}>• {s}</li>)}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ============ MODAL FORM ============ */}
      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        titulo={form.id ? "Editar Análise" : "Nova Análise de Solo"}
        larguraMax={920}
        rodape={
          <>
            <button className="btn-ghost" onClick={() => setModalAberto(false)}>Cancelar</button>
            <button className="btn-primary" onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Fazenda *</label>
              <select className="input" value={form.fazenda_id} onChange={(e) => setForm({ ...form, fazenda_id: e.target.value, talhao_id: "" })}>
                <option value="">(Selecione)</option>
                {fazendas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Talhão</label>
              <select
                className="input"
                value={form.talhao_id}
                onChange={(e) => {
                  const novoTalhao = e.target.value;
                  const t = talhoesFormFiltrados.find((x) => x.id === novoTalhao);
                  setForm({
                    ...form,
                    talhao_id: novoTalhao,
                    // Autopreenche cultura_referencia com a cultura_atual do talhao se ainda vazio
                    cultura_referencia:
                      form.cultura_referencia || (t?.cultura_atual ?? "") || "",
                  });
                }}
              >
                <option value="">(Todos / fazenda)</option>
                {talhoesFormFiltrados.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Data coleta *</label>
              <input type="date" className="input" value={form.data_coleta} onChange={(e) => setForm({ ...form, data_coleta: e.target.value })} />
            </div>
            <div>
              <label className="label">Laboratório</label>
              <input className="input" value={form.laboratorio} onChange={(e) => setForm({ ...form, laboratorio: e.target.value })} />
            </div>
            <div>
              <label className="label">Nº amostra</label>
              <input className="input" value={form.numero_amostra} onChange={(e) => setForm({ ...form, numero_amostra: e.target.value })} />
            </div>
            <div>
              <label className="label">Profundidade</label>
              <select className="input" value={form.profundidade} onChange={(e) => setForm({ ...form, profundidade: e.target.value })}>
                <option value="0-20cm">0-20 cm</option>
                <option value="20-40cm">20-40 cm</option>
                <option value="40-60cm">40-60 cm</option>
                <option value="0-10cm">0-10 cm</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="label">Cultura ref.</label>
              <select className="input" value={form.cultura_referencia} onChange={(e) => setForm({ ...form, cultura_referencia: e.target.value })}>
                <option value="">(Nenhuma)</option>
                {CULTURAS_PADRAO.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPCOES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {GRUPOS_PARAMS.map((grupo) => (
            <div key={grupo.titulo}>
              <div className="text-caps mb-2">{grupo.titulo}</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {grupo.params.map((p) => {
                  const valStr = form.resultados[p.k] || "";
                  const valNum = parseFloat(valStr);
                  const cls = !isNaN(valNum) ? classificar(p, valNum) : "sem_ref";
                  const cor = cls === "ideal" ? "var(--success)"
                            : cls === "abaixo" ? "var(--warn)"
                            : cls === "acima" ? "var(--danger)"
                            : "var(--brd)";
                  return (
                    <div key={p.k}>
                      <label className="label" title={p.label}>
                        {p.label}
                        {p.unidade && <span style={{ color: "var(--dim)", fontWeight: 400 }}> ({p.unidade})</span>}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="input"
                        value={valStr}
                        onChange={(e) => setForm({
                          ...form,
                          resultados: { ...form.resultados, [p.k]: e.target.value },
                        })}
                        style={{ borderColor: cls !== "sem_ref" && valStr ? cor : undefined }}
                      />
                      {p.ideal && (
                        <div className="text-xs mt-0.5" style={{ color: "var(--dim)" }}>
                          ideal {p.ideal[0]}–{p.ideal[1]}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <label className="label">Recomendações do laudo</label>
            <textarea className="input" rows={2} value={form.recomendacoes} onChange={(e) => setForm({ ...form, recomendacoes: e.target.value })} />
          </div>
          <div>
            <label className="label">Observações</label>
            <textarea className="input" rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!excluir}
        titulo="Excluir análise?"
        mensagem="Esta ação não pode ser desfeita. Tem certeza?"
        textoConfirmar="Excluir"
        destrutivo
        onConfirmar={confirmarExcluir}
        onCancelar={() => setExcluir(null)}
      />
    </div>
  );
}
