"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";
import type {
  Lancamento,
  Fazenda,
  Safra,
  Talhao,
  Categoria,
  Insumo,
  Maquina,
  Operador,
  TipoLancamento,
} from "@/lib/types";
import { fmtBRL, fmtData, fmtInt, hoje } from "@/lib/format";
import { LS_OFFLINE_QUEUE, UNIDADES_PADRAO } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import KpiCard from "@/components/ui/KpiCard";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// ============================================================
// Pagina de Lancamentos — porta admin-lancamentos.js
// Tabela com filtros combinados (periodo, fazenda, safra cascata,
// talhao cascata, categoria, tipo). 4 KPIs em tempo real.
// Modal de novo/editar com aviso de certificacao.
// Suporte offline: insere na fila local quando navigator.onLine=false.
// ============================================================

type LancamentoFull = Lancamento & {
  fazendas?: { nome: string } | null;
  safras?: { nome: string } | null;
  talhoes?: { nome: string; segue_certificacao?: boolean | null } | null;
  categorias_lancamento?: { nome: string; tipo: TipoLancamento } | null;
  insumos?: { nome: string } | null;
  maquinas?: { nome: string } | null;
  operadores?: { nome: string } | null;
};

type FormState = {
  fazenda_id: string;
  safra_id: string;
  talhao_id: string;
  categoria_id: string;
  tipo: TipoLancamento;
  data_lancamento: string;
  descricao: string;
  insumo_id: string;
  quantidade: string;
  unidade: string;
  custo_unitario: string;
  custo_total: string;
  operador_id: string;
  maquina_id: string;
  observacoes: string;
  nota_fiscal: string;
};

function novoForm(): FormState {
  return {
    fazenda_id: "",
    safra_id: "",
    talhao_id: "",
    categoria_id: "",
    tipo: "despesa",
    data_lancamento: hoje(),
    descricao: "",
    insumo_id: "",
    quantidade: "",
    unidade: "",
    custo_unitario: "",
    custo_total: "",
    operador_id: "",
    maquina_id: "",
    observacoes: "",
    nota_fiscal: "",
  };
}

export default function LancamentosPage() {
  const [lancamentos, setLancamentos] = useState<LancamentoFull[]>([]);
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [safras, setSafras] = useState<Safra[]>([]);
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Filtros combinados
  const [filtDataDe, setFiltDataDe] = useState("");
  const [filtDataAte, setFiltDataAte] = useState("");
  const [filtFazenda, setFiltFazenda] = useState("");
  const [filtSafra, setFiltSafra] = useState("");
  const [filtTalhao, setFiltTalhao] = useState("");
  const [filtCategoria, setFiltCategoria] = useState("");
  const [filtTipo, setFiltTipo] = useState<"" | TipoLancamento>("");
  const [busca, setBusca] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<LancamentoFull | null>(null);
  const [form, setForm] = useState<FormState>(novoForm());
  const [salvando, setSalvando] = useState(false);
  const [avisoCertificacao, setAvisoCertificacao] = useState<string | null>(null);

  const [confirm, setConfirm] = useState<{ aberto: boolean; lanc: LancamentoFull | null }>({
    aberto: false,
    lanc: null,
  });

  const [filaOffline, setFilaOffline] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);

  // -- recarrega fila offline --
  const atualizarFila = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(LS_OFFLINE_QUEUE);
      const arr = raw ? JSON.parse(raw) : [];
      setFilaOffline(Array.isArray(arr) ? arr.length : 0);
    } catch {
      setFilaOffline(0);
    }
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const sb = getSupabase();
      const [rFaz, rSaf, rTal, rCat, rIns, rMaq, rOp, rLan] = await Promise.all([
        sb.from("fazendas").select("*").eq("ativo", true).order("nome"),
        sb.from("safras").select("*").order("nome"),
        sb.from("talhoes").select("*").eq("ativo", true).order("nome"),
        sb.from("categorias_lancamento").select("*").order("nome"),
        sb.from("insumos").select("*").eq("ativo", true).order("nome"),
        sb.from("maquinas").select("*").eq("ativo", true).order("nome"),
        sb.from("operadores").select("*").eq("ativo", true).order("nome"),
        sb
          .from("lancamentos")
          .select(
            "*, fazendas(nome), safras(nome), talhoes(nome, segue_certificacao), categorias_lancamento:categoria_id(nome,tipo), insumos(nome), maquinas(nome), operadores(nome)",
          )
          .order("data_lancamento", { ascending: false })
          .limit(500),
      ]);
      if (rFaz.error) throw rFaz.error;
      if (rLan.error) throw rLan.error;
      setFazendas((rFaz.data || []) as Fazenda[]);
      setSafras((rSaf.data || []) as Safra[]);
      setTalhoes((rTal.data || []) as Talhao[]);
      setCategorias((rCat.data || []) as Categoria[]);
      setInsumos((rIns.data || []) as Insumo[]);
      setMaquinas((rMaq.data || []) as Maquina[]);
      setOperadores((rOp.data || []) as Operador[]);
      setLancamentos((rLan.data || []) as LancamentoFull[]);
    } catch (e: any) {
      toast.error("Erro ao carregar lancamentos: " + (e?.message || e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
    atualizarFila();
  }, [carregar, atualizarFila]);

  // Safras filtradas em cascata pela fazenda do filtro
  const safrasFiltro = useMemo(() => {
    if (!filtFazenda) return safras;
    return safras.filter((s) => s.fazenda_id === filtFazenda);
  }, [safras, filtFazenda]);

  // Talhoes filtrados em cascata pela fazenda do filtro
  const talhoesFiltro = useMemo(() => {
    if (!filtFazenda) return talhoes;
    return talhoes.filter((t) => t.fazenda_id === filtFazenda);
  }, [talhoes, filtFazenda]);

  // Aplica filtros combinados
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lancamentos.filter((l) => {
      if (filtDataDe && (l.data_lancamento || "") < filtDataDe) return false;
      if (filtDataAte && (l.data_lancamento || "") > filtDataAte) return false;
      if (filtFazenda && l.fazenda_id !== filtFazenda) return false;
      if (filtSafra && l.safra_id !== filtSafra) return false;
      if (filtTalhao && l.talhao_id !== filtTalhao) return false;
      if (filtCategoria && l.categoria_id !== filtCategoria) return false;
      if (filtTipo && l.tipo !== filtTipo) return false;
      if (q) {
        const hay = `${l.descricao || ""} ${l.nota_fiscal || ""} ${l.observacoes || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    lancamentos,
    filtDataDe,
    filtDataAte,
    filtFazenda,
    filtSafra,
    filtTalhao,
    filtCategoria,
    filtTipo,
    busca,
  ]);

  // KPIs em tempo real sobre os filtrados
  const kpis = useMemo(() => {
    const despesas = filtrados.filter((l) => l.tipo === "despesa").reduce((a, l) => a + Number(l.custo_total || 0), 0);
    const receitas = filtrados.filter((l) => l.tipo === "receita").reduce((a, l) => a + Number(l.custo_total || 0), 0);
    return {
      despesas,
      receitas,
      saldo: receitas - despesas,
      qtd: filtrados.length,
    };
  }, [filtrados]);

  // ---- Filtros em cascata na ABA DE FILTRO ----
  function setFazendaFiltro(v: string) {
    setFiltFazenda(v);
    setFiltSafra("");
    setFiltTalhao("");
  }

  // ---- Form: form em cascata por fazenda ----
  const safrasForm = useMemo(() => {
    if (!form.fazenda_id) return [] as Safra[];
    return safras.filter((s) => s.fazenda_id === form.fazenda_id);
  }, [safras, form.fazenda_id]);

  const talhoesForm = useMemo(() => {
    if (!form.fazenda_id) return [] as Talhao[];
    return talhoes.filter((t) => t.fazenda_id === form.fazenda_id);
  }, [talhoes, form.fazenda_id]);

  const operadoresForm = useMemo(() => {
    if (!form.fazenda_id) return operadores;
    return operadores.filter((o) => !o.fazenda_id || o.fazenda_id === form.fazenda_id);
  }, [operadores, form.fazenda_id]);

  const maquinasForm = useMemo(() => {
    if (!form.fazenda_id) return maquinas;
    return maquinas.filter((m) => !m.fazenda_id || m.fazenda_id === form.fazenda_id);
  }, [maquinas, form.fazenda_id]);

  const categoriasForm = useMemo(
    () => categorias.filter((c) => !c.tipo || c.tipo === form.tipo),
    [categorias, form.tipo],
  );

  // Aviso de certificacao baseado em talhao + insumo
  useEffect(() => {
    if (!form.talhao_id || !form.insumo_id) {
      setAvisoCertificacao(null);
      return;
    }
    const tal = talhoes.find((t) => t.id === form.talhao_id);
    const ins = insumos.find((i) => i.id === form.insumo_id);
    if (!tal || !ins) {
      setAvisoCertificacao(null);
      return;
    }
    if (tal.segue_certificacao && ins.certificacao_permitida === false) {
      setAvisoCertificacao(
        `O talhao "${tal.nome}" segue regras de certificacao e o insumo "${ins.nome}" NAO esta permitido. Voce pode salvar mesmo assim, mas a operacao sera marcada como nao conforme.`,
      );
    } else {
      setAvisoCertificacao(null);
    }
  }, [form.talhao_id, form.insumo_id, talhoes, insumos]);

  function abrirNovo() {
    setEditando(null);
    setForm(novoForm());
    setModalAberto(true);
  }

  function abrirEditar(l: LancamentoFull) {
    setEditando(l);
    setForm({
      fazenda_id: l.fazenda_id || "",
      safra_id: l.safra_id || "",
      talhao_id: l.talhao_id || "",
      categoria_id: l.categoria_id || "",
      tipo: (l.tipo || "despesa") as TipoLancamento,
      data_lancamento: (l.data_lancamento || hoje()).substring(0, 10),
      descricao: l.descricao || "",
      insumo_id: l.insumo_id || "",
      quantidade: l.quantidade != null ? String(l.quantidade) : "",
      unidade: l.unidade || "",
      custo_unitario: l.custo_unitario != null ? String(l.custo_unitario) : "",
      custo_total: l.custo_total != null ? String(l.custo_total) : "",
      operador_id: l.operador_id || "",
      maquina_id: l.maquina_id || "",
      observacoes: l.observacoes || "",
      nota_fiscal: l.nota_fiscal || "",
    });
    setModalAberto(true);
  }

  function enfileirarOffline(payload: any) {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(LS_OFFLINE_QUEUE);
      const arr = raw ? JSON.parse(raw) : [];
      arr.push(payload);
      localStorage.setItem(LS_OFFLINE_QUEUE, JSON.stringify(arr));
      atualizarFila();
    } catch (e) {
      console.error("Erro ao enfileirar", e);
    }
  }

  async function salvar() {
    if (!form.fazenda_id) {
      toast.error("Selecione a fazenda");
      return;
    }
    if (!form.categoria_id) {
      toast.error("Selecione a categoria");
      return;
    }
    if (!form.data_lancamento) {
      toast.error("Informe a data");
      return;
    }
    const custoTotalNum = Number(form.custo_total);
    if (!form.custo_total || isNaN(custoTotalNum) || custoTotalNum <= 0) {
      toast.error("Informe o custo total");
      return;
    }
    setSalvando(true);
    try {
      const payload: any = {
        fazenda_id: form.fazenda_id,
        safra_id: form.safra_id || null,
        talhao_id: form.talhao_id || null,
        categoria_id: form.categoria_id,
        tipo: form.tipo,
        data_lancamento: form.data_lancamento,
        descricao: form.descricao.trim() || null,
        insumo_id: form.insumo_id || null,
        quantidade: form.quantidade ? Number(form.quantidade) : null,
        unidade: form.unidade || null,
        custo_unitario: form.custo_unitario ? Number(form.custo_unitario) : null,
        custo_total: custoTotalNum,
        operador_id: form.operador_id || null,
        maquina_id: form.maquina_id || null,
        observacoes: form.observacoes.trim() || null,
        nota_fiscal: form.nota_fiscal.trim() || null,
      };

      const sb = getSupabase();
      if (editando) {
        const r = await sb.from("lancamentos").update(payload).eq("id", editando.id);
        if (r.error) throw r.error;
        toast.success("Lancamento atualizado");
      } else {
        // Suporte offline
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          enfileirarOffline(payload);
          toast.info("Sem conexao — lancamento enviado para a fila offline");
        } else {
          const r = await sb.from("lancamentos").insert(payload);
          if (r.error) throw r.error;
          toast.success("Lancamento registrado");
        }
      }
      setModalAberto(false);
      void carregar();
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e?.message || e));
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    const l = confirm.lanc;
    if (!l) return;
    try {
      const sb = getSupabase();
      // Lancamentos nao tem coluna ativo — exclusao real (preserva consistencia de triggers)
      const r = await sb.from("lancamentos").delete().eq("id", l.id);
      if (r.error) throw r.error;
      toast.success("Lancamento removido");
      setConfirm({ aberto: false, lanc: null });
      void carregar();
    } catch (e: any) {
      toast.error("Erro ao excluir: " + (e?.message || e));
    }
  }

  async function sincronizarOffline() {
    if (typeof window === "undefined") return;
    setSincronizando(true);
    try {
      const raw = localStorage.getItem(LS_OFFLINE_QUEUE);
      const arr: any[] = raw ? JSON.parse(raw) : [];
      if (!arr.length) {
        toast.info("Nenhum lancamento pendente");
        setSincronizando(false);
        return;
      }
      const sb = getSupabase();
      const r = await sb.from("lancamentos").insert(arr);
      if (r.error) throw r.error;
      localStorage.removeItem(LS_OFFLINE_QUEUE);
      atualizarFila();
      toast.success(`${arr.length} lancamento(s) sincronizado(s)`);
      void carregar();
    } catch (e: any) {
      toast.error("Erro ao sincronizar: " + (e?.message || e));
    } finally {
      setSincronizando(false);
    }
  }

  // Auto-calcula custo_total quando quantidade + custo_unitario preenchidos
  function recalcCusto(qtd: string, custoUnit: string) {
    const q = Number(qtd);
    const u = Number(custoUnit);
    if (!isNaN(q) && !isNaN(u) && q > 0 && u > 0) {
      setForm((f) => ({ ...f, quantidade: qtd, custo_unitario: custoUnit, custo_total: (q * u).toFixed(2) }));
    } else {
      setForm((f) => ({ ...f, quantidade: qtd, custo_unitario: custoUnit }));
    }
  }

  // Auto-preenche unidade e preco ao escolher insumo
  function onChangeInsumo(insId: string) {
    const ins = insumos.find((i) => i.id === insId);
    setForm((f) => ({
      ...f,
      insumo_id: insId,
      unidade: ins?.unidade || f.unidade,
      custo_unitario: ins?.preco_unitario != null ? String(ins.preco_unitario) : f.custo_unitario,
    }));
  }

  return (
    <div>
      <PageHeader
        titulo="Lancamentos"
        subtitulo="Registro de custos, receitas e operacoes"
        icone="📋"
        acoes={
          <div className="flex gap-2 flex-wrap">
            {filaOffline > 0 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={sincronizarOffline}
                disabled={sincronizando}
              >
                {sincronizando ? "Sincronizando..." : `🔄 Sincronizar Offline (${filaOffline})`}
              </button>
            )}
            <button type="button" className="btn-primary" onClick={abrirNovo}>
              + Novo Lancamento
            </button>
          </div>
        }
      />

      {/* KPIs em tempo real */}
      <div className="grid-cards mb-6">
        <KpiCard rotulo="Total Despesas" valor={fmtBRL(kpis.despesas)} icone="🔻" accent="red" />
        <KpiCard rotulo="Total Receitas" valor={fmtBRL(kpis.receitas)} icone="💵" accent="green" />
        <KpiCard
          rotulo="Saldo"
          valor={fmtBRL(kpis.saldo)}
          icone={kpis.saldo >= 0 ? "📈" : "📉"}
          accent={kpis.saldo >= 0 ? "green" : "red"}
        />
        <KpiCard rotulo="Lancamentos" valor={fmtInt(kpis.qtd)} icone="📋" accent="blue" />
      </div>

      {/* Filtros */}
      <div className="card mb-6">
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <div>
            <label className="label">Periodo de</label>
            <input
              className="input"
              type="date"
              value={filtDataDe}
              onChange={(e) => setFiltDataDe(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Periodo ate</label>
            <input
              className="input"
              type="date"
              value={filtDataAte}
              onChange={(e) => setFiltDataAte(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Fazenda</label>
            <select className="input" value={filtFazenda} onChange={(e) => setFazendaFiltro(e.target.value)}>
              <option value="">Todas</option>
              {fazendas.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Safra</label>
            <select className="input" value={filtSafra} onChange={(e) => setFiltSafra(e.target.value)}>
              <option value="">Todas</option>
              {safrasFiltro.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Talhao</label>
            <select className="input" value={filtTalhao} onChange={(e) => setFiltTalhao(e.target.value)}>
              <option value="">Todos</option>
              {talhoesFiltro.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Categoria</label>
            <select
              className="input"
              value={filtCategoria}
              onChange={(e) => setFiltCategoria(e.target.value)}
            >
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={filtTipo} onChange={(e) => setFiltTipo(e.target.value as any)}>
              <option value="">Todos</option>
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
            </select>
          </div>
          <div>
            <label className="label">Buscar</label>
            <input
              className="input"
              placeholder="Descricao, NF, obs..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tabela */}
      {carregando ? (
        <div className="card text-center py-10" style={{ color: "var(--muted)" }}>
          Carregando...
        </div>
      ) : filtrados.length === 0 ? (
        <EmptyState
          icone="📋"
          titulo="Nenhum lancamento encontrado"
          descricao="Ajuste os filtros ou cadastre um novo lancamento."
          acao={
            <button type="button" className="btn-primary" onClick={abrirNovo}>
              + Novo Lancamento
            </button>
          }
        />
      ) : (
        <div className="card overflow-x-auto" style={{ padding: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Descricao</th>
                <th>Fazenda / Talhao</th>
                <th>Maquina / Operador</th>
                <th style={{ textAlign: "right" }}>Valor</th>
                <th style={{ textAlign: "center" }}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((l) => {
                const cor = l.tipo === "despesa" ? "var(--danger)" : "var(--success)";
                return (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtData(l.data_lancamento)}</td>
                    <td>
                      <span className={`badge ${l.tipo === "despesa" ? "badge-danger" : "badge-success"}`}>
                        {l.tipo === "despesa" ? "Despesa" : "Receita"}
                      </span>
                    </td>
                    <td>{l.categorias_lancamento?.nome || "—"}</td>
                    <td style={{ maxWidth: 240 }}>
                      <div style={{ fontWeight: 600 }}>{l.descricao || "—"}</div>
                      {l.insumos?.nome && (
                        <div className="text-xs" style={{ color: "var(--muted)" }}>
                          Insumo: {l.insumos.nome}
                        </div>
                      )}
                      {l.nota_fiscal && (
                        <div className="text-xs" style={{ color: "var(--muted)" }}>
                          NF: {l.nota_fiscal}
                        </div>
                      )}
                    </td>
                    <td>
                      <div>{l.fazendas?.nome || "—"}</div>
                      {l.talhoes?.nome && (
                        <div className="text-xs" style={{ color: "var(--muted)" }}>
                          {l.talhoes.nome}
                        </div>
                      )}
                    </td>
                    <td>
                      {l.maquinas?.nome && <div>{l.maquinas.nome}</div>}
                      {l.operadores?.nome && (
                        <div className="text-xs" style={{ color: "var(--muted)" }}>
                          {l.operadores.nome}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: cor }}>
                      {fmtBRL(l.custo_total)}
                    </td>
                    <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ padding: "4px 10px" }}
                        onClick={() => abrirEditar(l)}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ padding: "4px 10px", color: "var(--danger)" }}
                        onClick={() => setConfirm({ aberto: true, lanc: l })}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de novo / editar */}
      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        titulo={editando ? "Editar Lancamento" : "Novo Lancamento"}
        larguraMax={760}
        rodape={
          <>
            <button type="button" className="btn-ghost" onClick={() => setModalAberto(false)}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <div>
            <label className="label">Tipo *</label>
            <select
              className="input"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoLancamento, categoria_id: "" })}
            >
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
            </select>
          </div>
          <div>
            <label className="label">Categoria *</label>
            <select
              className="input"
              value={form.categoria_id}
              onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
            >
              <option value="">-- Selecione --</option>
              {categoriasForm.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Data *</label>
            <input
              className="input"
              type="date"
              value={form.data_lancamento}
              onChange={(e) => setForm({ ...form, data_lancamento: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Fazenda *</label>
            <select
              className="input"
              value={form.fazenda_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  fazenda_id: e.target.value,
                  safra_id: "",
                  talhao_id: "",
                  operador_id: "",
                  maquina_id: "",
                })
              }
            >
              <option value="">-- Selecione --</option>
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
            >
              <option value="">Nenhuma</option>
              {safrasForm.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Talhao</label>
            <select
              className="input"
              value={form.talhao_id}
              onChange={(e) => setForm({ ...form, talhao_id: e.target.value })}
            >
              <option value="">Nenhum</option>
              {talhoesForm.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                  {t.segue_certificacao ? " (Certif.)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Insumo</label>
            <select className="input" value={form.insumo_id} onChange={(e) => onChangeInsumo(e.target.value)}>
              <option value="">Nenhum</option>
              {insumos.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Maquina</label>
            <select
              className="input"
              value={form.maquina_id}
              onChange={(e) => setForm({ ...form, maquina_id: e.target.value })}
            >
              <option value="">Nenhuma</option>
              {maquinasForm.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Operador</label>
            <select
              className="input"
              value={form.operador_id}
              onChange={(e) => setForm({ ...form, operador_id: e.target.value })}
            >
              <option value="">Nenhum</option>
              {operadoresForm.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Quantidade</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={form.quantidade}
              onChange={(e) => recalcCusto(e.target.value, form.custo_unitario)}
            />
          </div>
          <div>
            <label className="label">Unidade</label>
            <select
              className="input"
              value={form.unidade}
              onChange={(e) => setForm({ ...form, unidade: e.target.value })}
            >
              <option value="">--</option>
              {UNIDADES_PADRAO.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Custo Unitario (R$)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={form.custo_unitario}
              onChange={(e) => recalcCusto(form.quantidade, e.target.value)}
            />
          </div>
          <div>
            <label className="label">Custo Total (R$) *</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={form.custo_total}
              onChange={(e) => setForm({ ...form, custo_total: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Nota Fiscal</label>
            <input
              className="input"
              value={form.nota_fiscal}
              onChange={(e) => setForm({ ...form, nota_fiscal: e.target.value })}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="label">Descricao *</label>
            <input
              className="input"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="label">Observacoes</label>
            <textarea
              className="input"
              rows={2}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>
          {avisoCertificacao && (
            <div
              style={{
                gridColumn: "1 / -1",
                background: "var(--warn-lt)",
                border: "1px solid var(--warn)",
                color: "var(--warn)",
                borderRadius: "var(--r)",
                padding: "10px 12px",
                fontSize: 13,
              }}
            >
              ⚠️ {avisoCertificacao}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm.aberto}
        titulo="Excluir lancamento"
        mensagem={`Excluir o lancamento de ${fmtBRL(confirm.lanc?.custo_total)} (${fmtData(confirm.lanc?.data_lancamento)})? Esta acao nao pode ser desfeita.`}
        destrutivo
        textoConfirmar="Excluir"
        onConfirmar={confirmarExclusao}
        onCancelar={() => setConfirm({ aberto: false, lanc: null })}
      />
    </div>
  );
}
