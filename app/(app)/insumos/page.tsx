"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Fazenda, Insumo } from "@/lib/types";
import { fmt, fmtBRL } from "@/lib/format";
import { UNIDADES_PADRAO } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import KpiCard from "@/components/ui/KpiCard";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const CATEGORIAS: { v: string; l: string }[] = [
  { v: "fertilizante", l: "Fertilizante" },
  { v: "herbicida", l: "Herbicida" },
  { v: "fungicida", l: "Fungicida" },
  { v: "inseticida", l: "Inseticida" },
  { v: "acaricida", l: "Acaricida" },
  { v: "nematicida", l: "Nematicida" },
  { v: "corretivo", l: "Corretivo" },
  { v: "adjuvante", l: "Adjuvante" },
  { v: "bioestimulante", l: "Bioestimulante" },
  { v: "inoculante", l: "Inoculante" },
  { v: "semente", l: "Semente" },
  { v: "fungicida_bio", l: "Fungicida Bio" },
  { v: "outros", l: "Outros" },
];

type Form = {
  nome: string;
  categoria: string;
  unidade: string;
  principio_ativo: string;
  fabricante: string;
  registro_mapa: string;
  estoque_atual: string;
  estoque_minimo: string;
  preco_unitario: string;
  fazenda_id: string;
  certificacao_permitida: boolean;
  observacoes: string;
};

const FORM_VAZIO: Form = {
  nome: "",
  categoria: "",
  unidade: "",
  principio_ativo: "",
  fabricante: "",
  registro_mapa: "",
  estoque_atual: "0",
  estoque_minimo: "0",
  preco_unitario: "0",
  fazenda_id: "",
  certificacao_permitida: false,
  observacoes: "",
};

export default function InsumosPage() {
  const [itens, setItens] = useState<Insumo[]>([]);
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroCat, setFiltroCat] = useState("");
  const [filtroFaz, setFiltroFaz] = useState("");

  const [novoOpen, setNovoOpen] = useState(false);
  const [editando, setEditando] = useState<Insumo | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [confirmar, setConfirmar] = useState<{ id: string; nome: string } | null>(null);

  // Ajuste de estoque
  const [ajusteAlvo, setAjusteAlvo] = useState<Insumo | null>(null);
  const [ajusteTipo, setAjusteTipo] = useState<"entrada" | "saida">("entrada");
  const [ajusteQtd, setAjusteQtd] = useState("");
  const [ajusteObs, setAjusteObs] = useState("");
  const [ajustando, setAjustando] = useState(false);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    const sb = getSupabase();
    const [rIns, rFaz] = await Promise.all([
      sb
        .from("insumos")
        .select(
          "id,nome,categoria,unidade,principio_ativo,fabricante,registro_mapa,estoque_atual,estoque_minimo,preco_unitario,fazenda_id,certificacao_permitida,ativo,observacoes,criado_em,atualizado_em",
        )
        .eq("ativo", true)
        .order("nome"),
      sb.from("fazendas").select("*").eq("ativo", true).order("nome"),
    ]);
    if (rIns.error || rFaz.error) toast.error("Erro ao carregar insumos");
    setItens((rIns.data || []) as Insumo[]);
    setFazendas((rFaz.data || []) as Fazenda[]);
    setCarregando(false);
  }

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return itens.filter((i) => {
      if (filtroFaz && i.fazenda_id !== filtroFaz) return false;
      if (filtroCat && i.categoria !== filtroCat) return false;
      if (q) {
        const hit = (
          (i.nome || "") +
          " " +
          (i.fabricante || "") +
          " " +
          (i.principio_ativo || "") +
          " " +
          (i.categoria || "")
        )
          .toLowerCase()
          .includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [itens, busca, filtroCat, filtroFaz]);

  const kpis = useMemo(() => {
    const total = itens.length;
    const baixo = itens.filter((i) => (i.estoque_atual || 0) <= (i.estoque_minimo || 0)).length;
    const valor = itens.reduce(
      (s, i) => s + (i.estoque_atual || 0) * (i.preco_unitario || 0),
      0,
    );
    return { total, baixo, valor };
  }, [itens]);

  function abrirNovo() {
    setForm({ ...FORM_VAZIO, fazenda_id: filtroFaz || "" });
    setEditando(null);
    setNovoOpen(true);
  }

  function abrirEditar(i: Insumo) {
    setForm({
      nome: i.nome || "",
      categoria: i.categoria || "",
      unidade: i.unidade || "",
      principio_ativo: i.principio_ativo || "",
      fabricante: i.fabricante || "",
      registro_mapa: i.registro_mapa || "",
      estoque_atual: String(i.estoque_atual ?? 0),
      estoque_minimo: String(i.estoque_minimo ?? 0),
      preco_unitario: String(i.preco_unitario ?? 0),
      fazenda_id: i.fazenda_id || "",
      certificacao_permitida: !!i.certificacao_permitida,
      observacoes: (i as any).observacoes || "",
    });
    setEditando(i);
    setNovoOpen(false);
  }

  function fecharForm() {
    setNovoOpen(false);
    setEditando(null);
  }

  async function salvar() {
    if (!form.nome.trim()) {
      toast.error("Informe o nome");
      return;
    }
    if (!form.categoria) {
      toast.error("Selecione a categoria");
      return;
    }
    if (!form.unidade) {
      toast.error("Selecione a unidade");
      return;
    }
    setSalvando(true);
    const sb = getSupabase();
    const payload = {
      nome: form.nome.trim(),
      categoria: form.categoria,
      unidade: form.unidade,
      principio_ativo: form.principio_ativo.trim() || null,
      fabricante: form.fabricante.trim() || null,
      registro_mapa: form.registro_mapa.trim() || null,
      estoque_atual: parseFloat(form.estoque_atual) || 0,
      estoque_minimo: parseFloat(form.estoque_minimo) || 0,
      preco_unitario: parseFloat(form.preco_unitario) || 0,
      fazenda_id: form.fazenda_id || null,
      certificacao_permitida: form.certificacao_permitida,
      observacoes: form.observacoes.trim() || null,
    };
    let r;
    if (editando) {
      r = await sb.from("insumos").update(payload).eq("id", editando.id);
    } else {
      r = await sb.from("insumos").insert({ ...payload, ativo: true });
    }
    setSalvando(false);
    if (r.error) {
      toast.error("Erro: " + r.error.message);
      return;
    }
    toast.success(editando ? "Insumo atualizado!" : "Insumo cadastrado!");
    fecharForm();
    carregar();
  }

  async function confirmarExclusao() {
    if (!confirmar) return;
    const sb = getSupabase();
    const r = await sb.from("insumos").update({ ativo: false }).eq("id", confirmar.id);
    if (r.error) {
      toast.error("Erro: " + r.error.message);
      return;
    }
    toast.success("Insumo removido");
    setConfirmar(null);
    carregar();
  }

  function abrirAjuste(i: Insumo) {
    setAjusteAlvo(i);
    setAjusteTipo("entrada");
    setAjusteQtd("");
    setAjusteObs("");
  }

  async function aplicarAjuste() {
    if (!ajusteAlvo) return;
    const qtd = parseFloat(ajusteQtd);
    if (!qtd || qtd <= 0) {
      toast.error("Quantidade invalida");
      return;
    }
    const atual = ajusteAlvo.estoque_atual || 0;
    const novo = ajusteTipo === "entrada" ? atual + qtd : atual - qtd;
    if (novo < 0) {
      toast.error("Estoque insuficiente");
      return;
    }
    setAjustando(true);
    const sb = getSupabase();
    const r = await sb.from("insumos").update({ estoque_atual: novo }).eq("id", ajusteAlvo.id);
    setAjustando(false);
    if (r.error) {
      toast.error("Erro: " + r.error.message);
      return;
    }
    toast.success(
      `${ajusteTipo === "entrada" ? "Entrada" : "Saida"} de ${qtd} ${ajusteAlvo.unidade} registrada!`,
    );
    setAjusteAlvo(null);
    carregar();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Insumos"
        icone="🧪"
        subtitulo="Cadastro e controle de produtos agricolas"
        acoes={
          <button className="btn-primary" onClick={abrirNovo}>
            + Novo Insumo
          </button>
        }
      />

      <div className="grid-cards">
        <KpiCard rotulo="Total de insumos" valor={kpis.total} icone="🧪" accent="green" />
        <KpiCard
          rotulo="Estoque critico"
          valor={kpis.baixo}
          icone="⚠️"
          accent={kpis.baixo > 0 ? "red" : "green"}
        />
        <KpiCard rotulo="Valor em estoque" valor={fmtBRL(kpis.valor)} icone="💰" accent="blue" />
        <KpiCard
          rotulo="Filtrados"
          valor={filtrados.length}
          icone="🔎"
          accent="purple"
        />
      </div>

      <div className="card flex flex-wrap gap-3 items-center">
        <input
          className="input"
          style={{ maxWidth: 280 }}
          placeholder="Buscar nome, fabricante, principio ativo..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          className="input"
          style={{ maxWidth: 200 }}
          value={filtroCat}
          onChange={(e) => setFiltroCat(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {CATEGORIAS.map((c) => (
            <option key={c.v} value={c.v}>
              {c.l}
            </option>
          ))}
        </select>
        <select
          className="input"
          style={{ maxWidth: 200 }}
          value={filtroFaz}
          onChange={(e) => setFiltroFaz(e.target.value)}
        >
          <option value="">Todas as fazendas</option>
          {fazendas.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </select>
      </div>

      {carregando ? (
        <p style={{ color: "var(--muted)" }}>Carregando...</p>
      ) : filtrados.length === 0 ? (
        <EmptyState
          icone="🧪"
          titulo={busca || filtroCat || filtroFaz ? "Nenhum insumo encontrado" : "Nenhum insumo cadastrado"}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Principio ativo</th>
                <th>Fazenda</th>
                <th>Estoque</th>
                <th>Preco unit.</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((i) => {
                const baixo = (i.estoque_atual || 0) <= (i.estoque_minimo || 0);
                const fazNome = fazendas.find((f) => f.id === i.fazenda_id)?.nome;
                const catLbl = CATEGORIAS.find((c) => c.v === i.categoria)?.l || i.categoria || "—";
                return (
                  <tr key={i.id}>
                    <td>
                      <strong>{i.nome}</strong>
                      {i.fabricante && (
                        <div style={{ color: "var(--muted)", fontSize: 12 }}>{i.fabricante}</div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-info">{catLbl}</span>
                      {i.certificacao_permitida && (
                        <span className="badge badge-warn" style={{ marginLeft: 4 }}>
                          Org.
                        </span>
                      )}
                    </td>
                    <td style={{ color: "var(--muted)" }}>{i.principio_ativo || "—"}</td>
                    <td>{fazNome || <span style={{ color: "var(--muted)" }}>Global</span>}</td>
                    <td>
                      <div>
                        <strong style={{ color: baixo ? "var(--danger)" : undefined }}>
                          {fmt(i.estoque_atual || 0, 2)} {i.unidade}
                        </strong>
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: 12 }}>
                        Min: {fmt(i.estoque_minimo || 0, 2)} {i.unidade}
                      </div>
                      {baixo && (
                        <span className="badge badge-danger" style={{ marginTop: 4 }}>
                          Estoque baixo
                        </span>
                      )}
                    </td>
                    <td>{fmtBRL(i.preco_unitario || 0)}</td>
                    <td>
                      <div className="flex gap-2 flex-wrap">
                        <button className="btn-ghost" onClick={() => abrirEditar(i)}>
                          Editar
                        </button>
                        <button className="btn-secondary" onClick={() => abrirAjuste(i)}>
                          Ajustar inventario
                        </button>
                        <button
                          className="btn-danger"
                          onClick={() => setConfirmar({ id: i.id, nome: i.nome })}
                        >
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

      {/* Form cadastro / edicao */}
      <Modal
        open={novoOpen || !!editando}
        onClose={fecharForm}
        titulo={editando ? "Editar Insumo" : "Novo Insumo"}
        larguraMax={720}
        rodape={
          <>
            <button type="button" className="btn-ghost" onClick={fecharForm} disabled={salvando}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="label">Nome do Produto *</label>
            <input
              className="input"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Roundup Original DI"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Categoria *</label>
            <select
              className="input"
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            >
              <option value="">Selecione...</option>
              {CATEGORIAS.map((c) => (
                <option key={c.v} value={c.v}>
                  {c.l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Unidade *</label>
            <select
              className="input"
              value={form.unidade}
              onChange={(e) => setForm({ ...form, unidade: e.target.value })}
            >
              <option value="">Selecione...</option>
              {[...UNIDADES_PADRAO, "sc 50kg", "sc 40kg", "sc 60kg", "dose"].map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Principio Ativo</label>
            <input
              className="input"
              value={form.principio_ativo}
              onChange={(e) => setForm({ ...form, principio_ativo: e.target.value })}
              placeholder="Ex: Glifosato"
            />
          </div>
          <div>
            <label className="label">Fabricante</label>
            <input
              className="input"
              value={form.fabricante}
              onChange={(e) => setForm({ ...form, fabricante: e.target.value })}
              placeholder="Bayer, Syngenta..."
            />
          </div>
          <div>
            <label className="label">Registro MAPA</label>
            <input
              className="input"
              value={form.registro_mapa}
              onChange={(e) => setForm({ ...form, registro_mapa: e.target.value })}
              placeholder="BR-12345"
            />
          </div>
          <div>
            <label className="label">Fazenda (vazio = Global)</label>
            <select
              className="input"
              value={form.fazenda_id}
              onChange={(e) => setForm({ ...form, fazenda_id: e.target.value })}
            >
              <option value="">Global</option>
              {fazendas.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Preco Unitario (R$) *</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={form.preco_unitario}
              onChange={(e) => setForm({ ...form, preco_unitario: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Estoque Atual</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={form.estoque_atual}
              onChange={(e) => setForm({ ...form, estoque_atual: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Estoque Minimo</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={form.estoque_minimo}
              onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              id="ins_cert"
              type="checkbox"
              checked={form.certificacao_permitida}
              onChange={(e) => setForm({ ...form, certificacao_permitida: e.target.checked })}
              style={{ width: 16, height: 16 }}
            />
            <label htmlFor="ins_cert" style={{ cursor: "pointer", fontSize: 14 }}>
              Certificacao organica permitida
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Observacoes</label>
            <textarea
              className="input"
              rows={2}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              style={{ resize: "vertical" }}
            />
          </div>
        </div>
      </Modal>

      {/* Ajuste de estoque */}
      <Modal
        open={!!ajusteAlvo}
        onClose={() => setAjusteAlvo(null)}
        titulo="Ajustar Inventario"
        larguraMax={420}
        rodape={
          <>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setAjusteAlvo(null)}
              disabled={ajustando}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={aplicarAjuste}
              disabled={ajustando}
            >
              {ajustando ? "Salvando..." : "Confirmar"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            <strong style={{ color: "var(--text)" }}>{ajusteAlvo?.nome}</strong>
            <br />
            Estoque atual: {fmt(ajusteAlvo?.estoque_atual || 0, 2)} {ajusteAlvo?.unidade}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className={ajusteTipo === "entrada" ? "btn-primary" : "btn-ghost"}
              onClick={() => setAjusteTipo("entrada")}
              style={{ flex: 1 }}
            >
              + Entrada
            </button>
            <button
              type="button"
              className={ajusteTipo === "saida" ? "btn-danger" : "btn-ghost"}
              onClick={() => setAjusteTipo("saida")}
              style={{ flex: 1 }}
            >
              - Saida
            </button>
          </div>
          <div>
            <label className="label">Quantidade ({ajusteAlvo?.unidade})</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={ajusteQtd}
              onChange={(e) => setAjusteQtd(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="label">Observacao</label>
            <input
              className="input"
              value={ajusteObs}
              onChange={(e) => setAjusteObs(e.target.value)}
              placeholder="Ex: Compra NF 1234"
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmar}
        titulo="Excluir insumo?"
        mensagem={`Desativar o insumo "${confirmar?.nome}"? Os dados nao serao apagados.`}
        destrutivo
        textoConfirmar="Excluir"
        onCancelar={() => setConfirmar(null)}
        onConfirmar={confirmarExclusao}
      />
    </div>
  );
}
