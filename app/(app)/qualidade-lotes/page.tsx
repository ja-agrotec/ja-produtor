"use client";

// Qualidade de Lotes — análise detalhada com CRUD e comparativo.
// Portado de modules/admin-qualidade-lotes.js.

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase";
import type { Fazenda, QualidadeRegistro, Safra, Talhao } from "@/lib/types";
import { fmtData, hoje } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type ParamDef = {
  k: string;
  l: string;
  tipo: "number" | "text" | "textarea";
  un: string;
  alertaAcima?: number;
  alertaAbaixo?: number;
};

const CULTURA_PARAMS: Record<string, ParamDef[]> = {
  cafe: [
    { k: "umidade", l: "Umidade", tipo: "number", un: "%", alertaAcima: 12 },
    { k: "peneira", l: "Peneira", tipo: "text", un: "" },
    { k: "bebida", l: "Prova de Bebida", tipo: "number", un: "pts", alertaAbaixo: 80 },
    { k: "defeitos", l: "Defeitos", tipo: "number", un: "d/300g", alertaAcima: 360 },
    { k: "tipo", l: "Tipo (4/5/6)", tipo: "text", un: "" },
    { k: "impureza", l: "Impurezas", tipo: "number", un: "%", alertaAcima: 1 },
    { k: "classificacao", l: "Classificação", tipo: "text", un: "" },
  ],
  soja: [
    { k: "umidade", l: "Umidade", tipo: "number", un: "%", alertaAcima: 14 },
    { k: "impureza", l: "Impurezas", tipo: "number", un: "%", alertaAcima: 1 },
    { k: "avariados", l: "Avariados", tipo: "number", un: "%", alertaAcima: 8 },
    { k: "proteina", l: "Proteína", tipo: "number", un: "%", alertaAbaixo: 36 },
    { k: "oleo", l: "Óleo", tipo: "number", un: "%", alertaAbaixo: 18 },
  ],
  milho: [
    { k: "umidade", l: "Umidade", tipo: "number", un: "%", alertaAcima: 14 },
    { k: "ardidos", l: "Ardidos", tipo: "number", un: "%", alertaAcima: 6 },
    { k: "quebrados", l: "Quebrados", tipo: "number", un: "%", alertaAcima: 6 },
    { k: "esverdeados", l: "Esverdeados", tipo: "number", un: "%", alertaAcima: 4 },
    { k: "ph", l: "Peso Hectolítrico", tipo: "number", un: "kg", alertaAbaixo: 72 },
  ],
  cana: [
    { k: "atr", l: "ATR", tipo: "number", un: "kg/t", alertaAbaixo: 120 },
    { k: "brix", l: "Brix", tipo: "number", un: "%", alertaAbaixo: 16 },
    { k: "pol", l: "Pol", tipo: "number", un: "%", alertaAbaixo: 14 },
    { k: "fibra", l: "Fibra", tipo: "number", un: "%", alertaAcima: 14 },
    { k: "pureza", l: "Pureza", tipo: "number", un: "%", alertaAbaixo: 85 },
  ],
};

const CULTURAS_TABS = [
  { v: "cafe", n: "Café", icon: "☕" },
  { v: "soja", n: "Soja", icon: "🌱" },
  { v: "milho", n: "Milho", icon: "🌽" },
  { v: "cana", n: "Cana", icon: "🎋" },
];

type FormState = {
  fazenda_id: string;
  safra_id: string;
  talhao_id: string;
  cultura: string;
  data_registro: string;
  lote_ref: string;
  responsavel: string;
  observacoes: string;
  dados: Record<string, string>;
};

const FORM_VAZIO: FormState = {
  fazenda_id: "",
  safra_id: "",
  talhao_id: "",
  cultura: "cafe",
  data_registro: hoje(),
  lote_ref: "",
  responsavel: "",
  observacoes: "",
  dados: {},
};

export default function QualidadeLotesPage() {
  const [carregando, setCarregando] = useState(true);
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [safras, setSafras] = useState<Safra[]>([]);
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [registros, setRegistros] = useState<QualidadeRegistro[]>([]);

  // Filtros
  const [cultura, setCultura] = useState("cafe");
  const [busca, setBusca] = useState("");
  const [dataIni, setDataIni] = useState("");
  const [dataFim, setDataFim] = useState("");

  // CRUD
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<QualidadeRegistro | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [confirmarDel, setConfirmarDel] = useState<QualidadeRegistro | null>(null);

  // Comparativo
  const [comparando, setComparando] = useState<string[]>([]);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    const sb = getSupabase();
    const [rFaz, rSaf, rTal, rReg] = await Promise.all([
      sb.from("fazendas").select("*").eq("ativo", true).order("nome"),
      sb.from("safras").select("*").order("nome"),
      sb.from("talhoes").select("*").eq("ativo", true).order("nome"),
      sb
        .from("qualidade_registro")
        .select("*")
        .order("data_registro", { ascending: false }),
    ]);
    setFazendas((rFaz.data || []) as Fazenda[]);
    setSafras((rSaf.data || []) as Safra[]);
    setTalhoes((rTal.data || []) as Talhao[]);
    setRegistros((rReg.data || []) as QualidadeRegistro[]);
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

  const registrosFiltrados = useMemo(() => {
    return registros.filter((r) => {
      if (r.cultura !== cultura) return false;
      if (dataIni && r.data_registro < dataIni) return false;
      if (dataFim && r.data_registro > dataFim) return false;
      if (busca) {
        const lote = String(r.dados_qualidade?._lote_ref || "").toLowerCase();
        const safraNome = (safMap[r.safra_id || ""]?.nome || "").toLowerCase();
        if (!lote.includes(busca.toLowerCase()) && !safraNome.includes(busca.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [registros, cultura, busca, dataIni, dataFim, safMap]);

  // Comparativo (BarChart)
  const dadosComparativo = useMemo(() => {
    const sel = registros.filter((r) => comparando.includes(r.id));
    if (sel.length < 2) return [];
    const params = CULTURA_PARAMS[cultura] || [];
    return params
      .filter((p) => p.tipo === "number")
      .map((p) => {
        const linha: any = { parametro: p.l };
        sel.forEach((r, idx) => {
          const v = r.dados_qualidade?.[p.k];
          linha[`Lote ${idx + 1}`] = typeof v === "number" ? v : parseFloat(v) || 0;
        });
        return linha;
      });
  }, [registros, comparando, cultura]);

  function toggleComparar(id: string) {
    setComparando((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 4),
    );
  }

  function abrirNovo() {
    setEditando(null);
    setForm({ ...FORM_VAZIO, cultura, data_registro: hoje() });
    setModalAberto(true);
  }

  function abrirEditar(r: QualidadeRegistro) {
    const dq = r.dados_qualidade || {};
    const dadosLimpos: Record<string, string> = {};
    Object.keys(dq).forEach((k) => {
      if (!k.startsWith("_")) dadosLimpos[k] = String(dq[k] ?? "");
    });
    setEditando(r);
    setForm({
      fazenda_id: r.fazenda_id || "",
      safra_id: r.safra_id || "",
      talhao_id: String(dq._talhao_id || ""),
      cultura: r.cultura || "cafe",
      data_registro: r.data_registro || hoje(),
      lote_ref: String(dq._lote_ref || ""),
      responsavel: String(dq._responsavel || ""),
      observacoes: r.observacoes || "",
      dados: dadosLimpos,
    });
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.fazenda_id || !form.cultura || !form.data_registro) {
      toast.error("Preencha fazenda, cultura e data");
      return;
    }
    setSalvando(true);
    const sb = getSupabase();
    const params = CULTURA_PARAMS[form.cultura] || [];
    const dq: Record<string, any> = {};
    params.forEach((p) => {
      const v = form.dados[p.k];
      if (v !== undefined && v !== "") {
        dq[p.k] = p.tipo === "number" ? parseFloat(v) : v;
      }
    });
    if (form.lote_ref) dq._lote_ref = form.lote_ref;
    if (form.talhao_id) dq._talhao_id = form.talhao_id;
    if (form.responsavel) dq._responsavel = form.responsavel;

    // qualidade_registro nao tem colunas talhao_id nem responsavel no banco real.
    // Persistimos esses dois dentro de dados_qualidade como _talhao_id / _responsavel.
    const payload = {
      fazenda_id: form.fazenda_id,
      safra_id: form.safra_id || null,
      cultura: form.cultura,
      data_registro: form.data_registro,
      dados_qualidade: dq,
      observacoes: form.observacoes || null,
    };

    const r = editando
      ? await sb.from("qualidade_registro").update(payload).eq("id", editando.id)
      : await sb.from("qualidade_registro").insert(payload);
    setSalvando(false);
    if (r.error) {
      toast.error("Erro: " + r.error.message);
      return;
    }
    toast.success(editando ? "Registro atualizado!" : "Registro criado!");
    setModalAberto(false);
    carregar();
  }

  async function excluir() {
    if (!confirmarDel) return;
    const sb = getSupabase();
    const r = await sb.from("qualidade_registro").delete().eq("id", confirmarDel.id);
    if (r.error) {
      toast.error("Erro: " + r.error.message);
      return;
    }
    toast.success("Registro excluído");
    setConfirmarDel(null);
    carregar();
  }

  function temAlerta(r: QualidadeRegistro, p: ParamDef): boolean {
    const v = r.dados_qualidade?.[p.k];
    if (typeof v !== "number" && isNaN(parseFloat(v))) return false;
    const num = typeof v === "number" ? v : parseFloat(v);
    if (p.alertaAcima && num > p.alertaAcima) return true;
    if (p.alertaAbaixo && num < p.alertaAbaixo) return true;
    return false;
  }

  const paramsAtuais = CULTURA_PARAMS[cultura] || [];

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Qualidade de Lotes"
        icone="📋"
        subtitulo="Análise detalhada de lotes com parâmetros por cultura"
        acoes={
          <button className="btn-primary" onClick={abrirNovo}>
            + Nova Análise
          </button>
        }
      />

      {/* Abas por cultura */}
      <div className="flex gap-2 flex-wrap">
        {CULTURAS_TABS.map((t) => (
          <button
            key={t.v}
            className={cultura === t.v ? "btn-primary" : "btn-ghost"}
            onClick={() => {
              setCultura(t.v);
              setComparando([]);
            }}
          >
            {t.icon} {t.n}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="card flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">Busca (lote / safra)</label>
          <input
            className="input"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Ex: L-2024-001"
            style={{ minWidth: 220 }}
          />
        </div>
        <div>
          <label className="label">De</label>
          <input
            type="date"
            className="input"
            value={dataIni}
            onChange={(e) => setDataIni(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Até</label>
          <input
            type="date"
            className="input"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </div>
        <div className="text-sm ml-auto" style={{ color: "var(--muted)" }}>
          {registrosFiltrados.length} registro(s)
        </div>
      </div>

      {/* Comparativo */}
      {comparando.length >= 2 && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>
            📊 Comparativo entre {comparando.length} lote(s)
          </h3>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={dadosComparativo}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="parametro" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                {comparando.map((_, idx) => (
                  <Bar
                    key={idx}
                    dataKey={`Lote ${idx + 1}`}
                    fill={["#7CB342", "#1565c0", "#f57c00", "#6a1b9a"][idx % 4]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <button className="btn-ghost mt-2" onClick={() => setComparando([])}>
            Limpar seleção
          </button>
        </div>
      )}

      {carregando ? (
        <p style={{ color: "var(--muted)" }}>Carregando registros...</p>
      ) : registrosFiltrados.length === 0 ? (
        <EmptyState
          icone="📋"
          titulo="Nenhuma análise para esta cultura"
          descricao="Clique em + Nova Análise para começar."
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>✓</th>
                <th>Data</th>
                <th>Lote</th>
                <th>Fazenda</th>
                <th>Safra</th>
                {paramsAtuais.slice(0, 4).map((p) => (
                  <th key={p.k}>{p.l}</th>
                ))}
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.map((r) => {
                const dq = r.dados_qualidade || {};
                const safra = safMap[r.safra_id || ""];
                return (
                  <tr key={r.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={comparando.includes(r.id)}
                        onChange={() => toggleComparar(r.id)}
                      />
                    </td>
                    <td>{fmtData(r.data_registro)}</td>
                    <td>{dq._lote_ref || "—"}</td>
                    <td>{fazMap[r.fazenda_id] || "—"}</td>
                    <td>{safra?.nome || "—"}</td>
                    {paramsAtuais.slice(0, 4).map((p) => {
                      const v = dq[p.k];
                      const alerta = temAlerta(r, p);
                      return (
                        <td key={p.k}>
                          {v !== undefined && v !== "" ? (
                            <span
                              style={{
                                color: alerta ? "#e53935" : "var(--text)",
                                fontWeight: alerta ? 700 : 400,
                              }}
                            >
                              {v} {p.un}
                              {alerta ? " ⚠" : ""}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      );
                    })}
                    <td>
                      <div className="flex gap-1">
                        <button className="btn-ghost" onClick={() => abrirEditar(r)}>
                          Editar
                        </button>
                        <button className="btn-danger" onClick={() => setConfirmarDel(r)}>
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal CRUD */}
      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        titulo={editando ? "Editar Análise" : "Nova Análise"}
        larguraMax={720}
        rodape={
          <>
            <button className="btn-ghost" onClick={() => setModalAberto(false)} disabled={salvando}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Cultura *</label>
              <select
                className="input"
                value={form.cultura}
                onChange={(e) => setForm({ ...form, cultura: e.target.value, dados: {} })}
              >
                {CULTURAS_TABS.map((t) => (
                  <option key={t.v} value={t.v}>
                    {t.icon} {t.n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Data *</label>
              <input
                type="date"
                className="input"
                value={form.data_registro}
                onChange={(e) => setForm({ ...form, data_registro: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Fazenda *</label>
              <select
                className="input"
                value={form.fazenda_id}
                onChange={(e) => setForm({ ...form, fazenda_id: e.target.value, safra_id: "", talhao_id: "" })}
              >
                <option value="">Selecione...</option>
                {fazendas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Safra</label>
              <select
                className="input"
                value={form.safra_id}
                onChange={(e) => setForm({ ...form, safra_id: e.target.value })}
                disabled={!form.fazenda_id}
              >
                <option value="">Sem safra</option>
                {safras
                  .filter((s) => s.fazenda_id === form.fazenda_id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} ({s.ano_agricola || ""})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="label">Talhão</label>
              <select
                className="input"
                value={form.talhao_id}
                onChange={(e) => setForm({ ...form, talhao_id: e.target.value })}
                disabled={!form.fazenda_id}
              >
                <option value="">Sem talhão</option>
                {talhoes
                  .filter((t) => t.fazenda_id === form.fazenda_id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="label">Lote / Referência</label>
              <input
                className="input"
                value={form.lote_ref}
                onChange={(e) => setForm({ ...form, lote_ref: e.target.value })}
                placeholder="Ex: L-2024-001"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Responsável / Laboratório</label>
              <input
                className="input"
                value={form.responsavel}
                onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
              />
            </div>
          </div>

          <h3 className="mt-2">Parâmetros — {cultura.toUpperCase()}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(CULTURA_PARAMS[form.cultura] || []).map((p) => (
              <div key={p.k}>
                <label className="label">
                  {p.l} {p.un && <span style={{ color: "var(--muted)" }}>({p.un})</span>}
                </label>
                {p.tipo === "textarea" ? (
                  <textarea
                    className="input"
                    rows={2}
                    value={form.dados[p.k] || ""}
                    onChange={(e) =>
                      setForm({ ...form, dados: { ...form.dados, [p.k]: e.target.value } })
                    }
                  />
                ) : (
                  <input
                    className="input"
                    type={p.tipo === "number" ? "number" : "text"}
                    step={p.tipo === "number" ? "0.01" : undefined}
                    value={form.dados[p.k] || ""}
                    onChange={(e) =>
                      setForm({ ...form, dados: { ...form.dados, [p.k]: e.target.value } })
                    }
                  />
                )}
              </div>
            ))}
          </div>

          <div>
            <label className="label">Observações</label>
            <textarea
              className="input"
              rows={3}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmarDel}
        titulo="Excluir registro?"
        mensagem={`Esta ação não pode ser desfeita. Confirma excluir o registro de ${fmtData(
          confirmarDel?.data_registro,
        )}?`}
        destrutivo
        textoConfirmar="Excluir"
        onCancelar={() => setConfirmarDel(null)}
        onConfirmar={excluir}
      />
    </div>
  );
}
