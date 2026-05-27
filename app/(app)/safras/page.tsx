"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Safra, Fazenda, StatusSafra } from "@/lib/types";
import { fmtBRL, fmtBRLShort, fmtData, fmtInt, fmtPct } from "@/lib/format";
import { CULTURAS_PADRAO } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import KpiCard from "@/components/ui/KpiCard";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// ============================================================
// Pagina de Safras — porta admin-safras.js para Next 14
// Cards com KPIs financeiros, status, filtros e modal CRUD.
// Soft delete via status='cancelada' (nao existe coluna ativo).
// ============================================================

type SafraComFazenda = Safra & { fazendas?: { nome: string } | null };

type FormState = {
  nome: string;
  fazenda_id: string;
  cultura: string;
  ano_agricola: string;
  data_plantio: string;
  data_colheita: string;
  area_ha: string;
  status: StatusSafra;
  observacoes: string;
};

const STATUS_LABEL: Record<StatusSafra, string> = {
  planejamento: "Planejamento",
  aberta: "Em andamento",
  encerrada: "Encerrada",
  cancelada: "Cancelada",
};

const STATUS_BADGE: Record<StatusSafra, string> = {
  planejamento: "badge badge-warn",
  aberta: "badge badge-success",
  encerrada: "badge badge-neutral",
  cancelada: "badge badge-danger",
};

function novoForm(): FormState {
  return {
    nome: "",
    fazenda_id: "",
    cultura: "",
    ano_agricola: "",
    data_plantio: "",
    data_colheita: "",
    area_ha: "",
    status: "planejamento",
    observacoes: "",
  };
}

export default function SafrasPage() {
  const router = useRouter();
  const [safras, setSafras] = useState<SafraComFazenda[]>([]);
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [filtroCultura, setFiltroCultura] = useState("");
  const [filtroAno, setFiltroAno] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroFazenda, setFiltroFazenda] = useState("");
  const [busca, setBusca] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<SafraComFazenda | null>(null);
  const [form, setForm] = useState<FormState>(novoForm());
  const [salvando, setSalvando] = useState(false);

  const [confirm, setConfirm] = useState<{ aberto: boolean; safra: SafraComFazenda | null }>({
    aberto: false,
    safra: null,
  });

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const sb = getSupabase();
      const [rFaz, rSaf] = await Promise.all([
        sb.from("fazendas").select("*").eq("ativo", true).order("nome"),
        sb
          .from("safras")
          .select("*, fazendas(nome)")
          .order("data_plantio", { ascending: false, nullsFirst: false }),
      ]);
      if (rFaz.error) throw rFaz.error;
      if (rSaf.error) throw rSaf.error;
      setFazendas((rFaz.data || []) as Fazenda[]);
      setSafras((rSaf.data || []) as SafraComFazenda[]);
    } catch (e: any) {
      toast.error("Erro ao carregar safras: " + (e?.message || e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Lista de anos agricolas distintos para o filtro
  const anosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    safras.forEach((s) => {
      if (s.ano_agricola) set.add(s.ano_agricola);
    });
    return Array.from(set).sort().reverse();
  }, [safras]);

  // Aplica filtros combinados
  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return safras.filter((s) => {
      if (filtroCultura && (s.cultura || "").toUpperCase() !== filtroCultura.toUpperCase()) return false;
      if (filtroAno && (s.ano_agricola || "") !== filtroAno) return false;
      if (filtroStatus && s.status !== filtroStatus) return false;
      if (filtroFazenda && s.fazenda_id !== filtroFazenda) return false;
      if (q) {
        const hay = `${s.nome || ""} ${s.cultura || ""} ${s.ano_agricola || ""} ${s.fazendas?.nome || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [safras, filtroCultura, filtroAno, filtroStatus, filtroFazenda, busca]);

  // KPIs sobre o conjunto total (nao filtrado)
  const kpis = useMemo(() => {
    const ativas = safras.filter((s) => s.status !== "cancelada");
    return {
      total: ativas.length,
      abertas: ativas.filter((s) => s.status === "aberta").length,
      encerradas: ativas.filter((s) => s.status === "encerrada").length,
      area: ativas.reduce((acc, s) => acc + Number(s.area_ha || 0), 0),
      producao: ativas.reduce((acc, s) => acc + Number(s.producao_sc || 0), 0),
    };
  }, [safras]);

  function abrirNova() {
    setEditando(null);
    setForm(novoForm());
    setModalAberto(true);
  }

  function abrirEditar(s: SafraComFazenda) {
    setEditando(s);
    setForm({
      nome: s.nome || "",
      fazenda_id: s.fazenda_id || "",
      cultura: s.cultura || "",
      ano_agricola: s.ano_agricola || "",
      data_plantio: s.data_plantio || "",
      data_colheita: s.data_colheita || "",
      area_ha: s.area_ha != null ? String(s.area_ha) : "",
      status: (s.status || "planejamento") as StatusSafra,
      observacoes: s.observacoes || "",
    });
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.nome.trim()) {
      toast.error("Informe o nome da safra");
      return;
    }
    if (!form.fazenda_id) {
      toast.error("Selecione a fazenda");
      return;
    }
    if (!form.cultura) {
      toast.error("Selecione a cultura");
      return;
    }
    setSalvando(true);
    try {
      const sb = getSupabase();
      const payload: any = {
        nome: form.nome.trim(),
        fazenda_id: form.fazenda_id,
        cultura: form.cultura,
        ano_agricola: form.ano_agricola.trim() || null,
        data_plantio: form.data_plantio || null,
        data_colheita: form.data_colheita || null,
        area_ha: form.area_ha ? Number(form.area_ha) : null,
        status: form.status,
        observacoes: form.observacoes.trim() || null,
      };
      if (editando) {
        const r = await sb.from("safras").update(payload).eq("id", editando.id);
        if (r.error) throw r.error;
        toast.success("Safra atualizada");
      } else {
        const r = await sb.from("safras").insert(payload);
        if (r.error) throw r.error;
        toast.success("Safra criada");
      }
      setModalAberto(false);
      void carregar();
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e?.message || e));
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarCancelamento() {
    const s = confirm.safra;
    if (!s) return;
    try {
      const sb = getSupabase();
      // Soft delete: nao existe coluna ativo em safras, usa status="cancelada"
      const r = await sb.from("safras").update({ status: "cancelada" }).eq("id", s.id);
      if (r.error) throw r.error;
      toast.success("Safra cancelada");
      setConfirm({ aberto: false, safra: null });
      void carregar();
    } catch (e: any) {
      toast.error("Erro ao cancelar: " + (e?.message || e));
    }
  }

  function encerrarSafra(s: SafraComFazenda) {
    // Redireciona para o fluxo de fechamento, passando a safra como parametro
    router.push(`/fechamento-safra?safra=${s.id}`);
  }

  return (
    <div>
      <PageHeader
        titulo="Safras"
        subtitulo="Gestao financeira e produtiva das suas safras"
        icone="📅"
        acoes={
          <button type="button" className="btn-primary" onClick={abrirNova}>
            + Nova Safra
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid-cards mb-6">
        <KpiCard rotulo="Total de Safras" valor={fmtInt(kpis.total)} icone="📅" accent="green" />
        <KpiCard rotulo="Em Andamento" valor={fmtInt(kpis.abertas)} icone="🌱" accent="green" />
        <KpiCard rotulo="Encerradas" valor={fmtInt(kpis.encerradas)} icone="✅" accent="blue" />
        <KpiCard
          rotulo="Area Plantada"
          valor={`${fmtInt(kpis.area)} ha`}
          icone="📐"
          accent="orange"
        />
        <KpiCard
          rotulo="Producao Total"
          valor={`${fmtInt(kpis.producao)} sc`}
          icone="🌽"
          accent="purple"
        />
      </div>

      {/* Filtros */}
      <div className="card mb-6">
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <div>
            <label className="label">Buscar</label>
            <input
              className="input"
              placeholder="Nome, cultura, fazenda..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Cultura</label>
            <select className="input" value={filtroCultura} onChange={(e) => setFiltroCultura(e.target.value)}>
              <option value="">Todas</option>
              {CULTURAS_PADRAO.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Ano Agricola</label>
            <select className="input" value={filtroAno} onChange={(e) => setFiltroAno(e.target.value)}>
              <option value="">Todos</option>
              {anosDisponiveis.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="planejamento">Planejamento</option>
              <option value="aberta">Em andamento</option>
              <option value="encerrada">Encerrada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div>
            <label className="label">Fazenda</label>
            <select
              className="input"
              value={filtroFazenda}
              onChange={(e) => setFiltroFazenda(e.target.value)}
            >
              <option value="">Todas</option>
              {fazendas.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de safras */}
      {carregando ? (
        <div className="card text-center py-10" style={{ color: "var(--muted)" }}>
          Carregando...
        </div>
      ) : filtradas.length === 0 ? (
        <EmptyState
          icone="🌾"
          titulo="Nenhuma safra encontrada"
          descricao="Ajuste os filtros ou clique em + Nova Safra para comecar."
          acao={
            <button type="button" className="btn-primary" onClick={abrirNova}>
              + Nova Safra
            </button>
          }
        />
      ) : (
        <div className="grid-cards-lg">
          {filtradas.map((s) => {
            const custo = Number(s.custo_total || 0);
            const receita = Number(s.receita_total || 0);
            const lucro = receita - custo;
            const roi = custo > 0 ? (lucro / custo) * 100 : null;
            const status = (s.status || "planejamento") as StatusSafra;
            const podeEncerrar = status === "aberta" || status === "planejamento";

            return (
              <div key={s.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <div className="font-display font-semibold text-base mb-1">{s.nome}</div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className={STATUS_BADGE[status]}>{STATUS_LABEL[status]}</span>
                      {s.cultura && <span className="badge badge-success">{s.cultura}</span>}
                      {s.ano_agricola && (
                        <span className="text-xs" style={{ color: "var(--muted)" }}>
                          {s.ano_agricola}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className="grid gap-2 text-xs mb-3"
                  style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}
                >
                  <Info rotulo="🏡 Fazenda" valor={s.fazendas?.nome || "—"} />
                  <Info rotulo="📐 Area" valor={`${fmtInt(s.area_ha)} ha`} />
                  <Info rotulo="🌱 Plantio" valor={fmtData(s.data_plantio)} />
                  <Info rotulo="🌽 Colheita" valor={fmtData(s.data_colheita)} />
                  <Info
                    rotulo="📊 Producao"
                    valor={s.producao_sc ? `${fmtInt(s.producao_sc)} sc` : "—"}
                  />
                  <Info
                    rotulo="🚜 Produtividade"
                    valor={s.produtividade_sc_ha ? `${fmtInt(s.produtividade_sc_ha)} sc/ha` : "—"}
                  />
                  <Info rotulo="💰 Custo" valor={fmtBRLShort(custo)} />
                  <Info rotulo="💵 Receita" valor={fmtBRLShort(receita)} />
                  <Info
                    rotulo="📈 Lucro / ROI"
                    valor={
                      <span style={{ color: lucro >= 0 ? "var(--success)" : "var(--danger)" }}>
                        {fmtBRLShort(lucro)}
                        {roi != null ? ` (${fmtPct(roi, 1)})` : ""}
                      </span>
                    }
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary" onClick={() => abrirEditar(s)}>
                    Editar
                  </button>
                  {podeEncerrar && (
                    <button type="button" className="btn-primary" onClick={() => encerrarSafra(s)}>
                      Encerrar Safra
                    </button>
                  )}
                  {status !== "cancelada" && (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setConfirm({ aberto: true, safra: s })}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de criar/editar */}
      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        titulo={editando ? "Editar Safra" : "Nova Safra"}
        larguraMax={680}
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
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="label">Nome da Safra *</label>
            <input
              className="input"
              placeholder="ex: Safra Soja 2025/26"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Fazenda *</label>
            <select
              className="input"
              value={form.fazenda_id}
              onChange={(e) => setForm({ ...form, fazenda_id: e.target.value })}
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
            <label className="label">Cultura *</label>
            <select
              className="input"
              value={form.cultura}
              onChange={(e) => setForm({ ...form, cultura: e.target.value })}
            >
              <option value="">-- Selecione --</option>
              {CULTURAS_PADRAO.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Ano Agricola</label>
            <input
              className="input"
              placeholder="ex: 2025/26"
              value={form.ano_agricola}
              onChange={(e) => setForm({ ...form, ano_agricola: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as StatusSafra })}
            >
              <option value="planejamento">Planejamento</option>
              <option value="aberta">Em andamento</option>
              <option value="encerrada">Encerrada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div>
            <label className="label">Data de Plantio</label>
            <input
              className="input"
              type="date"
              value={form.data_plantio}
              onChange={(e) => setForm({ ...form, data_plantio: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Data de Colheita</label>
            <input
              className="input"
              type="date"
              value={form.data_colheita}
              onChange={(e) => setForm({ ...form, data_colheita: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Area (ha)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={form.area_ha}
              onChange={(e) => setForm({ ...form, area_ha: e.target.value })}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="label">Observacoes</label>
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
        open={confirm.aberto}
        titulo="Cancelar safra"
        mensagem={`Deseja cancelar a safra "${confirm.safra?.nome ?? ""}"? Esta acao marca a safra como cancelada (soft delete) e nao apaga lancamentos.`}
        textoConfirmar="Cancelar safra"
        textoCancelar="Voltar"
        destrutivo
        onConfirmar={confirmarCancelamento}
        onCancelar={() => setConfirm({ aberto: false, safra: null })}
      />
    </div>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div>
      <div style={{ color: "var(--dim)" }}>{rotulo}</div>
      <div style={{ fontWeight: 600, color: "var(--text)" }}>{valor}</div>
    </div>
  );
}
