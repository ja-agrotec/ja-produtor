"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Fazenda, Talhao } from "@/lib/types";
import { fmt } from "@/lib/format";
import { CULTURAS_PADRAO } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import KpiCard from "@/components/ui/KpiCard";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type TalhaoComFaz = Talhao & { fazendas?: { nome: string } | null };

type Form = {
  nome: string;
  fazenda_id: string;
  area_ha: string;
  cultura_atual: string;
  solo: string;
  irrigado: boolean;
  coordenadas: string;
  observacoes: string;
};

const FORM_VAZIO: Form = {
  nome: "",
  fazenda_id: "",
  area_ha: "",
  cultura_atual: "",
  solo: "",
  irrigado: false,
  coordenadas: "",
  observacoes: "",
};

const SOLOS = ["", "Argiloso", "Arenoso", "Franco", "Siltoso", "Franco-Argiloso", "Franco-Arenoso"];
const CULTURAS = ["", ...CULTURAS_PADRAO.map((c) => c.charAt(0) + c.slice(1).toLowerCase()), "Algodao", "Trigo", "Arroz", "Feijao", "Sorgo", "Girassol"];

export default function TalhoesPage() {
  const [itens, setItens] = useState<TalhaoComFaz[]>([]);
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [fazFiltro, setFazFiltro] = useState("");

  const [novoOpen, setNovoOpen] = useState(false);
  const [editando, setEditando] = useState<Talhao | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [confirmar, setConfirmar] = useState<{ id: string; nome: string } | null>(null);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    const sb = getSupabase();
    const [rFaz, rTal] = await Promise.all([
      sb.from("fazendas").select("*").eq("ativo", true).order("nome"),
      sb.from("talhoes").select("*, fazendas(nome)").eq("ativo", true).order("nome"),
    ]);
    if (rFaz.error || rTal.error) {
      toast.error("Erro ao carregar talhoes");
    }
    setFazendas((rFaz.data || []) as Fazenda[]);
    setItens((rTal.data || []) as TalhaoComFaz[]);
    setCarregando(false);
  }

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return itens.filter((t) => {
      if (fazFiltro && t.fazenda_id !== fazFiltro) return false;
      if (q) {
        const hit =
          (t.nome || "").toLowerCase().includes(q) ||
          (t.cultura_atual || "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [itens, busca, fazFiltro]);

  const stats = useMemo(
    () => ({
      total: filtrados.length,
      areaTotal: filtrados.reduce((s, t) => s + (t.area_ha || 0), 0),
      irrigados: filtrados.filter((t) => t.irrigado).length,
    }),
    [filtrados],
  );

  function abrirNovo() {
    setForm({ ...FORM_VAZIO, fazenda_id: fazFiltro || "" });
    setEditando(null);
    setNovoOpen(true);
  }

  function abrirEditar(t: TalhaoComFaz) {
    setForm({
      nome: t.nome || "",
      fazenda_id: t.fazenda_id || "",
      area_ha: t.area_ha != null ? String(t.area_ha) : "",
      cultura_atual: t.cultura_atual || "",
      solo: t.solo || "",
      irrigado: !!t.irrigado,
      coordenadas: t.coordenadas || "",
      observacoes: t.observacoes || "",
    });
    setEditando(t);
    setNovoOpen(false);
  }

  function fecharForm() {
    setNovoOpen(false);
    setEditando(null);
  }

  async function salvar() {
    if (!form.nome.trim()) {
      toast.error("Informe o nome do talhao");
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
      fazenda_id: form.fazenda_id,
      area_ha: form.area_ha ? parseFloat(form.area_ha) : null,
      cultura_atual: form.cultura_atual || null,
      solo: form.solo || null,
      irrigado: form.irrigado,
      coordenadas: form.coordenadas.trim() || null,
      observacoes: form.observacoes.trim() || null,
    };
    let r;
    if (editando) {
      r = await sb.from("talhoes").update(payload).eq("id", editando.id);
    } else {
      r = await sb.from("talhoes").insert({ ...payload, ativo: true });
    }
    setSalvando(false);
    if (r.error) {
      toast.error("Erro: " + r.error.message);
      return;
    }
    toast.success(editando ? "Talhao atualizado!" : "Talhao cadastrado!");
    fecharForm();
    carregar();
  }

  async function confirmarExclusao() {
    if (!confirmar) return;
    const sb = getSupabase();
    const r = await sb.from("talhoes").update({ ativo: false }).eq("id", confirmar.id);
    if (r.error) {
      toast.error("Erro: " + r.error.message);
      return;
    }
    toast.success("Talhao removido");
    setConfirmar(null);
    carregar();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Talhoes"
        icone="🌱"
        subtitulo="Cadastro e gestao dos talhoes das fazendas"
        acoes={
          <button className="btn-primary" onClick={abrirNovo}>
            + Novo Talhao
          </button>
        }
      />

      <div className="grid-cards">
        <KpiCard rotulo="Talhoes ativos" valor={stats.total} icone="🌱" accent="green" />
        <KpiCard rotulo="Area total" valor={`${fmt(stats.areaTotal, 2)} ha`} icone="📐" accent="blue" />
        <KpiCard rotulo="Irrigados" valor={stats.irrigados} icone="💧" accent="purple" />
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
          placeholder="Buscar talhao ou cultura..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {carregando ? (
        <p style={{ color: "var(--muted)" }}>Carregando...</p>
      ) : filtrados.length === 0 ? (
        <EmptyState
          icone="🌱"
          titulo={busca || fazFiltro ? "Nenhum talhao encontrado" : "Nenhum talhao cadastrado"}
          descricao="Cadastre talhoes para começar a controlar areas, culturas e produtividade."
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Fazenda</th>
                <th>Area (ha)</th>
                <th>Cultura atual</th>
                <th>Solo</th>
                <th>Irrigado</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.nome}</strong>
                  </td>
                  <td style={{ color: "var(--muted)" }}>{t.fazendas?.nome || "—"}</td>
                  <td>{t.area_ha != null ? `${fmt(t.area_ha, 2)} ha` : "—"}</td>
                  <td>{t.cultura_atual || "—"}</td>
                  <td style={{ color: "var(--muted)" }}>{t.solo || "—"}</td>
                  <td>
                    {t.irrigado ? (
                      <span className="badge badge-info">Sim</span>
                    ) : (
                      <span className="badge badge-neutral">Nao</span>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-2 flex-wrap">
                      <button className="btn-ghost" onClick={() => abrirEditar(t)}>
                        Editar
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => setConfirmar({ id: t.id, nome: t.nome })}
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
        titulo={editando ? "Editar Talhao" : "Novo Talhao"}
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
        <div className="space-y-3">
          <div>
            <label className="label">Nome do Talhao *</label>
            <input
              className="input"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Talhao 1 - Norte"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <label className="label">Area (ha)</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={form.area_ha}
                onChange={(e) => setForm({ ...form, area_ha: e.target.value })}
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="label">Cultura Atual</label>
              <select
                className="input"
                value={form.cultura_atual}
                onChange={(e) => setForm({ ...form, cultura_atual: e.target.value })}
              >
                {CULTURAS.map((c) => (
                  <option key={c} value={c}>
                    {c || "Nenhuma"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Tipo de Solo</label>
              <select
                className="input"
                value={form.solo}
                onChange={(e) => setForm({ ...form, solo: e.target.value })}
              >
                {SOLOS.map((s) => (
                  <option key={s} value={s}>
                    {s || "Selecione..."}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="tal_irr"
              type="checkbox"
              checked={form.irrigado}
              onChange={(e) => setForm({ ...form, irrigado: e.target.checked })}
              style={{ width: 16, height: 16 }}
            />
            <label htmlFor="tal_irr" style={{ cursor: "pointer", fontSize: 14 }}>
              Irrigado
            </label>
          </div>
          <div>
            <label className="label">Coordenadas (lat, lng)</label>
            <input
              className="input"
              value={form.coordenadas}
              onChange={(e) => setForm({ ...form, coordenadas: e.target.value })}
              placeholder="Ex: -20.5388, -47.4006"
            />
          </div>
          <div>
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

      <ConfirmDialog
        open={!!confirmar}
        titulo="Excluir talhao?"
        mensagem={`Desativar o talhao "${confirmar?.nome}"? Os dados nao serao apagados.`}
        destrutivo
        textoConfirmar="Excluir"
        onCancelar={() => setConfirmar(null)}
        onConfirmar={confirmarExclusao}
      />
    </div>
  );
}
