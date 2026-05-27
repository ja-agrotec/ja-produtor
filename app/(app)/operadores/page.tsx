"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Fazenda, Operador } from "@/lib/types";
import { fmtBRL, fmtData } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import KpiCard from "@/components/ui/KpiCard";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type OperadorComFaz = Operador & { fazendas?: { nome: string } | null };

const FUNCOES = ["operador", "motorista", "mecanico", "agronomico", "supervisor", "outro"];
const CATS_CNH = ["A", "AB", "B", "C", "D", "E"];

type Form = {
  nome: string;
  cpf: string;
  telefone: string;
  cnh: string;
  categoria_cnh: string;
  funcao: string;
  salario: string;
  data_admissao: string;
  fazenda_id: string;
};

const FORM_VAZIO: Form = {
  nome: "",
  cpf: "",
  telefone: "",
  cnh: "",
  categoria_cnh: "",
  funcao: "",
  salario: "",
  data_admissao: "",
  fazenda_id: "",
};

export default function OperadoresPage() {
  const [itens, setItens] = useState<OperadorComFaz[]>([]);
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [fazFiltro, setFazFiltro] = useState("");

  const [novoOpen, setNovoOpen] = useState(false);
  const [editando, setEditando] = useState<Operador | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [confirmar, setConfirmar] = useState<{ id: string; nome: string } | null>(null);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    const sb = getSupabase();
    const [rFaz, rOp] = await Promise.all([
      sb.from("fazendas").select("*").eq("ativo", true).order("nome"),
      sb.from("operadores").select("*, fazendas(nome)").eq("ativo", true).order("nome"),
    ]);
    if (rFaz.error || rOp.error) toast.error("Erro ao carregar operadores");
    setFazendas((rFaz.data || []) as Fazenda[]);
    setItens((rOp.data || []) as OperadorComFaz[]);
    setCarregando(false);
  }

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return itens.filter((o) => {
      if (fazFiltro && o.fazenda_id !== fazFiltro) return false;
      if (q) {
        const hit =
          (o.nome || "").toLowerCase().includes(q) ||
          (o.funcao || "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [itens, busca, fazFiltro]);

  function abrirNovo() {
    setForm({ ...FORM_VAZIO, fazenda_id: fazFiltro || "" });
    setEditando(null);
    setNovoOpen(true);
  }

  function abrirEditar(o: OperadorComFaz) {
    setForm({
      nome: o.nome || "",
      cpf: o.cpf || "",
      telefone: o.telefone || "",
      cnh: o.cnh || "",
      categoria_cnh: o.categoria_cnh || "",
      funcao: o.funcao || "",
      salario: o.salario != null ? String(o.salario) : "",
      data_admissao: o.data_admissao || "",
      fazenda_id: o.fazenda_id || "",
    });
    setEditando(o);
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
    if (!form.funcao) {
      toast.error("Selecione a funcao");
      return;
    }
    if (!form.fazenda_id) {
      toast.error("Selecione a fazenda");
      return;
    }
    setSalvando(true);
    const sb = getSupabase();
    const payload = {
      nome: form.nome.trim(),
      cpf: form.cpf.trim() || null,
      telefone: form.telefone.trim() || null,
      cnh: form.cnh.trim() || null,
      categoria_cnh: form.categoria_cnh || null,
      funcao: form.funcao || null,
      salario: form.salario ? parseFloat(form.salario) : null,
      data_admissao: form.data_admissao || null,
      fazenda_id: form.fazenda_id || null,
    };
    let r;
    if (editando) {
      r = await sb.from("operadores").update(payload).eq("id", editando.id);
    } else {
      r = await sb.from("operadores").insert({ ...payload, ativo: true });
    }
    setSalvando(false);
    if (r.error) {
      toast.error("Erro: " + r.error.message);
      return;
    }
    toast.success(editando ? "Operador atualizado!" : "Operador cadastrado!");
    fecharForm();
    carregar();
  }

  async function confirmarExclusao() {
    if (!confirmar) return;
    const sb = getSupabase();
    const r = await sb.from("operadores").update({ ativo: false }).eq("id", confirmar.id);
    if (r.error) {
      toast.error("Erro: " + r.error.message);
      return;
    }
    toast.success("Operador removido");
    setConfirmar(null);
    carregar();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Operadores"
        icone="👷"
        subtitulo="Equipe de campo, motoristas e tecnicos"
        acoes={
          <button className="btn-primary" onClick={abrirNovo}>
            + Novo Operador
          </button>
        }
      />

      <div className="grid-cards">
        <KpiCard rotulo="Operadores ativos" valor={filtrados.length} icone="👷" accent="green" />
      </div>

      <div className="card flex flex-wrap gap-3 items-center">
        <select
          className="input"
          style={{ maxWidth: 240 }}
          value={fazFiltro}
          onChange={(e) => setFazFiltro(e.target.value)}
        >
          <option value="">Todas as fazendas</option>
          {fazendas.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </select>
        <input
          className="input"
          style={{ maxWidth: 280 }}
          placeholder="Buscar operador ou funcao..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {carregando ? (
        <p style={{ color: "var(--muted)" }}>Carregando...</p>
      ) : filtrados.length === 0 ? (
        <EmptyState
          icone="👷"
          titulo={busca || fazFiltro ? "Nenhum operador encontrado" : "Nenhum operador cadastrado"}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Funcao</th>
                <th>Fazenda</th>
                <th>Telefone</th>
                <th>CNH</th>
                <th>Salario</th>
                <th>Admissao</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((o) => (
                <tr key={o.id}>
                  <td>
                    <strong>{o.nome}</strong>
                    {o.cpf && (
                      <div style={{ color: "var(--muted)", fontSize: 12 }}>CPF {o.cpf}</div>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-neutral">{o.funcao || "—"}</span>
                  </td>
                  <td>{o.fazendas?.nome || "—"}</td>
                  <td>{o.telefone || "—"}</td>
                  <td>
                    {o.cnh ? (
                      <span className="badge badge-info">{o.categoria_cnh || "CNH"}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{o.salario != null ? fmtBRL(o.salario) : "—"}</td>
                  <td>{fmtData(o.data_admissao)}</td>
                  <td>
                    <div className="flex gap-2 flex-wrap">
                      <button className="btn-ghost" onClick={() => abrirEditar(o)}>
                        Editar
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => setConfirmar({ id: o.id, nome: o.nome })}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={novoOpen || !!editando}
        onClose={fecharForm}
        titulo={editando ? "Editar Operador" : "Novo Operador"}
        larguraMax={640}
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
            <label className="label">Nome *</label>
            <input
              className="input"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Nome completo"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Funcao *</label>
            <select
              className="input"
              value={form.funcao}
              onChange={(e) => setForm({ ...form, funcao: e.target.value })}
            >
              <option value="">Selecione...</option>
              {FUNCOES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Fazenda *</label>
            <select
              className="input"
              value={form.fazenda_id}
              onChange={(e) => setForm({ ...form, fazenda_id: e.target.value })}
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
            <label className="label">CPF</label>
            <input
              className="input"
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: e.target.value })}
              placeholder="000.000.000-00"
            />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input
              className="input"
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              placeholder="(99) 99999-9999"
            />
          </div>
          <div>
            <label className="label">CNH</label>
            <input
              className="input"
              value={form.cnh}
              onChange={(e) => setForm({ ...form, cnh: e.target.value })}
              placeholder="Numero da CNH"
            />
          </div>
          <div>
            <label className="label">Categoria CNH</label>
            <select
              className="input"
              value={form.categoria_cnh}
              onChange={(e) => setForm({ ...form, categoria_cnh: e.target.value })}
            >
              <option value="">Sem CNH</option>
              {CATS_CNH.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Salario (R$)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={form.salario}
              onChange={(e) => setForm({ ...form, salario: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Data de Admissao</label>
            <input
              className="input"
              type="date"
              value={form.data_admissao}
              onChange={(e) => setForm({ ...form, data_admissao: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmar}
        titulo="Excluir operador?"
        mensagem={`Desativar o operador "${confirmar?.nome}"? Os dados nao serao apagados.`}
        destrutivo
        textoConfirmar="Excluir"
        onCancelar={() => setConfirmar(null)}
        onConfirmar={confirmarExclusao}
      />
    </div>
  );
}
