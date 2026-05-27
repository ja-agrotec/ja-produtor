"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { DespesaFixa, Fazenda } from "@/lib/types";
import { fmtBRL, hoje } from "@/lib/format";
import { DEBOUNCE_MS, debounce } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import KpiCard from "@/components/ui/KpiCard";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FazendaSelector from "@/components/ui/FazendaSelector";

type Periodicidade = "mensal" | "bimestral" | "trimestral" | "semestral" | "anual";

const PERIODICIDADES: { v: Periodicidade; l: string; meses: number }[] = [
  { v: "mensal", l: "Mensal", meses: 1 },
  { v: "bimestral", l: "Bimestral", meses: 2 },
  { v: "trimestral", l: "Trimestral", meses: 3 },
  { v: "semestral", l: "Semestral", meses: 6 },
  { v: "anual", l: "Anual", meses: 12 },
];

const CATEGORIAS = [
  "Internet", "Telefone", "Energia", "Agua", "Contador",
  "Funcionario Fixo", "Aluguel", "Seguro", "Software/Sistema",
  "Imposto", "Manutencao Predial", "Arrendamento", "Tributos",
  "Certificacao", "Outros",
];

type DespesaComFazenda = DespesaFixa & { fazendas?: { nome: string } | null };

function mesesDe(p: Periodicidade): number {
  return PERIODICIDADES.find((x) => x.v === p)?.meses || 1;
}

function valorMensalEquiv(d: DespesaFixa): number {
  return Number(d.valor || 0) / mesesDe(d.periodicidade);
}

const FORM_INICIAL = {
  id: "" as string | null,
  nome: "",
  categoria: "Internet",
  fazenda_id: "" as string | null,
  valor: 0,
  periodicidade: "mensal" as Periodicidade,
  data_inicio: hoje(),
  data_fim: "" as string | null,
  observacoes: "",
  ativo: true,
};

export default function DespesasFixasPage() {
  const [carregando, setCarregando] = useState(true);
  const [itens, setItens] = useState<DespesaComFazenda[]>([]);
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);

  const [filtroFazenda, setFiltroFazenda] = useState<string>("");
  const [filtroPeriodicidade, setFiltroPeriodicidade] = useState<string>("");
  const [busca, setBusca] = useState<string>("");
  const [buscaInput, setBuscaInput] = useState<string>("");

  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [excluir, setExcluir] = useState<DespesaComFazenda | null>(null);

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
        sb
          .from("despesas_fixas")
          .select("*, fazendas(nome)")
          .eq("ativo", true)
          .order("nome"),
      ]);
      if (f.error) throw f.error;
      if (d.error) throw d.error;
      setFazendas((f.data || []) as Fazenda[]);
      setItens((d.data || []) as DespesaComFazenda[]);
    } catch (e: any) {
      toast.error("Erro ao carregar: " + (e.message || e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return itens.filter((o) => {
      if (filtroFazenda && o.fazenda_id !== filtroFazenda) return false;
      if (filtroPeriodicidade && o.periodicidade !== filtroPeriodicidade) return false;
      if (termo) {
        const hay = `${o.nome} ${o.categoria || ""}`.toLowerCase();
        if (!hay.includes(termo)) return false;
      }
      return true;
    });
  }, [itens, filtroFazenda, filtroPeriodicidade, busca]);

  const totalMensal = useMemo(
    () => filtrados.reduce((a, b) => a + valorMensalEquiv(b), 0),
    [filtrados],
  );
  const totalAnual = totalMensal * 12;

  function abrirNovo() {
    setForm({ ...FORM_INICIAL });
    setModalAberto(true);
  }

  function abrirEditar(d: DespesaComFazenda) {
    setForm({
      id: d.id,
      nome: d.nome,
      categoria: d.categoria || "Internet",
      fazenda_id: d.fazenda_id || "",
      valor: Number(d.valor || 0),
      periodicidade: d.periodicidade,
      data_inicio: d.data_inicio || hoje(),
      data_fim: d.data_fim || "",
      observacoes: d.observacoes || "",
      ativo: d.ativo !== false,
    });
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.nome.trim()) { toast.error("Informe o nome."); return; }
    if (!(Number(form.valor) > 0)) { toast.error("Valor deve ser maior que zero."); return; }
    setSalvando(true);
    try {
      const sb = getSupabase();
      const payload = {
        nome: form.nome.trim(),
        categoria: form.categoria || null,
        fazenda_id: form.fazenda_id || null,
        valor: Number(form.valor),
        periodicidade: form.periodicidade,
        data_inicio: form.data_inicio || null,
        data_fim: form.data_fim || null,
        observacoes: form.observacoes || null,
        ativo: form.ativo,
      };
      if (form.id) {
        const r = await sb.from("despesas_fixas").update(payload).eq("id", form.id);
        if (r.error) throw r.error;
        toast.success("Despesa atualizada.");
      } else {
        const r = await sb.from("despesas_fixas").insert(payload);
        if (r.error) throw r.error;
        toast.success("Despesa cadastrada.");
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
      // Soft delete
      const r = await sb.from("despesas_fixas").update({ ativo: false }).eq("id", excluir.id);
      if (r.error) throw r.error;
      toast.success("Despesa removida.");
      setExcluir(null);
      await carregar();
    } catch (e: any) {
      toast.error("Erro ao excluir: " + (e.message || e));
    }
  }

  return (
    <div>
      <PageHeader
        titulo="Despesas Fixas"
        subtitulo="Custos recorrentes da operação — equivalente mensal calculado automaticamente"
        icone="💸"
        acoes={
          <>
            <FazendaSelector onChange={(id) => setFiltroFazenda(id || "")} />
            <button className="btn-primary" onClick={abrirNovo}>+ Nova Despesa</button>
          </>
        }
      />

      <div className="grid-cards mb-6">
        <KpiCard rotulo="Itens" valor={String(filtrados.length)} icone="📋" accent="blue" />
        <KpiCard rotulo="Total/mês (equiv.)" valor={fmtBRL(totalMensal)} icone="📅" accent="green" />
        <KpiCard rotulo="Total/ano" valor={fmtBRL(totalAnual)} icone="📈" accent="purple" />
      </div>

      <div className="card mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="label">Buscar</label>
            <input
              className="input"
              placeholder="Nome ou categoria..."
              value={buscaInput}
              onChange={(e) => { setBuscaInput(e.target.value); debouncedBusca(e.target.value); }}
            />
          </div>
          <div style={{ minWidth: 180 }}>
            <label className="label">Periodicidade</label>
            <select
              className="input"
              value={filtroPeriodicidade}
              onChange={(e) => setFiltroPeriodicidade(e.target.value)}
            >
              <option value="">Todas</option>
              {PERIODICIDADES.map((p) => (
                <option key={p.v} value={p.v}>{p.l}</option>
              ))}
            </select>
          </div>
          <button
            className="btn-ghost"
            onClick={() => {
              setBusca(""); setBuscaInput(""); setFiltroPeriodicidade("");
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
          icone="💸"
          titulo="Nenhuma despesa fixa"
          descricao="Cadastre as despesas recorrentes da sua operação (energia, internet, contador, etc.)."
          acao={<button className="btn-primary" onClick={abrirNovo}>+ Nova Despesa</button>}
        />
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Fazenda</th>
                <th style={{ textAlign: "right" }}>Valor</th>
                <th>Período</th>
                <th style={{ textAlign: "right" }}>Equiv/mês</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((o) => {
                const per = PERIODICIDADES.find((p) => p.v === o.periodicidade) || PERIODICIDADES[0];
                return (
                  <tr key={o.id}>
                    <td><strong>{o.nome}</strong></td>
                    <td><span className="badge badge-neutral">{o.categoria || "—"}</span></td>
                    <td>{o.fazendas?.nome || "Todas"}</td>
                    <td style={{ textAlign: "right" }}>{fmtBRL(Number(o.valor || 0))}</td>
                    <td>{per.l}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>
                      {fmtBRL(valorMensalEquiv(o))}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn-ghost" onClick={() => abrirEditar(o)}>Editar</button>
                      <button className="btn-ghost" style={{ color: "var(--danger)" }} onClick={() => setExcluir(o)}>Excluir</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        titulo={form.id ? "Editar Despesa Fixa" : "Nova Despesa Fixa"}
        larguraMax={620}
        rodape={
          <>
            <button className="btn-ghost" onClick={() => setModalAberto(false)}>Cancelar</button>
            <button className="btn-primary" onClick={salvar} disabled={salvando}>
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
              placeholder="Ex: Internet matriz"
            />
          </div>
          <div>
            <label className="label">Categoria</label>
            <select
              className="input"
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            >
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Fazenda</label>
            <select
              className="input"
              value={form.fazenda_id || ""}
              onChange={(e) => setForm({ ...form, fazenda_id: e.target.value || null })}
            >
              <option value="">(Todas as fazendas)</option>
              {fazendas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Valor (R$) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={form.valor || ""}
              onChange={(e) => setForm({ ...form, valor: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="label">Periodicidade</label>
            <select
              className="input"
              value={form.periodicidade}
              onChange={(e) => setForm({ ...form, periodicidade: e.target.value as Periodicidade })}
            >
              {PERIODICIDADES.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Início</label>
            <input
              type="date"
              className="input"
              value={form.data_inicio || ""}
              onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Fim (opcional)</label>
            <input
              type="date"
              className="input"
              value={form.data_fim || ""}
              onChange={(e) => setForm({ ...form, data_fim: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Observações</label>
            <textarea
              className="input"
              rows={2}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>
        </div>

        <div
          className="mt-3 p-3 rounded-ja text-xs"
          style={{ background: "var(--green-bg)", color: "var(--muted)" }}
        >
          <strong>Equivalente mensal:</strong>{" "}
          {fmtBRL(Number(form.valor || 0) / mesesDe(form.periodicidade))}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!excluir}
        titulo="Excluir despesa fixa?"
        mensagem={`Tem certeza que deseja excluir "${excluir?.nome}"? Esta ação é reversível (soft delete).`}
        textoConfirmar="Excluir"
        destrutivo
        onConfirmar={confirmarExcluir}
        onCancelar={() => setExcluir(null)}
      />
    </div>
  );
}
