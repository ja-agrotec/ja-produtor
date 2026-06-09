"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";
import type {
  VendaGraos, EntregaGraos, Fazenda, Safra, Talhao,
  TipoContratoVenda, StatusVenda,
} from "@/lib/types";
import { fmt, fmtBRL, fmtData, hoje } from "@/lib/format";
import { DEBOUNCE_MS, debounce, CULTURAS_PADRAO, matchCulturaPadrao } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import KpiCard from "@/components/ui/KpiCard";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FazendaSelector from "@/components/ui/FazendaSelector";

type Aba = "contratos" | "entregas" | "checklist";

type ContratoComRel = VendaGraos & {
  fazendas?: { nome: string } | null;
  safras?: { nome: string; cultura: string } | null;
};

type EntregaComRel = EntregaGraos & {
  vendas_graos?: { cultura: string | null; tipo_contrato: string; numero_contrato: string | null } | null;
  talhoes?: { nome: string } | null;
};

type ChecklistItem = { nome: string; ok: boolean; obs: string };

const TIPOS_CONTRATO: { v: TipoContratoVenda; l: string }[] = [
  { v: "disponivel", l: "Disponível" },
  { v: "forward", l: "Forward (a prazo)" },
  { v: "troca", l: "Troca por insumos" },
  { v: "fixacao", l: "Fixação" },
  { v: "cbot", l: "CBOT (Bolsa)" },
  { v: "exportacao", l: "Exportação" },
];

const STATUS_LABEL: Record<StatusVenda, string> = {
  aberto: "Aberto",
  parcialmente_entregue: "Parcialmente entregue",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const STATUS_BADGE: Record<StatusVenda, string> = {
  aberto: "badge badge-info",
  parcialmente_entregue: "badge badge-warn",
  entregue: "badge badge-success",
  cancelado: "badge badge-danger",
};

const CHECKLIST_PADRAO: ChecklistItem[] = [
  { nome: "NF-e de exportação emitida", ok: false, obs: "" },
  { nome: "DUE registrada e averbada no Siscomex", ok: false, obs: "" },
  { nome: "Certificado Fitossanitário (CIF) emitido", ok: false, obs: "" },
  { nome: "Laudo de qualidade do lote emitido", ok: false, obs: "" },
  { nome: "Análise de resíduos dentro dos MRL", ok: false, obs: "" },
  { nome: "Rastreabilidade do lote documentada", ok: false, obs: "" },
  { nome: "CAR da fazenda regularizado", ok: false, obs: "" },
  { nome: "Conhecimento de Embarque (BL/AWB)", ok: false, obs: "" },
];

// Calcula status dinâmico com base nas entregas
function calcularStatusDinamico(venda: VendaGraos, entregas: EntregaGraos[]): StatusVenda {
  if (venda.status === "cancelado") return "cancelado";
  const total = entregas
    .filter((e) => e.venda_id === venda.id)
    .reduce((a, e) => a + Number(e.quantidade_sc || 0), 0);
  const qtd = Number(venda.quantidade_sc || 0);
  if (total <= 0) return "aberto";
  if (total >= qtd) return "entregue";
  return "parcialmente_entregue";
}

export default function VendasGraosPage() {
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState<Aba>("contratos");

  const [vendas, setVendas] = useState<ContratoComRel[]>([]);
  const [entregas, setEntregas] = useState<EntregaComRel[]>([]);
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [safras, setSafras] = useState<Safra[]>([]);
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);

  const [filtroFazenda, setFiltroFazenda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroCultura, setFiltroCultura] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [busca, setBusca] = useState("");
  const [buscaInput, setBuscaInput] = useState("");

  const [modalContrato, setModalContrato] = useState<ContratoComRel | "novo" | null>(null);
  const [modalEntrega, setModalEntrega] = useState<ContratoComRel | null>(null);
  const [excluirContrato, setExcluirContrato] = useState<ContratoComRel | null>(null);
  const [checklistEdit, setChecklistEdit] = useState<ContratoComRel | null>(null);

  const debouncedBusca = useMemo(
    () => debounce((v: string) => setBusca(v), DEBOUNCE_MS),
    [],
  );

  async function carregar() {
    setCarregando(true);
    try {
      const sb = getSupabase();
      const [f, s, t, v, e] = await Promise.all([
        sb.from("fazendas").select("*").eq("ativo", true).order("nome"),
        sb.from("safras").select("*").order("criado_em", { ascending: false }),
        sb.from("talhoes").select("*").eq("ativo", true).order("nome"),
        sb.from("vendas_graos").select("*, fazendas(nome), safras(nome, cultura)").order("criado_em", { ascending: false }),
        sb.from("entregas_graos").select("*, vendas_graos(cultura, tipo_contrato, numero_contrato), talhoes(nome)").order("criado_em", { ascending: false }),
      ]);
      if (f.error) throw f.error;
      if (s.error) throw s.error;
      if (t.error) throw t.error;
      if (v.error) throw v.error;
      if (e.error) throw e.error;
      setFazendas((f.data || []) as Fazenda[]);
      setSafras((s.data || []) as Safra[]);
      setTalhoes((t.data || []) as Talhao[]);
      setVendas((v.data || []) as ContratoComRel[]);
      setEntregas((e.data || []) as EntregaComRel[]);
    } catch (e: any) {
      toast.error("Erro ao carregar: " + (e.message || e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  // Aplica status dinâmico
  const vendasComStatus = useMemo(() => {
    return vendas.map((v) => ({
      ...v,
      _statusDinamico: calcularStatusDinamico(v, entregas),
    }));
  }, [vendas, entregas]);

  const vendasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return vendasComStatus.filter((v) => {
      if (filtroFazenda && v.fazenda_id !== filtroFazenda) return false;
      if (filtroTipo && v.tipo_contrato !== filtroTipo) return false;
      if (filtroCultura && (v.cultura || "").toUpperCase() !== filtroCultura) return false;
      if (filtroStatus && v._statusDinamico !== filtroStatus) return false;
      if (termo) {
        const hay = `${v.comprador || ""} ${v.numero_contrato || ""} ${v.cultura || ""}`.toLowerCase();
        if (!hay.includes(termo)) return false;
      }
      return true;
    });
  }, [vendasComStatus, filtroFazenda, filtroTipo, filtroCultura, filtroStatus, busca]);

  // KPIs
  const kpis = useMemo(() => {
    const totalContratos = vendasFiltradas.length;
    const abertos = vendasFiltradas.filter(
      (v) => v._statusDinamico === "aberto" || v._statusDinamico === "parcialmente_entregue",
    ).length;
    const valorTotal = vendasFiltradas.reduce(
      (a, v) => a + Number(v.quantidade_sc || 0) * Number(v.preco_saca || 0),
      0,
    );
    const idsVisiveis = new Set(vendasFiltradas.map((v) => v.id));
    const inicioMes = new Date();
    inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
    const entregasMes = entregas.filter(
      (e) => idsVisiveis.has(e.venda_id) && e.data_entrega && new Date(e.data_entrega) >= inicioMes,
    ).length;
    return { totalContratos, abertos, valorTotal, entregasMes };
  }, [vendasFiltradas, entregas]);

  const entregasFiltradas = useMemo(() => {
    const idsVisiveis = new Set(vendasFiltradas.map((v) => v.id));
    return entregas.filter((e) => idsVisiveis.has(e.venda_id));
  }, [entregas, vendasFiltradas]);

  async function excluirVenda() {
    if (!excluirContrato) return;
    try {
      const sb = getSupabase();
      // status=cancelado como soft delete (não há coluna ativo nessa tabela)
      const r = await sb.from("vendas_graos").update({ status: "cancelado" }).eq("id", excluirContrato.id);
      if (r.error) throw r.error;
      toast.success("Contrato cancelado.");
      setExcluirContrato(null);
      await carregar();
    } catch (e: any) {
      toast.error("Erro ao cancelar: " + (e.message || e));
    }
  }

  return (
    <div>
      <PageHeader
        titulo="Vendas de Grãos"
        subtitulo="Contratos, entregas parciais e checklist de exportação"
        icone="🌾"
        acoes={
          <>
            <FazendaSelector onChange={(id) => setFiltroFazenda(id || "")} />
            <button className="btn-primary" onClick={() => setModalContrato("novo")}>
              + Novo Contrato
            </button>
          </>
        }
      />

      <div className="grid-cards mb-6">
        <KpiCard rotulo="Contratos" valor={String(kpis.totalContratos)} icone="📄" accent="blue" />
        <KpiCard rotulo="Em aberto" valor={String(kpis.abertos)} icone="⏳" accent="orange" />
        <KpiCard rotulo="Valor contratado" valor={fmtBRL(kpis.valorTotal)} icone="💰" accent="green" />
        <KpiCard rotulo="Entregas no mês" valor={String(kpis.entregasMes)} icone="🚛" accent="purple" />
      </div>

      <div className="card mb-4" style={{ padding: 0 }}>
        <div className="flex border-b" style={{ borderColor: "var(--brd)" }}>
          <button
            className={`px-5 py-3 text-sm font-semibold ${aba === "contratos" ? "border-b-2" : ""}`}
            style={aba === "contratos" ? { borderColor: "var(--green)", color: "var(--green)" } : { color: "var(--muted)" }}
            onClick={() => setAba("contratos")}
          >
            📄 Contratos ({vendasFiltradas.length})
          </button>
          <button
            className={`px-5 py-3 text-sm font-semibold ${aba === "entregas" ? "border-b-2" : ""}`}
            style={aba === "entregas" ? { borderColor: "var(--green)", color: "var(--green)" } : { color: "var(--muted)" }}
            onClick={() => setAba("entregas")}
          >
            🚛 Entregas ({entregasFiltradas.length})
          </button>
          <button
            className={`px-5 py-3 text-sm font-semibold ${aba === "checklist" ? "border-b-2" : ""}`}
            style={aba === "checklist" ? { borderColor: "var(--green)", color: "var(--green)" } : { color: "var(--muted)" }}
            onClick={() => setAba("checklist")}
          >
            ✈️ Checklist Exportação
          </button>
        </div>

        {aba === "contratos" && (
          <div className="p-4">
            <div className="flex flex-wrap items-end gap-3 mb-4">
              <div style={{ flex: 1, minWidth: 200 }}>
                <label className="label">Buscar</label>
                <input
                  className="input"
                  placeholder="Comprador, número, cultura..."
                  value={buscaInput}
                  onChange={(e) => { setBuscaInput(e.target.value); debouncedBusca(e.target.value); }}
                />
              </div>
              <div style={{ minWidth: 160 }}>
                <label className="label">Tipo</label>
                <select className="input" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                  <option value="">Todos</option>
                  {TIPOS_CONTRATO.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
              </div>
              <div style={{ minWidth: 140 }}>
                <label className="label">Cultura</label>
                <select className="input" value={filtroCultura} onChange={(e) => setFiltroCultura(e.target.value)}>
                  <option value="">Todas</option>
                  {CULTURAS_PADRAO.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ minWidth: 180 }}>
                <label className="label">Status</label>
                <select className="input" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="aberto">Aberto</option>
                  <option value="parcialmente_entregue">Parcialmente entregue</option>
                  <option value="entregue">Entregue</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>

            {carregando ? (
              <div className="text-center py-8" style={{ color: "var(--muted)" }}>Carregando...</div>
            ) : vendasFiltradas.length === 0 ? (
              <EmptyState
                icone="🌾"
                titulo="Nenhum contrato"
                descricao="Cadastre seu primeiro contrato de venda de grãos."
              />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Fazenda / Cultura</th>
                      <th>Tipo</th>
                      <th>Comprador</th>
                      <th style={{ textAlign: "right" }}>Qtd (sc)</th>
                      <th style={{ textAlign: "right" }}>Preço/sc</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                      <th>Entrega</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendasFiltradas.map((v) => {
                      const total = Number(v.quantidade_sc || 0) * Number(v.preco_saca || 0);
                      const st = v._statusDinamico as StatusVenda;
                      return (
                        <tr key={v.id}>
                          <td>
                            <strong>{v.fazendas?.nome || "—"}</strong>
                            <div className="text-xs" style={{ color: "var(--muted)" }}>
                              {v.cultura || v.safras?.cultura || "—"}
                              {v.numero_contrato && ` · ${v.numero_contrato}`}
                            </div>
                          </td>
                          <td>
                            {TIPOS_CONTRATO.find((t) => t.v === v.tipo_contrato)?.l || v.tipo_contrato}
                            {v.tipo_contrato === "exportacao" && (
                              <span className="badge badge-warn ml-1">✈️ EXP</span>
                            )}
                          </td>
                          <td>{v.comprador || "—"}</td>
                          <td style={{ textAlign: "right" }}>{fmt(Number(v.quantidade_sc || 0), 0)}</td>
                          <td style={{ textAlign: "right" }}>{fmtBRL(Number(v.preco_saca || 0))}</td>
                          <td style={{ textAlign: "right", fontWeight: 600 }}>{fmtBRL(total)}</td>
                          <td>{fmtData(v.data_entrega)}</td>
                          <td><span className={STATUS_BADGE[st]}>{STATUS_LABEL[st]}</span></td>
                          <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            <button className="btn-ghost" onClick={() => setModalContrato(v)}>Editar</button>
                            <button className="btn-ghost" onClick={() => setModalEntrega(v)}>Entrega</button>
                            {v.tipo_contrato === "exportacao" && (
                              <button className="btn-ghost" onClick={() => setChecklistEdit(v)}>Checklist</button>
                            )}
                            <button className="btn-ghost" style={{ color: "var(--danger)" }} onClick={() => setExcluirContrato(v)}>Cancelar</button>
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

        {aba === "entregas" && (
          <div className="p-4">
            {entregasFiltradas.length === 0 ? (
              <EmptyState
                icone="🚛"
                titulo="Nenhuma entrega"
                descricao="Registre entregas a partir da aba Contratos."
              />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Contrato</th>
                      <th>Talhão</th>
                      <th style={{ textAlign: "right" }}>Qtd (sc)</th>
                      <th>Nota fiscal</th>
                      <th>Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entregasFiltradas.map((e) => (
                      <tr key={e.id}>
                        <td>{fmtData(e.data_entrega)}</td>
                        <td>
                          {e.vendas_graos?.numero_contrato || "—"}
                          <div className="text-xs" style={{ color: "var(--muted)" }}>
                            {e.vendas_graos?.cultura || ""} · {e.vendas_graos?.tipo_contrato || ""}
                          </div>
                        </td>
                        <td>{e.talhoes?.nome || "—"}</td>
                        <td style={{ textAlign: "right" }}>{fmt(Number(e.quantidade_sc || 0), 0)}</td>
                        <td>{e.nota_fiscal || "—"}</td>
                        <td>{e.observacoes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {aba === "checklist" && (
          <div className="p-4">
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
              Contratos do tipo <strong>Exportação</strong> — preencha o checklist regulatório.
            </p>
            {vendasComStatus.filter((v) => v.tipo_contrato === "exportacao").length === 0 ? (
              <EmptyState icone="✈️" titulo="Nenhum contrato de exportação" />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {vendasComStatus
                  .filter((v) => v.tipo_contrato === "exportacao")
                  .map((v) => {
                    const cl: ChecklistItem[] = Array.isArray(v.checklist_exportacao)
                      ? v.checklist_exportacao
                      : CHECKLIST_PADRAO;
                    const done = cl.filter((i) => i.ok).length;
                    const total = cl.length || CHECKLIST_PADRAO.length;
                    const pct = total ? Math.round((done / total) * 100) : 0;
                    return (
                      <div key={v.id} className="card">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <strong>{v.numero_contrato || "(s/ número)"}</strong>
                            <div className="text-xs" style={{ color: "var(--muted)" }}>
                              {v.fazendas?.nome} · {v.cultura} · {v.comprador || "—"}
                            </div>
                          </div>
                          <span className="badge badge-info">{done}/{total}</span>
                        </div>
                        <div
                          className="rounded-ja mt-2"
                          style={{ height: 8, background: "var(--brd)", overflow: "hidden" }}
                        >
                          <div
                            style={{
                              width: `${pct}%`, height: "100%", background: "var(--green)",
                              transition: "width .3s",
                            }}
                          />
                        </div>
                        <button
                          className="btn-secondary mt-3 w-full"
                          onClick={() => setChecklistEdit(v)}
                        >
                          Editar checklist
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {modalContrato && (
        <ContratoModal
          contrato={modalContrato === "novo" ? null : modalContrato}
          fazendas={fazendas}
          safras={safras}
          onClose={() => setModalContrato(null)}
          onSucesso={async () => { setModalContrato(null); await carregar(); }}
        />
      )}

      {modalEntrega && (
        <EntregaModal
          contrato={modalEntrega}
          talhoes={talhoes.filter((t) => t.fazenda_id === modalEntrega.fazenda_id)}
          totalEntregue={entregas
            .filter((e) => e.venda_id === modalEntrega.id)
            .reduce((a, e) => a + Number(e.quantidade_sc || 0), 0)}
          onClose={() => setModalEntrega(null)}
          onSucesso={async () => { setModalEntrega(null); await carregar(); }}
        />
      )}

      {checklistEdit && (
        <ChecklistModal
          contrato={checklistEdit}
          onClose={() => setChecklistEdit(null)}
          onSucesso={async () => { setChecklistEdit(null); await carregar(); }}
        />
      )}

      <ConfirmDialog
        open={!!excluirContrato}
        titulo="Cancelar contrato?"
        mensagem={`Deseja marcar o contrato "${excluirContrato?.numero_contrato || "(s/ número)"}" como cancelado?`}
        textoConfirmar="Cancelar contrato"
        destrutivo
        onConfirmar={excluirVenda}
        onCancelar={() => setExcluirContrato(null)}
      />
    </div>
  );
}

function ContratoModal({
  contrato, fazendas, safras, onClose, onSucesso,
}: {
  contrato: ContratoComRel | null;
  fazendas: Fazenda[];
  safras: Safra[];
  onClose: () => void;
  onSucesso: () => void;
}) {
  const [fazendaId, setFazendaId] = useState(contrato?.fazenda_id || "");
  const [safraId, setSafraId] = useState(contrato?.safra_id || "");
  const [cultura, setCultura] = useState(contrato?.cultura || "");
  const [tipo, setTipo] = useState<TipoContratoVenda>(contrato?.tipo_contrato || "disponivel");
  const [qtd, setQtd] = useState<number>(Number(contrato?.quantidade_sc || 0));
  const [preco, setPreco] = useState<number>(Number(contrato?.preco_saca || 0));
  const [dataContrato, setDataContrato] = useState(contrato?.data_contrato || hoje());
  const [dataEntrega, setDataEntrega] = useState(contrato?.data_entrega || "");
  const [comprador, setComprador] = useState(contrato?.comprador || "");
  const [numero, setNumero] = useState(contrato?.numero_contrato || "");
  const [observacoes, setObservacoes] = useState(contrato?.observacoes || "");
  const [salvando, setSalvando] = useState(false);

  const safrasDaFaz = safras.filter((s) => s.fazenda_id === fazendaId);

  function aoMudarSafra(id: string) {
    setSafraId(id);
    const s = safras.find((x) => x.id === id);
    if (s) setCultura(matchCulturaPadrao(s.cultura));
  }

  async function salvar() {
    if (!fazendaId) { toast.error("Selecione a fazenda."); return; }
    if (!(qtd > 0)) { toast.error("Informe a quantidade."); return; }
    setSalvando(true);
    try {
      const sb = getSupabase();
      const payload: any = {
        fazenda_id: fazendaId,
        safra_id: safraId || null,
        cultura: cultura || null,
        tipo_contrato: tipo,
        quantidade_sc: qtd,
        preco_saca: preco || null,
        data_contrato: dataContrato || null,
        data_entrega: dataEntrega || null,
        comprador: comprador || null,
        numero_contrato: numero || null,
        observacoes: observacoes || null,
        status: contrato?.status || "aberto",
      };
      if (tipo === "exportacao" && !contrato?.checklist_exportacao) {
        payload.checklist_exportacao = CHECKLIST_PADRAO;
      }
      if (contrato?.id) {
        const r = await sb.from("vendas_graos").update(payload).eq("id", contrato.id);
        if (r.error) throw r.error;
        toast.success("Contrato atualizado.");
      } else {
        const r = await sb.from("vendas_graos").insert(payload);
        if (r.error) throw r.error;
        toast.success("Contrato cadastrado.");
      }
      onSucesso();
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e.message || e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      titulo={contrato ? "Editar contrato" : "Novo contrato de venda"}
      larguraMax={720}
      rodape={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="label">Fazenda *</label>
          <select className="input" value={fazendaId} onChange={(e) => { setFazendaId(e.target.value); setSafraId(""); }}>
            <option value="">Selecione...</option>
            {fazendas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Safra</label>
          <select className="input" value={safraId} onChange={(e) => aoMudarSafra(e.target.value)}>
            <option value="">—</option>
            {safrasDaFaz.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} ({s.cultura} {s.ano_agricola || ""})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Cultura</label>
          <select className="input" value={cultura} onChange={(e) => setCultura(e.target.value)}>
            <option value="">—</option>
            {cultura && !CULTURAS_PADRAO.includes(cultura) && (
              <option value={cultura}>{cultura}</option>
            )}
            {CULTURAS_PADRAO.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Tipo *</label>
          <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value as TipoContratoVenda)}>
            {TIPOS_CONTRATO.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Qtd (sacas) *</label>
          <input
            type="number" min="0" step="0.001" className="input"
            value={qtd || ""}
            onChange={(e) => setQtd(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="label">Preço por saca (R$)</label>
          <input
            type="number" min="0" step="0.01" className="input"
            value={preco || ""}
            onChange={(e) => setPreco(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="label">Data contrato</label>
          <input type="date" className="input" value={dataContrato || ""} onChange={(e) => setDataContrato(e.target.value)} />
        </div>
        <div>
          <label className="label">Data entrega</label>
          <input type="date" className="input" value={dataEntrega || ""} onChange={(e) => setDataEntrega(e.target.value)} />
        </div>
        <div>
          <label className="label">Nº contrato</label>
          <input className="input" value={numero} onChange={(e) => setNumero(e.target.value)} />
        </div>
        <div className="sm:col-span-3">
          <label className="label">Comprador</label>
          <input
            className="input"
            value={comprador}
            placeholder="Trading, cooperativa, exportadora..."
            onChange={(e) => setComprador(e.target.value)}
          />
        </div>
        <div className="sm:col-span-3">
          <label className="label">Observações</label>
          <textarea className="input" rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </div>
      </div>

      <div className="mt-3 p-3 rounded-ja text-xs" style={{ background: "var(--green-bg)", color: "var(--muted)" }}>
        <strong>Total previsto:</strong> {fmtBRL(qtd * preco)}
      </div>
    </Modal>
  );
}

function EntregaModal({
  contrato, talhoes, totalEntregue, onClose, onSucesso,
}: {
  contrato: ContratoComRel;
  talhoes: Talhao[];
  totalEntregue: number;
  onClose: () => void;
  onSucesso: () => void;
}) {
  const saldo = Number(contrato.quantidade_sc || 0) - totalEntregue;
  const [qtd, setQtd] = useState<number>(0);
  const [data, setData] = useState(hoje());
  const [nf, setNf] = useState("");
  const [talhaoId, setTalhaoId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!(qtd > 0)) { toast.error("Informe a quantidade."); return; }
    if (qtd > saldo + 0.001) { toast.error(`Quantidade maior que o saldo (${fmt(saldo)} sc).`); return; }
    setSalvando(true);
    try {
      const sb = getSupabase();
      const payload = {
        venda_id: contrato.id,
        talhao_id: talhaoId || null,
        quantidade_sc: qtd,
        data_entrega: data || null,
        nota_fiscal: nf || null,
        observacoes: observacoes || null,
      };
      const r = await sb.from("entregas_graos").insert(payload);
      if (r.error) throw r.error;

      // Atualizar status do contrato
      const novoTotal = totalEntregue + qtd;
      const qtdContrato = Number(contrato.quantidade_sc || 0);
      const novoStatus = novoTotal >= qtdContrato ? "entregue" : "parcialmente_entregue";
      await sb.from("vendas_graos").update({ status: novoStatus }).eq("id", contrato.id);

      toast.success("Entrega registrada.");
      onSucesso();
    } catch (e: any) {
      toast.error("Erro: " + (e.message || e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      titulo="Registrar entrega"
      larguraMax={520}
      rodape={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Registrar"}
          </button>
        </>
      }
    >
      <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
        Contrato: <strong>{contrato.numero_contrato || "(s/ número)"}</strong> ·
        Saldo: <strong>{fmt(saldo, 0)} sc</strong>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Quantidade (sc) *</label>
          <input
            type="number" min="0" step="0.001" max={saldo} className="input"
            value={qtd || ""}
            onChange={(e) => setQtd(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="label">Data *</label>
          <input type="date" className="input" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div>
          <label className="label">Talhão de origem</label>
          <select className="input" value={talhaoId} onChange={(e) => setTalhaoId(e.target.value)}>
            <option value="">—</option>
            {talhoes.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Nota fiscal</label>
          <input className="input" value={nf} onChange={(e) => setNf(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Observações</label>
          <textarea className="input" rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

function ChecklistModal({
  contrato, onClose, onSucesso,
}: {
  contrato: ContratoComRel;
  onClose: () => void;
  onSucesso: () => void;
}) {
  const inicial: ChecklistItem[] = Array.isArray(contrato.checklist_exportacao)
    ? contrato.checklist_exportacao
    : CHECKLIST_PADRAO;
  const [itens, setItens] = useState<ChecklistItem[]>(inicial);
  const [salvando, setSalvando] = useState(false);

  function alterar(idx: number, patch: Partial<ChecklistItem>) {
    setItens(itens.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function adicionar() {
    setItens([...itens, { nome: "", ok: false, obs: "" }]);
  }

  function remover(idx: number) {
    setItens(itens.filter((_, i) => i !== idx));
  }

  async function salvar() {
    setSalvando(true);
    try {
      const sb = getSupabase();
      const r = await sb
        .from("vendas_graos")
        .update({ checklist_exportacao: itens })
        .eq("id", contrato.id);
      if (r.error) throw r.error;
      toast.success("Checklist salvo.");
      onSucesso();
    } catch (e: any) {
      toast.error("Erro: " + (e.message || e));
    } finally {
      setSalvando(false);
    }
  }

  const done = itens.filter((i) => i.ok).length;

  return (
    <Modal
      open
      onClose={onClose}
      titulo={`Checklist de Exportação — ${contrato.numero_contrato || "(s/ número)"}`}
      larguraMax={720}
      rodape={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </>
      }
    >
      <div className="mb-3 text-sm" style={{ color: "var(--muted)" }}>
        Progresso: <strong>{done}/{itens.length}</strong>
      </div>
      <div className="flex flex-col gap-2">
        {itens.map((it, idx) => (
          <div
            key={idx}
            className="rounded-ja p-3"
            style={{ background: it.ok ? "var(--green-bg)" : "#fafcf8", border: "1px solid var(--brd)" }}
          >
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={it.ok}
                onChange={(e) => alterar(idx, { ok: e.target.checked })}
                style={{ marginTop: 4 }}
              />
              <div style={{ flex: 1 }}>
                <input
                  className="input mb-2"
                  placeholder="Descrição do item"
                  value={it.nome}
                  onChange={(e) => alterar(idx, { nome: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Observação / referência"
                  value={it.obs}
                  onChange={(e) => alterar(idx, { obs: e.target.value })}
                />
              </div>
              <button
                className="btn-ghost"
                style={{ color: "var(--danger)" }}
                onClick={() => remover(idx)}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
      <button className="btn-secondary mt-3" onClick={adicionar}>+ Adicionar item</button>
    </Modal>
  );
}
