"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Documento, Fazenda } from "@/lib/types";
import { fmtData } from "@/lib/format";
import { DEBOUNCE_MS, debounce } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import KpiCard from "@/components/ui/KpiCard";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FazendaSelector from "@/components/ui/FazendaSelector";

const TIPOS_DOC = [
  { v: "NOTA_FISCAL", icone: "🧾", label: "Nota Fiscal" },
  { v: "CONTRATO", icone: "📝", label: "Contrato" },
  { v: "LAUDO_LABORATORIAL", icone: "🔬", label: "Laudo Laboratorial" },
  { v: "FOTO_AMOSTRA", icone: "📷", label: "Foto de Amostra" },
  { v: "FOTO_LOTE", icone: "📸", label: "Foto do Lote" },
  { v: "FOTO_CARGA", icone: "🚛", label: "Foto de Carga" },
  { v: "RELATORIO_TECNICO", icone: "📊", label: "Relatório Técnico" },
  { v: "CERTIFICADO", icone: "🏅", label: "Certificado" },
  { v: "DOCUMENTO_TRANSPORTE", icone: "📦", label: "Doc. de Transporte" },
  { v: "RASTREABILIDADE", icone: "🔍", label: "Rastreabilidade" },
  { v: "ANALISE_SOLO", icone: "🌱", label: "Análise de Solo" },
  { v: "OUTROS", icone: "📎", label: "Outros" },
];

const MODULOS_ORIGEM = [
  { v: "vendas", label: "Vendas" },
  { v: "qualidade", label: "Qualidade de Lotes" },
  { v: "certificacao", label: "Certificação" },
  { v: "analise_solo", label: "Análise de Solo" },
  { v: "safras", label: "Safras" },
  { v: "talhoes", label: "Talhões" },
  { v: "fazendas", label: "Fazendas" },
  { v: "insumos", label: "Insumos" },
  { v: "maquinas", label: "Máquinas" },
  { v: "lancamentos", label: "Lançamentos" },
  { v: "outros", label: "Outros" },
];

const EXTS = ".pdf,.jpg,.jpeg,.png,.gif,.webp,.xlsx,.xls,.csv,.doc,.docx,.txt,.zip";
const BUCKET = "documentos";

type DocComFazenda = Documento & { fazendas?: { nome: string } | null };

function getTipoInfo(v: string) {
  return TIPOS_DOC.find((t) => t.v === v) || { icone: "📎", label: v || "Outros" };
}

function getModuloLabel(v: string | null | undefined) {
  if (!v) return "—";
  const m = MODULOS_ORIGEM.find((x) => x.v === v);
  return m ? m.label : v;
}

function getIconePorNome(nome: string, tipo?: string | null) {
  const t = getTipoInfo(tipo || "");
  if (t.icone !== "📎") return t.icone;
  const ext = (nome || "").split(".").pop()?.toLowerCase() || "";
  const m: Record<string, string> = {
    pdf: "📄", jpg: "🖼️", jpeg: "🖼️", png: "🖼️", gif: "🖼️", webp: "🖼️",
    xlsx: "📊", xls: "📊", csv: "📊",
    doc: "📝", docx: "📝", txt: "📝", zip: "🗂️",
  };
  return m[ext] || "📎";
}

function ehImagem(nome: string | null | undefined): boolean {
  const ext = (nome || "").split(".").pop()?.toLowerCase() || "";
  return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
}

export default function DocumentosPage() {
  const [carregando, setCarregando] = useState(true);
  const [docs, setDocs] = useState<DocComFazenda[]>([]);
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");

  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroModulo, setFiltroModulo] = useState("");
  const [filtroFazenda, setFiltroFazenda] = useState("");
  const [busca, setBusca] = useState("");
  const [buscaInput, setBuscaInput] = useState("");

  const [uploadAberto, setUploadAberto] = useState(false);
  const [dossieAberto, setDossieAberto] = useState(false);
  const [excluirDoc, setExcluirDoc] = useState<DocComFazenda | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocComFazenda | null>(null);

  const debouncedBusca = useMemo(
    () => debounce((v: string) => setBusca(v), DEBOUNCE_MS),
    [],
  );

  async function carregar() {
    setCarregando(true);
    try {
      const sb = getSupabase();
      const [f, d] = await Promise.all([
        sb.from("fazendas").select("*").eq("ativo", true).order("nome"),
        sb.from("documentos").select("*, fazendas(nome)").order("criado_em", { ascending: false }),
      ]);
      if (f.error) throw f.error;
      if (d.error) throw d.error;
      setFazendas((f.data || []) as Fazenda[]);
      setDocs((d.data || []) as DocComFazenda[]);
    } catch (e: any) {
      toast.error("Erro ao carregar: " + (e.message || e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return docs.filter((d) => {
      if (filtroTipo && d.tipo_documento !== filtroTipo) return false;
      if (filtroModulo && d.modulo_origem !== filtroModulo) return false;
      if (filtroFazenda && d.fazenda_id !== filtroFazenda) return false;
      if (termo) {
        const hay = `${d.nome_arquivo} ${d.entidade_descricao || ""} ${d.observacoes || ""}`.toLowerCase();
        if (!hay.includes(termo)) return false;
      }
      return true;
    });
  }, [docs, filtroTipo, filtroModulo, filtroFazenda, busca]);

  async function excluir() {
    if (!excluirDoc) return;
    try {
      const sb = getSupabase();
      // Hard delete: remove storage + linha
      if (excluirDoc.storage_path) {
        await sb.storage.from(BUCKET).remove([excluirDoc.storage_path]);
      }
      const r = await sb.from("documentos").delete().eq("id", excluirDoc.id);
      if (r.error) throw r.error;
      toast.success("Documento excluído.");
      setExcluirDoc(null);
      setPreviewDoc(null);
      await carregar();
    } catch (e: any) {
      toast.error("Erro ao excluir: " + (e.message || e));
    }
  }

  return (
    <div>
      <PageHeader
        titulo="Documentos e Anexos"
        subtitulo="Repositório central — vincule arquivos a vendas, lotes, análises e mais"
        icone="📁"
        acoes={
          <>
            <FazendaSelector onChange={(id) => setFiltroFazenda(id || "")} />
            <div className="flex gap-1">
              <button
                className={view === "list" ? "btn-primary" : "btn-ghost"}
                onClick={() => setView("list")}
                title="Lista"
              >
                ☰
              </button>
              <button
                className={view === "grid" ? "btn-primary" : "btn-ghost"}
                onClick={() => setView("grid")}
                title="Grade"
              >
                ⊞
              </button>
            </div>
            <button className="btn-secondary" onClick={() => setDossieAberto(true)}>
              📂 Dossiê do Lote
            </button>
            <button className="btn-primary" onClick={() => setUploadAberto(true)}>
              + Novo Documento
            </button>
          </>
        }
      />

      <div className="grid-cards mb-6">
        <KpiCard rotulo="Total" valor={String(docs.length)} icone="📁" accent="blue" />
        <KpiCard rotulo="Filtrados" valor={String(filtrados.length)} icone="🔎" accent="green" />
        <KpiCard
          rotulo="Tipos diferentes"
          valor={String(new Set(docs.map((d) => d.tipo_documento)).size)}
          icone="🏷️"
          accent="purple"
        />
      </div>

      <div className="card mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div style={{ flex: 1, minWidth: 220 }}>
            <label className="label">Buscar</label>
            <input
              className="input"
              placeholder="Nome, descrição, entidade..."
              value={buscaInput}
              onChange={(e) => { setBuscaInput(e.target.value); debouncedBusca(e.target.value); }}
            />
          </div>
          <div style={{ minWidth: 180 }}>
            <label className="label">Tipo</label>
            <select className="input" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              <option value="">Todos os tipos</option>
              {TIPOS_DOC.map((t) => (
                <option key={t.v} value={t.v}>{t.icone} {t.label}</option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: 180 }}>
            <label className="label">Módulo</label>
            <select className="input" value={filtroModulo} onChange={(e) => setFiltroModulo(e.target.value)}>
              <option value="">Todos os módulos</option>
              {MODULOS_ORIGEM.map((m) => (
                <option key={m.v} value={m.v}>{m.label}</option>
              ))}
            </select>
          </div>
          <button
            className="btn-ghost"
            onClick={() => {
              setFiltroTipo(""); setFiltroModulo("");
              setBusca(""); setBuscaInput("");
            }}
          >
            Limpar
          </button>
        </div>
      </div>

      {carregando ? (
        <div className="card text-center" style={{ color: "var(--muted)", padding: 32 }}>
          Carregando...
        </div>
      ) : filtrados.length === 0 ? (
        <EmptyState
          icone="📁"
          titulo="Nenhum documento"
          descricao="Faça upload de arquivos para começar a organizar seu repositório."
          acao={<button className="btn-primary" onClick={() => setUploadAberto(true)}>+ Novo Documento</button>}
        />
      ) : view === "grid" ? (
        <div className="grid-cards-lg">
          {filtrados.map((d) => (
            <CartaoGrid key={d.id} doc={d} onClick={() => setPreviewDoc(d)} />
          ))}
        </div>
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th></th>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Módulo</th>
                <th>Fazenda</th>
                <th>Data</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((d) => {
                const t = getTipoInfo(d.tipo_documento);
                return (
                  <tr key={d.id} style={{ cursor: "pointer" }} onClick={() => setPreviewDoc(d)}>
                    <td style={{ fontSize: 22 }}>{getIconePorNome(d.nome_arquivo, d.tipo_documento)}</td>
                    <td>
                      <strong>{d.nome_arquivo}</strong>
                      {d.entidade_descricao && (
                        <div className="text-xs" style={{ color: "var(--muted)" }}>{d.entidade_descricao}</div>
                      )}
                    </td>
                    <td><span className="badge badge-info">{t.label}</span></td>
                    <td>{getModuloLabel(d.modulo_origem)}</td>
                    <td>{d.fazendas?.nome || "—"}</td>
                    <td>{fmtData(d.criado_em)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {d.url && (
                        <a className="btn-ghost" href={d.url} target="_blank" rel="noopener noreferrer">Abrir</a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {uploadAberto && (
        <UploadModal
          fazendas={fazendas}
          onClose={() => setUploadAberto(false)}
          onSucesso={async () => { setUploadAberto(false); await carregar(); }}
        />
      )}

      {previewDoc && (
        <PreviewModal
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onExcluir={() => setExcluirDoc(previewDoc)}
        />
      )}

      {dossieAberto && (
        <DossieModal docs={docs} onClose={() => setDossieAberto(false)} />
      )}

      <ConfirmDialog
        open={!!excluirDoc}
        titulo="Excluir documento?"
        mensagem={`O arquivo "${excluirDoc?.nome_arquivo}" será removido permanentemente do storage. Essa ação não pode ser desfeita.`}
        textoConfirmar="Excluir"
        destrutivo
        onConfirmar={excluir}
        onCancelar={() => setExcluirDoc(null)}
      />
    </div>
  );
}

function CartaoGrid({ doc, onClick }: { doc: DocComFazenda; onClick: () => void }) {
  const t = getTipoInfo(doc.tipo_documento);
  const isImg = ehImagem(doc.nome_arquivo);
  return (
    <div className="card cursor-pointer hover:shadow-ja-lg transition-all" onClick={onClick}>
      {isImg && doc.url ? (
        <img
          src={doc.url}
          alt={doc.nome_arquivo}
          loading="lazy"
          style={{
            width: "100%", height: 120, objectFit: "cover",
            borderRadius: 8, marginBottom: 10,
          }}
        />
      ) : (
        <div
          className="rounded-ja flex items-center justify-center mb-2"
          style={{ height: 120, background: "var(--green-bg)", fontSize: 48 }}
        >
          {getIconePorNome(doc.nome_arquivo, doc.tipo_documento)}
        </div>
      )}
      <div className="text-sm font-semibold truncate" title={doc.nome_arquivo}>
        {doc.nome_arquivo}
      </div>
      <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
        {fmtData(doc.criado_em)}
      </div>
      <div className="mt-2 flex gap-1 flex-wrap">
        <span className="badge badge-info">{t.icone} {t.label}</span>
        {doc.modulo_origem && (
          <span className="badge badge-neutral">{getModuloLabel(doc.modulo_origem)}</span>
        )}
      </div>
    </div>
  );
}

function UploadModal({
  fazendas, onClose, onSucesso,
}: {
  fazendas: Fazenda[];
  onClose: () => void;
  onSucesso: () => void;
}) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [tipo, setTipo] = useState("");
  const [modulo, setModulo] = useState("");
  const [fazendaId, setFazendaId] = useState("");
  const [entidade, setEntidade] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function escolherArquivo(f: File | null) {
    setArquivo(f);
  }

  async function salvar() {
    if (!tipo) { toast.error("Selecione o tipo de documento."); return; }
    if (!arquivo) { toast.error("Selecione um arquivo."); return; }
    setEnviando(true);
    try {
      const sb = getSupabase();
      const safeName = arquivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${Date.now()}_${safeName}`;
      const up = await sb.storage.from(BUCKET).upload(path, arquivo, { upsert: false });
      if (up.error) throw up.error;
      const pub = sb.storage.from(BUCKET).getPublicUrl(path);
      const payload = {
        fazenda_id: fazendaId || null,
        tipo_documento: tipo,
        nome_arquivo: arquivo.name,
        storage_path: path,
        url: pub.data.publicUrl,
        modulo_origem: modulo || null,
        entidade_descricao: entidade || null,
        observacoes: observacoes || null,
      };
      const r = await sb.from("documentos").insert(payload);
      if (r.error) {
        // rollback do storage
        await sb.storage.from(BUCKET).remove([path]);
        throw r.error;
      }
      toast.success("Documento enviado.");
      onSucesso();
    } catch (e: any) {
      toast.error("Erro: " + (e.message || e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      titulo="Novo Documento"
      larguraMax={620}
      rodape={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={salvar} disabled={enviando}>
            {enviando ? "Enviando..." : "Salvar"}
          </button>
        </>
      }
    >
      <div
        className={`rounded-ja-lg p-6 text-center cursor-pointer mb-4 transition-colors ${
          dragOver ? "bg-ja-green-bg" : ""
        }`}
        style={{
          border: "2px dashed var(--green)",
          background: dragOver ? "var(--green-bg)" : "rgba(124,179,66,.05)",
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) escolherArquivo(f);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={EXTS}
          style={{ display: "none" }}
          onChange={(e) => escolherArquivo(e.target.files?.[0] || null)}
        />
        <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
        {arquivo ? (
          <>
            <div className="font-semibold text-sm">{arquivo.name}</div>
            <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              {(arquivo.size / 1024).toFixed(1)} KB
            </div>
          </>
        ) : (
          <>
            <div className="font-semibold text-sm">Arraste o arquivo aqui ou clique para selecionar</div>
            <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              PDF, imagens, planilhas e documentos
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Tipo *</label>
          <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Selecione...</option>
            {TIPOS_DOC.map((t) => (
              <option key={t.v} value={t.v}>{t.icone} {t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Módulo de origem</label>
          <select className="input" value={modulo} onChange={(e) => setModulo(e.target.value)}>
            <option value="">—</option>
            {MODULOS_ORIGEM.map((m) => (
              <option key={m.v} value={m.v}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Fazenda</label>
          <select className="input" value={fazendaId} onChange={(e) => setFazendaId(e.target.value)}>
            <option value="">—</option>
            {fazendas.map((f) => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Entidade vinculada</label>
          <input
            className="input"
            placeholder="Ex: Venda #123, Lote ABC..."
            value={entidade}
            onChange={(e) => setEntidade(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Observações</label>
          <textarea
            className="input"
            rows={3}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}

function PreviewModal({
  doc, onClose, onExcluir,
}: {
  doc: DocComFazenda;
  onClose: () => void;
  onExcluir: () => void;
}) {
  const t = getTipoInfo(doc.tipo_documento);
  const isImg = ehImagem(doc.nome_arquivo);
  const isPdf = doc.nome_arquivo.toLowerCase().endsWith(".pdf");
  return (
    <Modal
      open
      onClose={onClose}
      titulo={doc.nome_arquivo}
      larguraMax={780}
      rodape={
        <>
          {doc.url && (
            <a
              className="btn-secondary"
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              🔗 Abrir
            </a>
          )}
          <button className="btn-danger" onClick={onExcluir}>🗑️ Excluir</button>
          <button className="btn-ghost" onClick={onClose}>Fechar</button>
        </>
      }
    >
      <div className="mb-4">
        {isImg && doc.url ? (
          <img
            src={doc.url}
            alt={doc.nome_arquivo}
            style={{
              width: "100%", maxHeight: 400, objectFit: "contain",
              borderRadius: 8,
            }}
          />
        ) : isPdf && doc.url ? (
          <iframe
            src={doc.url}
            style={{ width: "100%", height: 500, border: "none", borderRadius: 8 }}
            title={doc.nome_arquivo}
          />
        ) : (
          <div
            className="flex items-center justify-center rounded-ja"
            style={{ height: 200, fontSize: 80, background: "var(--green-bg)" }}
          >
            {getIconePorNome(doc.nome_arquivo, doc.tipo_documento)}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-caps">Tipo</div>
          <div>{t.icone} {t.label}</div>
        </div>
        <div>
          <div className="text-caps">Módulo</div>
          <div>{getModuloLabel(doc.modulo_origem)}</div>
        </div>
        <div>
          <div className="text-caps">Fazenda</div>
          <div>{doc.fazendas?.nome || "—"}</div>
        </div>
        <div>
          <div className="text-caps">Data</div>
          <div>{fmtData(doc.criado_em)}</div>
        </div>
        {doc.entidade_descricao && (
          <div className="col-span-2">
            <div className="text-caps">Entidade</div>
            <div>{doc.entidade_descricao}</div>
          </div>
        )}
        {doc.observacoes && (
          <div className="col-span-2">
            <div className="text-caps">Observações</div>
            <div>{doc.observacoes}</div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function DossieModal({ docs, onClose }: { docs: DocComFazenda[]; onClose: () => void }) {
  // Agrupa por entidade_descricao (regra do briefing)
  const grupos = useMemo(() => {
    const map: Record<string, DocComFazenda[]> = {};
    docs.forEach((d) => {
      const key = d.entidade_descricao || "(Sem entidade vinculada)";
      if (!map[key]) map[key] = [];
      map[key].push(d);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [docs]);

  return (
    <Modal
      open
      onClose={onClose}
      titulo="📂 Dossiê do Lote"
      larguraMax={760}
      rodape={
        <>
          <button className="btn-secondary" onClick={() => window.print()}>Imprimir / PDF</button>
          <button className="btn-ghost" onClick={onClose}>Fechar</button>
        </>
      }
    >
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
        Documentos agrupados pela entidade vinculada (lote, venda, talhão, etc.).
      </p>
      {grupos.length === 0 ? (
        <div className="text-center py-6" style={{ color: "var(--muted)" }}>
          Nenhum documento cadastrado
        </div>
      ) : (
        grupos.map(([key, itens]) => (
          <div key={key} className="card mb-3">
            <h4 style={{ color: "var(--green)", marginBottom: 10 }}>
              📂 {key} <span className="badge badge-neutral ml-2">{itens.length}</span>
            </h4>
            {itens.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 py-2 border-b last:border-b-0"
                style={{ borderColor: "var(--brd)" }}
              >
                <span style={{ fontSize: 22 }}>{getIconePorNome(d.nome_arquivo, d.tipo_documento)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="text-sm font-semibold truncate">{d.nome_arquivo}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>
                    {getTipoInfo(d.tipo_documento).label} · {fmtData(d.criado_em)}
                  </div>
                </div>
                {d.url && (
                  <a className="btn-ghost" href={d.url} target="_blank" rel="noopener noreferrer">
                    Abrir
                  </a>
                )}
              </div>
            ))}
          </div>
        ))
      )}
    </Modal>
  );
}
