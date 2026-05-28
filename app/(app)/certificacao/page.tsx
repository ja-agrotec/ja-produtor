"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";
import type {
  Fazenda,
  TipoCertificacao,
  StatusChecklistItem,
  CertificacaoChecklistItem,
} from "@/lib/types";
import { fmtData, fmtPct } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const TIPOS: { v: TipoCertificacao; nome: string; icone: string; cor: "green" | "blue" | "purple" }[] = [
  { v: "organico",   nome: "Orgânico (MAPA)",      icone: "🌱", cor: "green" },
  { v: "globalgap",  nome: "GlobalG.A.P.",          icone: "🌍", cor: "blue" },
  { v: "rainforest", nome: "Rainforest Alliance",   icone: "🐸", cor: "purple" },
];

// Items padrao por tipo de certificacao - usados pelo botao "Importar items padrao"
const ITEMS_PADRAO: Record<TipoCertificacao, { item_id: string; observacao: string }[]> = {
  organico: [
    { item_id: "ORG-001", observacao: "Análise de solo realizada nos últimos 12 meses" },
    { item_id: "ORG-002", observacao: "Plano de manejo orgânico documentado" },
    { item_id: "ORG-003", observacao: "Insumos utilizados são permitidos pela IN 46/2011" },
    { item_id: "ORG-004", observacao: "Registros de compra de insumos disponíveis" },
    { item_id: "ORG-005", observacao: "Separação física de produtos orgânicos e convencionais" },
    { item_id: "ORG-006", observacao: "Análise de qualidade da água de irrigação" },
    { item_id: "ORG-007", observacao: "Reserva Legal demarcada e preservada" },
    { item_id: "ORG-008", observacao: "Período de conversão (12-36 meses) cumprido" },
    { item_id: "ORG-009", observacao: "Certificadora OCS/OPAC cadastrada no MAPA" },
  ],
  globalgap: [
    { item_id: "GGAP-001", observacao: "Sistema de rastreabilidade implementado (farm-to-fork)" },
    { item_id: "GGAP-002", observacao: "Registros de produção arquivados há 2+ anos" },
    { item_id: "GGAP-003", observacao: "Operadores de aplicação treinados e certificados" },
    { item_id: "GGAP-004", observacao: "EPIs disponíveis e em uso" },
    { item_id: "GGAP-005", observacao: "Carências respeitadas conforme bula" },
    { item_id: "GGAP-006", observacao: "Análise microbiológica da água de irrigação" },
    { item_id: "GGAP-007", observacao: "Plano de fertilização baseado em análise de solo" },
    { item_id: "GGAP-008", observacao: "Higiene na colheita e pós-colheita documentada" },
    { item_id: "GGAP-009", observacao: "Resíduos de embalagens descartados corretamente" },
    { item_id: "GGAP-010", observacao: "Política de saúde e segurança do trabalhador" },
  ],
  rainforest: [
    { item_id: "RFA-001", observacao: "Áreas de conservação mapeadas" },
    { item_id: "RFA-002", observacao: "Programa de restauração de habitats naturais" },
    { item_id: "RFA-003", observacao: "Inventário de emissões de GEE realizado" },
    { item_id: "RFA-004", observacao: "Práticas de conservação do solo implementadas" },
    { item_id: "RFA-005", observacao: "Plano de gestão hídrica com metas de redução" },
    { item_id: "RFA-006", observacao: "Lista de pesticidas HHP identificada e gerenciada" },
    { item_id: "RFA-007", observacao: "Programa de MIP (Manejo Integrado de Pragas)" },
    { item_id: "RFA-008", observacao: "Salário justo e benefícios documentados" },
    { item_id: "RFA-009", observacao: "Mecanismo de reclamação para trabalhadores" },
    { item_id: "RFA-010", observacao: "Engajamento com comunidades locais documentado" },
  ],
};

const STATUS_INFO: Record<StatusChecklistItem, { label: string; badge: string }> = {
  pendente:      { label: "Pendente",      badge: "badge-warn"     },
  ok:            { label: "OK",            badge: "badge-success"  },
  nao_conforme:  { label: "Não conforme",  badge: "badge-danger"   },
  nao_aplicavel: { label: "N/A",           badge: "badge-neutral"  },
};

function calcularProgresso(items: CertificacaoChecklistItem[]): { ok: number; total: number; pct: number } {
  const relevantes = items.filter((i) => i.status !== "nao_aplicavel");
  const ok = relevantes.filter((i) => i.status === "ok").length;
  const total = relevantes.length;
  const pct = total > 0 ? (ok / total) * 100 : 0;
  return { ok, total, pct };
}

export default function CertificacaoPage() {
  const [carregando, setCarregando] = useState(true);
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [items, setItems] = useState<CertificacaoChecklistItem[]>([]);
  const [nomeUsuario, setNomeUsuario] = useState<string>("");

  const [fazendaSel, setFazendaSel] = useState<string>("");
  const [tipoSel, setTipoSel] = useState<TipoCertificacao>("organico");

  const [novoOpen, setNovoOpen] = useState(false);
  const [novoForm, setNovoForm] = useState({ item_id: "", observacao: "" });
  const [editar, setEditar] = useState<CertificacaoChecklistItem | null>(null);
  const [excluir, setExcluir] = useState<CertificacaoChecklistItem | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const sb = getSupabase();
      const { data: { user } } = await sb.auth.getUser();

      const [f, i, u] = await Promise.all([
        sb.from("fazendas").select("*").eq("ativo", true).order("nome"),
        sb.from("certificacao_checklists").select("*").order("created_at", { ascending: false }),
        user
          ? sb.from("usuarios").select("nome").eq("auth_id", user.id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (f.error) throw f.error;
      if (i.error) throw i.error;

      setFazendas((f.data || []) as Fazenda[]);
      setItems((i.data || []) as CertificacaoChecklistItem[]);
      setNomeUsuario(u.data?.nome || "Sistema");

      if (!fazendaSel && (f.data || []).length > 0) {
        setFazendaSel((f.data as Fazenda[])[0].id);
      }
    } catch (e: any) {
      toast.error("Erro ao carregar: " + (e.message || e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, []);

  // Items filtrados pela fazenda e tipo selecionado
  const itemsAtuais = useMemo(
    () => items.filter((i) => i.fazenda_id === fazendaSel && i.tipo_certificacao === tipoSel),
    [items, fazendaSel, tipoSel],
  );

  // Progresso por tipo, para a fazenda selecionada
  const progressoPorTipo = useMemo(() => {
    const r: Record<TipoCertificacao, ReturnType<typeof calcularProgresso>> = {} as any;
    TIPOS.forEach((t) => {
      const items_tipo = items.filter((i) => i.fazenda_id === fazendaSel && i.tipo_certificacao === t.v);
      r[t.v] = calcularProgresso(items_tipo);
    });
    return r;
  }, [items, fazendaSel]);

  const fazendaAtual = fazendas.find((f) => f.id === fazendaSel);
  const progressoAtual = progressoPorTipo[tipoSel];
  const podecertificar =
    progressoAtual.total > 0 &&
    progressoAtual.ok === progressoAtual.total &&
    !itemsAtuais.some((i) => i.status === "nao_conforme");

  // ============ ACOES ============

  async function importarPadrao() {
    if (!fazendaSel) { toast.error("Selecione uma fazenda."); return; }
    setSalvando(true);
    try {
      const sb = getSupabase();
      const itemsParaCriar = ITEMS_PADRAO[tipoSel].map((p) => ({
        fazenda_id: fazendaSel,
        tipo_certificacao: tipoSel,
        item_id: p.item_id,
        observacao: p.observacao,
        status: "pendente" as StatusChecklistItem,
      }));
      const r = await sb.from("certificacao_checklists").insert(itemsParaCriar);
      if (r.error) throw r.error;
      toast.success(`${itemsParaCriar.length} items padrão criados.`);
      await carregar();
    } catch (e: any) {
      toast.error("Erro ao importar items padrão: " + (e.message || e));
    } finally {
      setSalvando(false);
    }
  }

  async function mudarStatus(item: CertificacaoChecklistItem, novo: StatusChecklistItem) {
    try {
      const sb = getSupabase();
      const payload: any = { status: novo };
      if (novo !== "pendente") {
        payload.auditado_em = new Date().toISOString();
        payload.auditado_por = nomeUsuario;
      } else {
        payload.auditado_em = null;
        payload.auditado_por = null;
      }
      const r = await sb.from("certificacao_checklists").update(payload).eq("id", item.id);
      if (r.error) throw r.error;
      await carregar();
    } catch (e: any) {
      toast.error("Erro: " + (e.message || e));
    }
  }

  async function salvarNovo() {
    if (!fazendaSel) { toast.error("Selecione uma fazenda."); return; }
    if (!novoForm.item_id.trim()) { toast.error("Informe o ID do item."); return; }
    setSalvando(true);
    try {
      const sb = getSupabase();
      const r = await sb.from("certificacao_checklists").insert({
        fazenda_id: fazendaSel,
        tipo_certificacao: tipoSel,
        item_id: novoForm.item_id.trim(),
        observacao: novoForm.observacao || null,
        status: "pendente" as StatusChecklistItem,
      });
      if (r.error) throw r.error;
      toast.success("Item adicionado.");
      setNovoOpen(false);
      setNovoForm({ item_id: "", observacao: "" });
      await carregar();
    } catch (e: any) {
      toast.error("Erro ao adicionar: " + (e.message || e));
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEditar() {
    if (!editar) return;
    setSalvando(true);
    try {
      const sb = getSupabase();
      const r = await sb.from("certificacao_checklists").update({
        observacao: editar.observacao || null,
        auditado_por: editar.auditado_por || null,
      }).eq("id", editar.id);
      if (r.error) throw r.error;
      toast.success("Item atualizado.");
      setEditar(null);
      await carregar();
    } catch (e: any) {
      toast.error("Erro ao atualizar: " + (e.message || e));
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExcluir() {
    if (!excluir) return;
    try {
      const sb = getSupabase();
      const r = await sb.from("certificacao_checklists").delete().eq("id", excluir.id);
      if (r.error) throw r.error;
      toast.success("Item removido.");
      setExcluir(null);
      await carregar();
    } catch (e: any) {
      toast.error("Erro ao excluir: " + (e.message || e));
    }
  }

  async function marcarFazendaCertificada() {
    if (!fazendaAtual) return;
    try {
      const sb = getSupabase();
      const r = await sb.from("fazendas").update({
        certificada: true,
        tipo_certificacao: tipoSel,
      }).eq("id", fazendaAtual.id);
      if (r.error) throw r.error;
      toast.success(`${fazendaAtual.nome} marcada como certificada (${tipoSel}).`);
      await carregar();
    } catch (e: any) {
      toast.error("Erro: " + (e.message || e));
    }
  }

  // ============ RENDER ============

  return (
    <div>
      <PageHeader
        titulo="Certificações"
        subtitulo="Checklist de conformidade por fazenda e tipo de certificação"
        icone="🏅"
        acoes={
          <>
            {itemsAtuais.length === 0 && fazendaSel && (
              <button className="btn-secondary" onClick={importarPadrao} disabled={salvando}>
                ⬇️ Importar items padrão
              </button>
            )}
            <button className="btn-primary" onClick={() => setNovoOpen(true)}>+ Item</button>
          </>
        }
      />

      {/* Cards de progresso por tipo */}
      <div className="grid-cards mb-6">
        {TIPOS.map((t) => {
          const p = progressoPorTipo[t.v];
          return (
            <div key={t.v} className="kpi-card" style={{ cursor: "pointer" }} onClick={() => setTipoSel(t.v)}>
              <div className="flex items-start justify-between mb-2">
                <span className="text-caps">{t.nome}</span>
                <span style={{ fontSize: 22 }}>{t.icone}</span>
              </div>
              <div className="kpi-number">{p.total === 0 ? "—" : fmtPct(p.pct, 0)}</div>
              <div className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>
                {p.ok} de {p.total} items conformes
              </div>
              <div
                className="mt-2 h-1.5 rounded-full overflow-hidden"
                style={{ background: "var(--green-bg)" }}
              >
                <div
                  className="h-full"
                  style={{
                    width: `${p.pct}%`,
                    background: t.cor === "green"  ? "var(--green)"
                              : t.cor === "blue"   ? "var(--info)"
                              : "#6a1b9a",
                  }}
                />
              </div>
              <div className={`kpi-accent ${t.cor}`} />
            </div>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div style={{ minWidth: 240 }}>
            <label className="label">Fazenda</label>
            <select
              className="input"
              value={fazendaSel}
              onChange={(e) => setFazendaSel(e.target.value)}
            >
              <option value="">(Selecione...)</option>
              {fazendas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 200 }}>
            <label className="label">Tipo de certificação</label>
            <select
              className="input"
              value={tipoSel}
              onChange={(e) => setTipoSel(e.target.value as TipoCertificacao)}
            >
              {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.icone} {t.nome}</option>)}
            </select>
          </div>
          {podecertificar && fazendaAtual && !fazendaAtual.certificada && (
            <button className="btn-primary" onClick={marcarFazendaCertificada}>
              ✅ Marcar fazenda como certificada
            </button>
          )}
          {fazendaAtual?.certificada && fazendaAtual.tipo_certificacao === tipoSel && (
            <span className="badge badge-success">Fazenda já certificada</span>
          )}
        </div>
      </div>

      {/* Lista de items */}
      {carregando ? (
        <div className="card text-center" style={{ color: "var(--muted)", padding: 32 }}>
          Carregando...
        </div>
      ) : !fazendaSel ? (
        <EmptyState
          icone="🏅"
          titulo="Selecione uma fazenda"
          descricao="Escolha uma fazenda no filtro acima pra ver o checklist de certificação."
        />
      ) : itemsAtuais.length === 0 ? (
        <EmptyState
          icone="📋"
          titulo="Nenhum item cadastrado"
          descricao={`Importe o checklist padrão de ${TIPOS.find(t => t.v === tipoSel)?.nome} ou adicione items manualmente.`}
          acao={
            <button className="btn-primary" onClick={importarPadrao} disabled={salvando}>
              ⬇️ Importar items padrão ({ITEMS_PADRAO[tipoSel].length})
            </button>
          }
        />
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 100 }}>ID</th>
                <th>Observação</th>
                <th>Status</th>
                <th>Auditado</th>
                <th style={{ textAlign: "right", width: 280 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {itemsAtuais.map((it) => {
                const si = STATUS_INFO[it.status];
                return (
                  <tr key={it.id}>
                    <td><strong>{it.item_id}</strong></td>
                    <td>{it.observacao || "—"}</td>
                    <td><span className={"badge " + si.badge}>{si.label}</span></td>
                    <td style={{ fontSize: 12, color: "var(--muted)" }}>
                      {it.auditado_em ? (
                        <>
                          {fmtData(it.auditado_em)}<br />
                          <span style={{ fontStyle: "italic" }}>por {it.auditado_por || "?"}</span>
                        </>
                      ) : "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="inline-flex gap-1">
                        {(["pendente", "ok", "nao_conforme", "nao_aplicavel"] as StatusChecklistItem[]).map((s) => (
                          <button
                            key={s}
                            className={"btn-ghost"}
                            style={{
                              padding: "4px 8px",
                              fontSize: 11,
                              fontWeight: it.status === s ? 700 : 500,
                              color: it.status === s ? "var(--dark)" : "var(--muted)",
                              background: it.status === s ? "var(--green-bg)" : "transparent",
                            }}
                            onClick={() => mudarStatus(it, s)}
                            title={STATUS_INFO[s].label}
                          >
                            {s === "ok" ? "✓" : s === "nao_conforme" ? "✗" : s === "nao_aplicavel" ? "N/A" : "○"}
                          </button>
                        ))}
                        <button className="btn-ghost" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => setEditar(it)}>
                          ✏️
                        </button>
                        <button
                          className="btn-ghost"
                          style={{ padding: "4px 8px", fontSize: 11, color: "var(--danger)" }}
                          onClick={() => setExcluir(it)}
                        >
                          🗑
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

      {/* Modal: novo item */}
      <Modal
        open={novoOpen}
        onClose={() => setNovoOpen(false)}
        titulo={`Adicionar item — ${TIPOS.find((t) => t.v === tipoSel)?.nome}`}
        rodape={
          <>
            <button className="btn-ghost" onClick={() => setNovoOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={salvarNovo} disabled={salvando}>
              {salvando ? "Salvando..." : "Adicionar"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">ID do item *</label>
            <input
              className="input"
              value={novoForm.item_id}
              onChange={(e) => setNovoForm({ ...novoForm, item_id: e.target.value })}
              placeholder="Ex: ORG-010"
            />
          </div>
          <div>
            <label className="label">Observação / pergunta</label>
            <textarea
              className="input"
              rows={3}
              value={novoForm.observacao}
              onChange={(e) => setNovoForm({ ...novoForm, observacao: e.target.value })}
              placeholder="Ex: Análise de água realizada nos últimos 12 meses"
            />
          </div>
        </div>
      </Modal>

      {/* Modal: editar item */}
      <Modal
        open={!!editar}
        onClose={() => setEditar(null)}
        titulo={editar ? `Editar item ${editar.item_id}` : ""}
        rodape={
          <>
            <button className="btn-ghost" onClick={() => setEditar(null)}>Cancelar</button>
            <button className="btn-primary" onClick={salvarEditar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        {editar && (
          <div className="space-y-3">
            <div>
              <label className="label">Observação</label>
              <textarea
                className="input"
                rows={3}
                value={editar.observacao || ""}
                onChange={(e) => setEditar({ ...editar, observacao: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Auditado por</label>
              <input
                className="input"
                value={editar.auditado_por || ""}
                onChange={(e) => setEditar({ ...editar, auditado_por: e.target.value })}
                placeholder="Nome do auditor"
              />
            </div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>
              Status atual: <span className={"badge " + STATUS_INFO[editar.status].badge}>{STATUS_INFO[editar.status].label}</span>
              {editar.auditado_em && (
                <> · Auditado em {fmtData(editar.auditado_em)}</>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!excluir}
        titulo="Excluir item?"
        mensagem={`Tem certeza que deseja excluir o item ${excluir?.item_id}? Esta ação não pode ser desfeita.`}
        textoConfirmar="Excluir"
        destrutivo
        onConfirmar={confirmarExcluir}
        onCancelar={() => setExcluir(null)}
      />
    </div>
  );
}
