"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Fazenda, Maquina, Manutencao, StatusMaquina, TipoManutencao } from "@/lib/types";
import { fmt, hoje } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import KpiCard from "@/components/ui/KpiCard";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const TIPOS = ["Trator", "Colheitadeira", "Plantadeira", "Pulverizador", "Veiculo", "Implemento", "Outro"];
const STATUS_OPTS: { v: StatusMaquina; l: string }[] = [
  { v: "ativo", l: "Disponivel" },
  { v: "manutencao", l: "Em Manutencao" },
  { v: "inativo", l: "Inativo" },
];

type Form = {
  nome: string;
  tipo: string;
  marca: string;
  modelo: string;
  ano: string;
  placa: string;
  numero_serie: string;
  horimetro_atual: string;
  status: StatusMaquina;
  fazenda_id: string;
  observacoes: string;
  valor_aquisicao: string;
  ano_aquisicao: string;
  vida_util_anos: string;
  valor_residual: string;
};

const FORM_VAZIO: Form = {
  nome: "",
  tipo: "",
  marca: "",
  modelo: "",
  ano: "",
  placa: "",
  numero_serie: "",
  horimetro_atual: "0",
  status: "ativo",
  fazenda_id: "",
  observacoes: "",
  valor_aquisicao: "",
  ano_aquisicao: "",
  vida_util_anos: "10",
  valor_residual: "0",
};

type FormManut = {
  tipo: TipoManutencao;
  data: string;
  horimetro: string;
  descricao: string;
  custo: string;
  oficina: string;
  proximo_h: string;
};

const MANUT_VAZIO: FormManut = {
  tipo: "preventiva",
  data: hoje(),
  horimetro: "",
  descricao: "",
  custo: "",
  oficina: "",
  proximo_h: "",
};

export default function MaquinasPage() {
  const [itens, setItens] = useState<Maquina[]>([]);
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroFaz, setFiltroFaz] = useState("");

  const [novoOpen, setNovoOpen] = useState(false);
  const [editando, setEditando] = useState<Maquina | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [confirmar, setConfirmar] = useState<{ id: string; nome: string } | null>(null);

  // Manutencao
  const [manutAlvo, setManutAlvo] = useState<Maquina | null>(null);
  const [formManut, setFormManut] = useState<FormManut>(MANUT_VAZIO);
  const [salvandoManut, setSalvandoManut] = useState(false);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    const sb = getSupabase();
    const [rMaq, rFaz] = await Promise.all([
      sb.from("maquinas").select("*").eq("ativo", true).order("nome"),
      sb.from("fazendas").select("*").eq("ativo", true).order("nome"),
    ]);
    if (rMaq.error || rFaz.error) toast.error("Erro ao carregar maquinas");
    setItens((rMaq.data || []) as Maquina[]);
    setFazendas((rFaz.data || []) as Fazenda[]);
    setCarregando(false);
  }

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return itens.filter((m) => {
      if (filtroTipo && m.tipo !== filtroTipo) return false;
      if (filtroStatus && m.status !== filtroStatus) return false;
      if (filtroFaz && m.fazenda_id !== filtroFaz) return false;
      if (q) {
        const hit =
          (m.nome || "").toLowerCase().includes(q) ||
          (m.tipo || "").toLowerCase().includes(q) ||
          (m.marca || "").toLowerCase().includes(q) ||
          (m.modelo || "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [itens, busca, filtroTipo, filtroStatus, filtroFaz]);

  const kpis = useMemo(() => {
    const total = itens.length;
    const ativas = itens.filter((m) => m.status === "ativo").length;
    const manut = itens.filter((m) => m.status === "manutencao").length;
    return { total, ativas, manut };
  }, [itens]);

  function abrirNovo() {
    setForm({ ...FORM_VAZIO, fazenda_id: filtroFaz || "" });
    setEditando(null);
    setNovoOpen(true);
  }

  function abrirEditar(m: Maquina) {
    setForm({
      nome: m.nome || "",
      tipo: m.tipo || "",
      marca: m.marca || "",
      modelo: m.modelo || "",
      ano: m.ano != null ? String(m.ano) : "",
      placa: m.placa || "",
      numero_serie: m.numero_serie || "",
      horimetro_atual: String(m.horimetro_atual ?? 0),
      status: m.status || "ativo",
      fazenda_id: m.fazenda_id || "",
      observacoes: m.observacoes || "",
      valor_aquisicao: m.valor_aquisicao != null ? String(m.valor_aquisicao) : "",
      ano_aquisicao: m.ano_aquisicao != null ? String(m.ano_aquisicao) : "",
      vida_util_anos: m.vida_util_anos != null ? String(m.vida_util_anos) : "10",
      valor_residual: m.valor_residual != null ? String(m.valor_residual) : "0",
    });
    setEditando(m);
    setNovoOpen(false);
  }

  function fecharForm() {
    setNovoOpen(false);
    setEditando(null);
  }

  async function salvar() {
    if (!form.nome.trim()) {
      toast.error("Informe o nome da maquina");
      return;
    }
    setSalvando(true);
    const sb = getSupabase();
    const payload = {
      nome: form.nome.trim(),
      tipo: form.tipo || null,
      marca: form.marca.trim() || null,
      modelo: form.modelo.trim() || null,
      ano: form.ano ? parseInt(form.ano) : null,
      placa: form.placa.trim() || null,
      numero_serie: form.numero_serie.trim() || null,
      horimetro_atual: form.horimetro_atual ? parseFloat(form.horimetro_atual) : 0,
      status: form.status,
      fazenda_id: form.fazenda_id || null,
      observacoes: form.observacoes.trim() || null,
      valor_aquisicao: form.valor_aquisicao ? parseFloat(form.valor_aquisicao) : null,
      ano_aquisicao: form.ano_aquisicao ? parseInt(form.ano_aquisicao) : null,
      vida_util_anos: form.vida_util_anos ? parseInt(form.vida_util_anos) : null,
      valor_residual: form.valor_residual ? parseFloat(form.valor_residual) : 0,
    };
    let r;
    if (editando) {
      r = await sb.from("maquinas").update(payload).eq("id", editando.id);
    } else {
      r = await sb.from("maquinas").insert({ ...payload, ativo: true });
    }
    setSalvando(false);
    if (r.error) {
      toast.error("Erro: " + r.error.message);
      return;
    }
    toast.success(editando ? "Maquina atualizada!" : "Maquina cadastrada!");
    fecharForm();
    carregar();
  }

  async function confirmarExclusao() {
    if (!confirmar) return;
    const sb = getSupabase();
    const r = await sb.from("maquinas").update({ ativo: false }).eq("id", confirmar.id);
    if (r.error) {
      toast.error("Erro: " + r.error.message);
      return;
    }
    toast.success("Maquina removida");
    setConfirmar(null);
    carregar();
  }

  function abrirManut(m: Maquina) {
    setManutAlvo(m);
    setFormManut({
      ...MANUT_VAZIO,
      horimetro: m.horimetro_atual != null ? String(m.horimetro_atual) : "",
    });
  }

  async function salvarManut() {
    if (!manutAlvo) return;
    if (!formManut.descricao.trim()) {
      toast.error("Informe a descricao");
      return;
    }
    if (!formManut.data) {
      toast.error("Informe a data");
      return;
    }
    setSalvandoManut(true);
    const sb = getSupabase();
    const payload: Partial<Manutencao> = {
      maquina_id: manutAlvo.id,
      tipo: formManut.tipo,
      data: formManut.data,
      horimetro: formManut.horimetro ? parseFloat(formManut.horimetro) : null,
      descricao: formManut.descricao.trim(),
      custo: formManut.custo ? parseFloat(formManut.custo) : null,
      oficina: formManut.oficina.trim() || null,
      proximo_h: formManut.proximo_h ? parseFloat(formManut.proximo_h) : null,
    };
    const r = await sb.from("manutencoes").insert(payload);
    if (r.error) {
      setSalvandoManut(false);
      toast.error("Erro: " + r.error.message);
      return;
    }
    // Atualiza horimetro da maquina e proxima manutencao
    const upd: Partial<Maquina> = {};
    if (payload.horimetro != null) upd.horimetro_atual = payload.horimetro;
    if (payload.proximo_h != null) upd.proxima_manutencao_h = payload.proximo_h;
    if (Object.keys(upd).length) {
      await sb.from("maquinas").update(upd).eq("id", manutAlvo.id);
    }
    setSalvandoManut(false);
    toast.success("Manutencao registrada!");
    setManutAlvo(null);
    carregar();
  }

  function badgeStatus(s: StatusMaquina) {
    if (s === "ativo") return <span className="badge badge-success">Disponivel</span>;
    if (s === "manutencao") return <span className="badge badge-warn">Manutencao</span>;
    return <span className="badge badge-neutral">Inativo</span>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Maquinas"
        icone="🚜"
        subtitulo="Frota: tratores, colheitadeiras, implementos"
        acoes={
          <button className="btn-primary" onClick={abrirNovo}>
            + Nova Maquina
          </button>
        }
      />

      <div className="grid-cards">
        <KpiCard rotulo="Total" valor={kpis.total} icone="🚜" accent="blue" />
        <KpiCard rotulo="Ativas" valor={kpis.ativas} icone="✅" accent="green" />
        <KpiCard
          rotulo="Em manutencao"
          valor={kpis.manut}
          icone="🔧"
          accent={kpis.manut > 0 ? "orange" : "green"}
        />
      </div>

      <div className="card flex flex-wrap gap-3 items-center">
        <input
          className="input"
          style={{ maxWidth: 260 }}
          placeholder="Buscar maquina..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          className="input"
          style={{ maxWidth: 180 }}
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
        >
          <option value="">Todos os tipos</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className="input"
          style={{ maxWidth: 180 }}
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {STATUS_OPTS.map((s) => (
            <option key={s.v} value={s.v}>
              {s.l}
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
          icone="🚜"
          titulo={
            busca || filtroTipo || filtroStatus || filtroFaz
              ? "Nenhuma maquina encontrada"
              : "Nenhuma maquina cadastrada"
          }
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Nome / Tipo</th>
                <th>Marca / Modelo</th>
                <th>Fazenda</th>
                <th>Status</th>
                <th>Horimetro</th>
                <th>Placa</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((m) => {
                const fazNome = fazendas.find((f) => f.id === m.fazenda_id)?.nome;
                return (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.nome}</strong>
                      <div style={{ color: "var(--muted)", fontSize: 12 }}>
                        {[m.tipo, m.ano].filter(Boolean).join(" • ") || "—"}
                      </div>
                    </td>
                    <td style={{ color: "var(--muted)" }}>
                      {[m.marca, m.modelo].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td>
                      {fazNome || <span style={{ color: "var(--muted)" }}>Sem fazenda</span>}
                    </td>
                    <td>{badgeStatus(m.status)}</td>
                    <td>{m.horimetro_atual != null ? `${fmt(m.horimetro_atual, 0)} h` : "—"}</td>
                    <td>{m.placa || "—"}</td>
                    <td>
                      <div className="flex gap-2 flex-wrap">
                        <button className="btn-ghost" onClick={() => abrirEditar(m)}>
                          Editar
                        </button>
                        <button className="btn-secondary" onClick={() => abrirManut(m)}>
                          Registrar manutencao
                        </button>
                        <button
                          className="btn-danger"
                          onClick={() => setConfirmar({ id: m.id, nome: m.nome })}
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

      {/* Form maquina */}
      <Modal
        open={novoOpen || !!editando}
        onClose={fecharForm}
        titulo={editando ? "Editar Maquina" : "Nova Maquina"}
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
            <label className="label">Nome *</label>
            <input
              className="input"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Trator John Deere 1"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Tipo</label>
            <select
              className="input"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            >
              <option value="">Selecione...</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as StatusMaquina })}
            >
              {STATUS_OPTS.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Marca</label>
            <input
              className="input"
              value={form.marca}
              onChange={(e) => setForm({ ...form, marca: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Modelo</label>
            <input
              className="input"
              value={form.modelo}
              onChange={(e) => setForm({ ...form, modelo: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Ano</label>
            <input
              className="input"
              type="number"
              value={form.ano}
              onChange={(e) => setForm({ ...form, ano: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Placa</label>
            <input
              className="input"
              value={form.placa}
              onChange={(e) => setForm({ ...form, placa: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Numero de Serie</label>
            <input
              className="input"
              value={form.numero_serie}
              onChange={(e) => setForm({ ...form, numero_serie: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Horimetro Atual (h)</label>
            <input
              className="input"
              type="number"
              min="0"
              value={form.horimetro_atual}
              onChange={(e) => setForm({ ...form, horimetro_atual: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Fazenda</label>
            <select
              className="input"
              value={form.fazenda_id}
              onChange={(e) => setForm({ ...form, fazenda_id: e.target.value })}
            >
              <option value="">Sem fazenda</option>
              {fazendas.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
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

          <div className="sm:col-span-2 pt-2 mt-2 border-t border-ja-brd">
            <div className="text-sm font-semibold text-ja-dark mb-2">
              Depreciacao (opcional, usado no fechamento de safra)
            </div>
            <div className="text-xs text-ja-muted mb-3">
              Linha reta: (valor_aquisicao - valor_residual) / vida_util_anos por ano.
            </div>
          </div>
          <div>
            <label className="label">Valor de aquisicao (R$)</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={form.valor_aquisicao}
              onChange={(e) => setForm({ ...form, valor_aquisicao: e.target.value })}
              placeholder="Ex: 350000"
            />
          </div>
          <div>
            <label className="label">Ano de aquisicao</label>
            <input
              className="input"
              type="number"
              min="1980"
              max="2100"
              value={form.ano_aquisicao}
              onChange={(e) => setForm({ ...form, ano_aquisicao: e.target.value })}
              placeholder={String(new Date().getFullYear())}
            />
          </div>
          <div>
            <label className="label">Vida util (anos)</label>
            <input
              className="input"
              type="number"
              min="1"
              max="50"
              value={form.vida_util_anos}
              onChange={(e) => setForm({ ...form, vida_util_anos: e.target.value })}
              placeholder="10"
            />
          </div>
          <div>
            <label className="label">Valor residual (R$)</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={form.valor_residual}
              onChange={(e) => setForm({ ...form, valor_residual: e.target.value })}
              placeholder="0"
            />
          </div>
        </div>
      </Modal>

      {/* Form manutencao */}
      <Modal
        open={!!manutAlvo}
        onClose={() => setManutAlvo(null)}
        titulo={`Registrar Manutencao - ${manutAlvo?.nome || ""}`}
        larguraMax={640}
        rodape={
          <>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setManutAlvo(null)}
              disabled={salvandoManut}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={salvarManut}
              disabled={salvandoManut}
            >
              {salvandoManut ? "Salvando..." : "Registrar"}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Tipo *</label>
            <select
              className="input"
              value={formManut.tipo}
              onChange={(e) =>
                setFormManut({ ...formManut, tipo: e.target.value as TipoManutencao })
              }
            >
              <option value="preventiva">Preventiva</option>
              <option value="corretiva">Corretiva</option>
              <option value="revisao">Revisao</option>
            </select>
          </div>
          <div>
            <label className="label">Data *</label>
            <input
              className="input"
              type="date"
              value={formManut.data}
              onChange={(e) => setFormManut({ ...formManut, data: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Horimetro (h)</label>
            <input
              className="input"
              type="number"
              min="0"
              value={formManut.horimetro}
              onChange={(e) => setFormManut({ ...formManut, horimetro: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Proxima manut. (h)</label>
            <input
              className="input"
              type="number"
              min="0"
              value={formManut.proximo_h}
              onChange={(e) => setFormManut({ ...formManut, proximo_h: e.target.value })}
              placeholder="Ex: 1200"
            />
          </div>
          <div>
            <label className="label">Custo (R$)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={formManut.custo}
              onChange={(e) => setFormManut({ ...formManut, custo: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Oficina</label>
            <input
              className="input"
              value={formManut.oficina}
              onChange={(e) => setFormManut({ ...formManut, oficina: e.target.value })}
              placeholder="Nome / local"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Descricao *</label>
            <textarea
              className="input"
              rows={3}
              value={formManut.descricao}
              onChange={(e) => setFormManut({ ...formManut, descricao: e.target.value })}
              placeholder="Ex: Troca de oleo + filtros, revisao geral..."
              style={{ resize: "vertical" }}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmar}
        titulo="Excluir maquina?"
        mensagem={`Desativar a maquina "${confirmar?.nome}"? Os dados nao serao apagados.`}
        destrutivo
        textoConfirmar="Excluir"
        onCancelar={() => setConfirmar(null)}
        onConfirmar={confirmarExclusao}
      />
    </div>
  );
}
