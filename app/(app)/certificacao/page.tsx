"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Fazenda, Talhao, Insumo, TipoCertificacao } from "@/lib/types";
import { fmtPct } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import KpiCard from "@/components/ui/KpiCard";
import Modal from "@/components/ui/Modal";

type ChecklistItem = { pergunta: string; ok: boolean; evidencia: string };
type ChecklistRow = {
  id: string;
  fazenda_id: string;
  tipo: TipoCertificacao;
  itens: ChecklistItem[];
  aprovado_em: string | null;
  observacoes: string | null;
};

const TIPOS: { v: TipoCertificacao; nome: string; icone: string; cor: string }[] = [
  { v: "organico", nome: "Orgânico (MAPA)", icone: "🌱", cor: "green" },
  { v: "globalgap", nome: "GlobalG.A.P.", icone: "🌍", cor: "blue" },
  { v: "rainforest", nome: "Rainforest Alliance", icone: "🐸", cor: "purple" },
];

const CHECKLIST_PADRAO: Record<TipoCertificacao, ChecklistItem[]> = {
  organico: [
    { pergunta: "Análise de solo realizada nos últimos 12 meses", ok: false, evidencia: "" },
    { pergunta: "Plano de manejo orgânico documentado", ok: false, evidencia: "" },
    { pergunta: "Insumos utilizados são permitidos pela IN 46/2011", ok: false, evidencia: "" },
    { pergunta: "Registros de compra de insumos disponíveis", ok: false, evidencia: "" },
    { pergunta: "Separação física de produtos orgânicos e convencionais", ok: false, evidencia: "" },
    { pergunta: "Análise de qualidade da água de irrigação", ok: false, evidencia: "" },
    { pergunta: "Reserva Legal demarcada e preservada", ok: false, evidencia: "" },
    { pergunta: "Período de conversão (12-36 meses) cumprido", ok: false, evidencia: "" },
    { pergunta: "Certificadora OCS/OPAC cadastrada no MAPA", ok: false, evidencia: "" },
  ],
  globalgap: [
    { pergunta: "Sistema de rastreabilidade implementado (farm-to-fork)", ok: false, evidencia: "" },
    { pergunta: "Registros de produção arquivados há 2+ anos", ok: false, evidencia: "" },
    { pergunta: "Operadores de aplicação treinados e certificados", ok: false, evidencia: "" },
    { pergunta: "EPIs disponíveis e em uso", ok: false, evidencia: "" },
    { pergunta: "Carências respeitadas conforme bula", ok: false, evidencia: "" },
    { pergunta: "Análise microbiológica da água de irrigação", ok: false, evidencia: "" },
    { pergunta: "Plano de fertilização baseado em análise de solo", ok: false, evidencia: "" },
    { pergunta: "Higiene na colheita e pós-colheita documentada", ok: false, evidencia: "" },
    { pergunta: "Resíduos de embalagens descartados corretamente", ok: false, evidencia: "" },
    { pergunta: "Política de saúde e segurança do trabalhador", ok: false, evidencia: "" },
  ],
  rainforest: [
    { pergunta: "Áreas de conservação mapeadas", ok: false, evidencia: "" },
    { pergunta: "Programa de restauração de habitats naturais", ok: false, evidencia: "" },
    { pergunta: "Inventário de emissões de GEE realizado", ok: false, evidencia: "" },
    { pergunta: "Práticas de conservação do solo implementadas", ok: false, evidencia: "" },
    { pergunta: "Plano de gestão hídrica com metas de redução", ok: false, evidencia: "" },
    { pergunta: "Lista de pesticidas HHP identificada e gerenciada", ok: false, evidencia: "" },
    { pergunta: "Programa de MIP (Manejo Integrado de Pragas)", ok: false, evidencia: "" },
    { pergunta: "Salário justo e benefícios documentados", ok: false, evidencia: "" },
    { pergunta: "Mecanismo de reclamação para trabalhadores", ok: false, evidencia: "" },
    { pergunta: "Engajamento com comunidades locais documentado", ok: false, evidencia: "" },
  ],
};

export default function CertificacaoPage() {
  const [carregando, setCarregando] = useState(true);
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [checklists, setChecklists] = useState<ChecklistRow[]>([]);
  const [editor, setEditor] = useState<{ fazenda: Fazenda; tipo: TipoCertificacao } | null>(null);

  async function carregar() {
    setCarregando(true);
    try {
      const sb = getSupabase();
      const [f, t, i, c] = await Promise.all([
        sb.from("fazendas").select("*").eq("ativo", true).order("nome"),
        sb.from("talhoes").select("*").eq("ativo", true),
        sb.from("insumos").select("*").eq("ativo", true).order("nome"),
        sb.from("certificacao_checklists").select("*"),
      ]);
      if (f.error) throw f.error;
      if (t.error) throw t.error;
      if (i.error) throw i.error;
      // checklists pode falhar se a tabela não existir — não bloqueia
      if (c.error) console.warn("certificacao_checklists:", c.error);
      setFazendas((f.data || []) as Fazenda[]);
      setTalhoes((t.data || []) as Talhao[]);
      setInsumos((i.data || []) as Insumo[]);
      setChecklists((c.data || []) as ChecklistRow[]);
    } catch (e: any) {
      toast.error("Erro ao carregar: " + (e.message || e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  const stats = useMemo(() => {
    const total = fazendas.length;
    const certificadas = fazendas.filter((f) => f.certificada).length;
    const insumosNaoPermitidos = insumos.filter((i) => i.certificacao_permitida === false).length;
    const talhoesSeguemCert = talhoes.filter((t) => t.segue_certificacao).length;
    return { total, certificadas, insumosNaoPermitidos, talhoesSeguemCert };
  }, [fazendas, talhoes, insumos]);

  const fazendasPorTipo = useMemo(() => {
    const map: Record<TipoCertificacao, Fazenda[]> = { organico: [], globalgap: [], rainforest: [] };
    fazendas.forEach((f) => {
      if (f.certificada && f.tipo_certificacao) map[f.tipo_certificacao].push(f);
    });
    return map;
  }, [fazendas]);

  function getChecklist(fazendaId: string, tipo: TipoCertificacao): ChecklistRow | null {
    return checklists.find((c) => c.fazenda_id === fazendaId && c.tipo === tipo) || null;
  }

  function progressoChecklist(fazendaId: string, tipo: TipoCertificacao): { done: number; total: number; pct: number } {
    const row = getChecklist(fazendaId, tipo);
    const itens = row?.itens?.length ? row.itens : CHECKLIST_PADRAO[tipo];
    const total = itens.length;
    const done = itens.filter((i) => i.ok).length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  async function toggleFazendaCertificada(f: Fazenda, certificada: boolean, tipo?: TipoCertificacao) {
    try {
      const sb = getSupabase();
      const payload: any = {
        certificada,
        tipo_certificacao: certificada ? (tipo || f.tipo_certificacao || "organico") : null,
      };
      const r = await sb.from("fazendas").update(payload).eq("id", f.id);
      if (r.error) throw r.error;

      // Cascata: marcar todos os talhões da fazenda como segue_certificacao=true
      if (certificada) {
        const r2 = await sb
          .from("talhoes")
          .update({ segue_certificacao: true })
          .eq("fazenda_id", f.id)
          .eq("ativo", true);
        if (r2.error) console.warn("Cascata talhões:", r2.error);
      }

      toast.success(certificada ? "Fazenda certificada." : "Certificação removida.");
      await carregar();
    } catch (e: any) {
      toast.error("Erro: " + (e.message || e));
    }
  }

  async function toggleTalhao(t: Talhao) {
    try {
      const sb = getSupabase();
      const r = await sb
        .from("talhoes")
        .update({ segue_certificacao: !t.segue_certificacao })
        .eq("id", t.id);
      if (r.error) throw r.error;
      await carregar();
    } catch (e: any) {
      toast.error("Erro: " + (e.message || e));
    }
  }

  async function toggleInsumo(i: Insumo) {
    try {
      const sb = getSupabase();
      const novo = i.certificacao_permitida === false;
      const r = await sb
        .from("insumos")
        .update({ certificacao_permitida: novo })
        .eq("id", i.id);
      if (r.error) throw r.error;
      await carregar();
    } catch (e: any) {
      toast.error("Erro: " + (e.message || e));
    }
  }

  return (
    <div>
      <PageHeader
        titulo="Certificação"
        subtitulo="Gestão de certificações por tipo, talhões conformes e insumos permitidos"
        icone="🏅"
      />

      <div className="grid-cards mb-6">
        <KpiCard rotulo="Fazendas certificadas" valor={`${stats.certificadas}/${stats.total}`} icone="🏡" accent="green" />
        <KpiCard rotulo="Talhões conformes" valor={String(stats.talhoesSeguemCert)} icone="🌾" accent="blue" />
        <KpiCard
          rotulo="Insumos não permitidos"
          valor={String(stats.insumosNaoPermitidos)}
          icone="⚠️"
          accent={stats.insumosNaoPermitidos > 0 ? "red" : "green"}
        />
        <KpiCard
          rotulo="Taxa de certificação"
          valor={fmtPct(stats.total ? (stats.certificadas / stats.total) * 100 : 0, 0)}
          icone="📊"
          accent="purple"
        />
      </div>

      <h2 className="mb-3">Certificações por tipo</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {TIPOS.map((tipo) => {
          const fazs = fazendasPorTipo[tipo.v];
          return (
            <div key={tipo.v} className="card">
              <div className="flex items-center gap-3 mb-3">
                <span style={{ fontSize: 28 }}>{tipo.icone}</span>
                <div>
                  <h3 style={{ margin: 0 }}>{tipo.nome}</h3>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>
                    {fazs.length} fazenda(s)
                  </div>
                </div>
              </div>
              {fazs.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  Nenhuma fazenda certificada nesse tipo.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {fazs.map((f) => {
                    const p = progressoChecklist(f.id, tipo.v);
                    return (
                      <div
                        key={f.id}
                        className="rounded-ja p-2 cursor-pointer hover:shadow-ja"
                        style={{ background: "var(--green-bg)" }}
                        onClick={() => setEditor({ fazenda: f, tipo: tipo.v })}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <strong className="text-sm">{f.nome}</strong>
                          <span className="text-xs" style={{ color: "var(--muted)" }}>
                            {p.done}/{p.total}
                          </span>
                        </div>
                        <div
                          className="rounded-ja"
                          style={{ height: 6, background: "var(--brd)", overflow: "hidden" }}
                        >
                          <div
                            style={{
                              width: `${p.pct}%`, height: "100%",
                              background: "var(--green)", transition: "width .3s",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <h2 className="mb-3">Status por fazenda</h2>
      {carregando ? (
        <div className="card text-center" style={{ color: "var(--muted)", padding: 32 }}>Carregando...</div>
      ) : fazendas.length === 0 ? (
        <EmptyState icone="🏡" titulo="Nenhuma fazenda cadastrada" />
      ) : (
        <div className="card mb-6" style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Fazenda</th>
                <th>Status</th>
                <th>Tipo</th>
                <th>Talhões conformes</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {fazendas.map((f) => {
                const talhoesF = talhoes.filter((t) => t.fazenda_id === f.id);
                const conformes = talhoesF.filter((t) => t.segue_certificacao).length;
                return (
                  <tr key={f.id}>
                    <td><strong>{f.nome}</strong></td>
                    <td>
                      {f.certificada ? (
                        <span className="badge badge-success">Certificada</span>
                      ) : (
                        <span className="badge badge-neutral">Sem certificação</span>
                      )}
                    </td>
                    <td>
                      <select
                        className="input"
                        style={{ minWidth: 180 }}
                        value={f.tipo_certificacao || ""}
                        onChange={(e) => toggleFazendaCertificada(f, true, e.target.value as TipoCertificacao)}
                        disabled={!f.certificada}
                      >
                        <option value="">—</option>
                        {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.icone} {t.nome}</option>)}
                      </select>
                    </td>
                    <td>{conformes}/{talhoesF.length}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {f.certificada ? (
                        <>
                          <button
                            className="btn-secondary"
                            onClick={() => setEditor({ fazenda: f, tipo: f.tipo_certificacao || "organico" })}
                          >
                            Checklist
                          </button>
                          <button
                            className="btn-ghost"
                            style={{ color: "var(--danger)" }}
                            onClick={() => toggleFazendaCertificada(f, false)}
                          >
                            Remover
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn-primary"
                          onClick={() => toggleFazendaCertificada(f, true, "organico")}
                        >
                          Certificar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="mb-2">🌾 Talhões — conformidade</h3>
          <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
            Marque quais talhões seguem o padrão de certificação.
          </p>
          {talhoes.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>Nenhum talhão.</p>
          ) : (
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {talhoes.map((t) => {
                const f = fazendas.find((x) => x.id === t.fazenda_id);
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between py-2 border-b last:border-b-0"
                    style={{ borderColor: "var(--brd)" }}
                  >
                    <div>
                      <strong className="text-sm">{t.nome}</strong>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>
                        {f?.nome || "—"}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={!!t.segue_certificacao}
                        onChange={() => toggleTalhao(t)}
                      />
                      <span style={{ color: t.segue_certificacao ? "var(--green)" : "var(--muted)" }}>
                        {t.segue_certificacao ? "Conforme" : "Isento"}
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="mb-2">🌿 Insumos — atenção</h3>
          <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
            Marque os insumos permitidos em talhões certificados.
          </p>
          {insumos.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>Nenhum insumo.</p>
          ) : (
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {insumos.map((i) => {
                const proibido = i.certificacao_permitida === false;
                return (
                  <div
                    key={i.id}
                    className="flex items-center justify-between py-2 border-b last:border-b-0"
                    style={{
                      borderColor: "var(--brd)",
                      background: proibido ? "rgba(220,38,38,.04)" : undefined,
                    }}
                  >
                    <div>
                      <strong className="text-sm">{i.nome}</strong>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>
                        {i.categoria || "—"}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={i.certificacao_permitida !== false}
                        onChange={() => toggleInsumo(i)}
                      />
                      <span style={{ color: proibido ? "var(--danger)" : "var(--green)" }}>
                        {proibido ? "Proibido" : "Permitido"}
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {editor && (
        <ChecklistEditor
          fazenda={editor.fazenda}
          tipo={editor.tipo}
          existente={getChecklist(editor.fazenda.id, editor.tipo)}
          onClose={() => setEditor(null)}
          onSucesso={async () => { setEditor(null); await carregar(); }}
        />
      )}
    </div>
  );
}

function ChecklistEditor({
  fazenda, tipo, existente, onClose, onSucesso,
}: {
  fazenda: Fazenda;
  tipo: TipoCertificacao;
  existente: ChecklistRow | null;
  onClose: () => void;
  onSucesso: () => void;
}) {
  const inicial = existente?.itens?.length ? existente.itens : CHECKLIST_PADRAO[tipo];
  const [itens, setItens] = useState<ChecklistItem[]>(inicial);
  const [observacoes, setObservacoes] = useState(existente?.observacoes || "");
  const [salvando, setSalvando] = useState(false);

  function alterar(idx: number, patch: Partial<ChecklistItem>) {
    setItens(itens.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function adicionar() {
    setItens([...itens, { pergunta: "", ok: false, evidencia: "" }]);
  }

  function remover(idx: number) {
    setItens(itens.filter((_, i) => i !== idx));
  }

  const done = itens.filter((i) => i.ok).length;
  const aprovado = done === itens.length && itens.length > 0;

  async function salvar() {
    setSalvando(true);
    try {
      const sb = getSupabase();
      const payload = {
        fazenda_id: fazenda.id,
        tipo,
        itens,
        observacoes: observacoes || null,
        aprovado_em: aprovado ? new Date().toISOString() : null,
      };
      if (existente) {
        const r = await sb.from("certificacao_checklists").update(payload).eq("id", existente.id);
        if (r.error) throw r.error;
      } else {
        const r = await sb.from("certificacao_checklists").insert(payload);
        if (r.error) throw r.error;
      }
      toast.success("Checklist salvo.");
      onSucesso();
    } catch (e: any) {
      toast.error("Erro: " + (e.message || e));
    } finally {
      setSalvando(false);
    }
  }

  const t = TIPOS.find((x) => x.v === tipo)!;

  return (
    <Modal
      open
      onClose={onClose}
      titulo={`${t.icone} ${t.nome} — ${fazenda.nome}`}
      larguraMax={760}
      rodape={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </>
      }
    >
      <div className="mb-3 flex items-center justify-between text-sm">
        <span style={{ color: "var(--muted)" }}>
          Progresso: <strong>{done}/{itens.length}</strong>
        </span>
        {aprovado && <span className="badge badge-success">✓ Aprovado</span>}
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
                  placeholder="Pergunta / item"
                  value={it.pergunta}
                  onChange={(e) => alterar(idx, { pergunta: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Evidência / observação"
                  value={it.evidencia}
                  onChange={(e) => alterar(idx, { evidencia: e.target.value })}
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

      <div className="mt-4">
        <label className="label">Observações gerais</label>
        <textarea
          className="input"
          rows={3}
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        />
      </div>
    </Modal>
  );
}
