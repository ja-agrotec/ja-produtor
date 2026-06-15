"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import type { Fazenda } from "@/lib/types";
import { fmt } from "@/lib/format";
import { ITENS_POR_PAGINA, DEBOUNCE_MS, ESTADOS_BR, debounce } from "@/lib/utils";
import { statusLimiteFazendas, type StatusLimite } from "@/lib/limites";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import KpiCard from "@/components/ui/KpiCard";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type Form = {
  nome: string;
  cidade: string;
  estado: string;
  area_total_ha: string;
  proprietario: string;
  cnpj_cpf: string;
  telefone: string;
  email: string;
};

const FORM_VAZIO: Form = {
  nome: "",
  cidade: "",
  estado: "",
  area_total_ha: "",
  proprietario: "",
  cnpj_cpf: "",
  telefone: "",
  email: "",
};

export default function FazendasPage() {
  const [itens, setItens] = useState<Fazenda[]>([]);
  const [contTalhoes, setContTalhoes] = useState<Record<string, number>>({});
  const [contUsuarios, setContUsuarios] = useState<Record<string, number>>({});
  const [contIrrigados, setContIrrigados] = useState<Record<string, number>>({});
  const [totalIrrigadosGeral, setTotalIrrigadosGeral] = useState(0);

  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [buscaDeb, setBuscaDeb] = useState("");
  const [pagina, setPagina] = useState(0);

  const [novoOpen, setNovoOpen] = useState(false);
  const [editando, setEditando] = useState<Fazenda | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [confirmar, setConfirmar] = useState<{ id: string; nome: string; ativar: boolean } | null>(null);

  const { user } = useAuth();
  const [limite, setLimite] = useState<StatusLimite | null>(null);

  useEffect(() => {
    if (!user) return;
    statusLimiteFazendas(user.id).then(setLimite);
  }, [user, itens.length]);

  useEffect(() => {
    const fn = debounce((v: string) => setBuscaDeb(v), DEBOUNCE_MS);
    fn(busca);
  }, [busca]);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, buscaDeb]);

  async function carregar() {
    setCarregando(true);
    const sb = getSupabase();

    let q = sb.from("fazendas").select("*").order("nome");
    if (buscaDeb) q = q.ilike("nome", `%${buscaDeb}%`);
    q = q.range(pagina * ITENS_POR_PAGINA, (pagina + 1) * ITENS_POR_PAGINA - 1);

    const r = await q;
    if (r.error) {
      toast.error("Erro ao carregar fazendas");
      setCarregando(false);
      return;
    }
    const lista = (r.data || []) as Fazenda[];
    setItens(lista);

    // KPI global de irrigados — conta talhoes irrigados de todas as fazendas ativas
    const rGlobal = await sb.from("talhoes").select("id").eq("ativo", true).eq("irrigado", true);
    setTotalIrrigadosGeral((rGlobal.data || []).length);

    // contagens por fazenda (apenas das listadas na pagina)
    const ids = lista.map((f) => f.id);
    if (ids.length) {
      const [tal, usu] = await Promise.all([
        sb.from("talhoes").select("fazenda_id, irrigado").in("fazenda_id", ids).eq("ativo", true),
        sb.from("usuarios").select("fazenda_id").in("fazenda_id", ids).eq("ativo", true),
      ]);
      const tMap: Record<string, number> = {};
      const iMap: Record<string, number> = {};
      const uMap: Record<string, number> = {};
      (tal.data || []).forEach((r: any) => {
        tMap[r.fazenda_id] = (tMap[r.fazenda_id] || 0) + 1;
        if (r.irrigado) iMap[r.fazenda_id] = (iMap[r.fazenda_id] || 0) + 1;
      });
      (usu.data || []).forEach((r: any) => {
        uMap[r.fazenda_id] = (uMap[r.fazenda_id] || 0) + 1;
      });
      setContTalhoes(tMap);
      setContIrrigados(iMap);
      setContUsuarios(uMap);
    } else {
      setContTalhoes({});
      setContIrrigados({});
      setContUsuarios({});
    }

    setCarregando(false);
  }

  const totalAtivas = useMemo(() => itens.filter((f) => f.ativo).length, [itens]);

  function abrirNovo() {
    if (limite && !limite.podeCriar) {
      toast.error(limite.motivo || "Limite do plano atingido");
      return;
    }
    setForm(FORM_VAZIO);
    setEditando(null);
    setNovoOpen(true);
  }

  function abrirEditar(f: Fazenda) {
    setForm({
      nome: f.nome || "",
      cidade: f.cidade || "",
      estado: f.estado || "",
      area_total_ha: f.area_total_ha != null ? String(f.area_total_ha) : "",
      proprietario: f.proprietario || "",
      cnpj_cpf: f.cnpj_cpf || "",
      telefone: f.telefone || "",
      email: f.email || "",
    });
    setEditando(f);
    setNovoOpen(false);
  }

  function fecharForm() {
    setNovoOpen(false);
    setEditando(null);
  }

  async function salvar() {
    if (!form.nome.trim()) {
      toast.error("Informe o nome da fazenda");
      return;
    }
    setSalvando(true);
    const sb = getSupabase();
    const payload = {
      nome: form.nome.trim(),
      cidade: form.cidade.trim() || null,
      estado: form.estado || null,
      area_total_ha: form.area_total_ha ? parseFloat(form.area_total_ha) : null,
      proprietario: form.proprietario.trim() || null,
      cnpj_cpf: form.cnpj_cpf.trim() || null,
      telefone: form.telefone.trim() || null,
      email: form.email.trim() || null,
    };
    let r;
    if (editando) {
      r = await sb.from("fazendas").update(payload).eq("id", editando.id);
    } else {
      // Re-checa limite no momento do save (UI pode ter ficado desatualizada)
      if (user) {
        const stat = await statusLimiteFazendas(user.id);
        if (!stat.podeCriar) {
          setSalvando(false);
          toast.error(stat.motivo || "Limite do plano atingido");
          return;
        }
      }
      // Pega usuarios.id pra preencher criado_por
      let criadoPor: string | null = null;
      if (user) {
        const rU = await sb.from("usuarios").select("id").eq("auth_id", user.id).maybeSingle();
        criadoPor = rU.data?.id || null;
      }
      r = await sb.from("fazendas").insert({ ...payload, ativo: true, criado_por: criadoPor });
    }
    setSalvando(false);
    if (r.error) {
      toast.error("Erro: " + r.error.message);
      return;
    }
    toast.success(editando ? "Fazenda atualizada!" : "Fazenda cadastrada!");
    fecharForm();
    if (!editando) setPagina(0);
    carregar();
  }

  async function confirmarToggle() {
    if (!confirmar) return;
    const sb = getSupabase();
    const r = await sb.from("fazendas").update({ ativo: confirmar.ativar }).eq("id", confirmar.id);
    if (r.error) {
      toast.error("Erro: " + r.error.message);
      return;
    }
    toast.success(confirmar.ativar ? "Fazenda ativada!" : "Fazenda desativada!");
    setConfirmar(null);
    carregar();
  }

  const totalPaginas = itens.length === ITENS_POR_PAGINA ? pagina + 2 : pagina + 1;

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Fazendas"
        icone="🏡"
        subtitulo="Cadastro de fazendas e propriedades"
        acoes={
          <button
            className="btn-primary"
            onClick={abrirNovo}
            disabled={limite ? !limite.podeCriar : false}
            title={limite && !limite.podeCriar ? limite.motivo : undefined}
          >
            + Nova Fazenda
          </button>
        }
      />

      {limite && limite.plano && (
        <div
          className="card flex items-center justify-between flex-wrap gap-2"
          style={{
            borderLeft: `4px solid ${limite.podeCriar ? "var(--green)" : "var(--warn)"}`,
          }}
        >
          <div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>
              Plano atual
            </div>
            <div className="font-semibold">
              {limite.plano.nome}
              {" "}
              <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                · {limite.usado} de{" "}
                {limite.limite === null ? "ilimitado" : limite.limite} fazenda(s)
              </span>
            </div>
          </div>
          {!limite.podeCriar && (
            <a
              href="mailto:contato@ja-agrotec.com.br?subject=Upgrade%20de%20plano"
              className="btn-ghost"
              style={{ fontSize: 13 }}
            >
              Solicitar upgrade →
            </a>
          )}
        </div>
      )}

      <div className="grid-cards">
        <KpiCard rotulo="Fazendas listadas" valor={itens.length} icone="🏡" accent="green" />
        <KpiCard rotulo="Ativas (na pagina)" valor={totalAtivas} icone="✅" accent="blue" />
        <KpiCard rotulo="Talhoes irrigados (total)" valor={totalIrrigadosGeral} icone="💧" accent="purple" />
      </div>

      <div className="card flex flex-wrap gap-3 items-center">
        <input
          className="input"
          placeholder="Buscar fazenda..."
          value={busca}
          onChange={(e) => {
            setPagina(0);
            setBusca(e.target.value);
          }}
          style={{ maxWidth: 320 }}
        />
      </div>

      {carregando ? (
        <p style={{ color: "var(--muted)" }}>Carregando...</p>
      ) : itens.length === 0 ? (
        <EmptyState
          icone="🏡"
          titulo={buscaDeb ? "Nenhuma fazenda encontrada" : "Nenhuma fazenda cadastrada"}
          descricao={buscaDeb ? `Nenhum resultado para "${buscaDeb}"` : "Cadastre a primeira fazenda para começar."}
          acao={
            !buscaDeb ? (
              <button className="btn-primary" onClick={abrirNovo}>
                + Cadastrar primeira fazenda
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Fazenda</th>
                <th>Cidade / Estado</th>
                <th>Area (ha)</th>
                <th>Talhoes</th>
                <th>Irrigados</th>
                <th>Usuarios</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((f) => {
                const cidade = [f.cidade, f.estado].filter(Boolean).join(" / ") || "—";
                return (
                  <tr key={f.id}>
                    <td>
                      <strong>{f.nome}</strong>
                      {f.proprietario && (
                        <div style={{ color: "var(--muted)", fontSize: 12 }}>{f.proprietario}</div>
                      )}
                    </td>
                    <td style={{ color: "var(--muted)" }}>{cidade}</td>
                    <td>{f.area_total_ha != null ? fmt(f.area_total_ha, 1) + " ha" : "—"}</td>
                    <td>
                      <strong>{contTalhoes[f.id] || 0}</strong>
                    </td>
                    <td>
                      <strong>{contIrrigados[f.id] || 0}</strong>
                    </td>
                    <td>
                      <strong>{contUsuarios[f.id] || 0}</strong>
                    </td>
                    <td>
                      {f.ativo ? (
                        <span className="badge badge-success">Ativa</span>
                      ) : (
                        <span className="badge badge-danger">Inativa</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-2 flex-wrap">
                        <button className="btn-ghost" onClick={() => abrirEditar(f)}>
                          Editar
                        </button>
                        <button
                          className={f.ativo ? "btn-danger" : "btn-secondary"}
                          onClick={() => setConfirmar({ id: f.id, nome: f.nome, ativar: !f.ativo })}
                        >
                          {f.ativo ? "Desativar" : "Ativar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex justify-between items-center mt-4 flex-wrap gap-2">
            <span style={{ color: "var(--muted)", fontSize: 13 }}>
              Pagina {pagina + 1} {totalPaginas > pagina + 1 ? `de ~${totalPaginas}` : ""}
            </span>
            <div className="flex gap-2">
              <button
                className="btn-ghost"
                disabled={pagina === 0}
                onClick={() => setPagina((p) => Math.max(0, p - 1))}
              >
                ← Anterior
              </button>
              <button
                className="btn-ghost"
                disabled={itens.length < ITENS_POR_PAGINA}
                onClick={() => setPagina((p) => p + 1)}
              >
                Proxima →
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={novoOpen || !!editando}
        onClose={fecharForm}
        titulo={editando ? "Editar Fazenda" : "Nova Fazenda"}
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
            <label className="label">Nome da Fazenda *</label>
            <input
              className="input"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Fazenda Boa Vista"
              maxLength={100}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Cidade</label>
              <input
                className="input"
                value={form.cidade}
                onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                placeholder="Ex: Franca"
                maxLength={80}
              />
            </div>
            <div>
              <label className="label">Estado</label>
              <select
                className="input"
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
              >
                <option value="">Selecione</option>
                {ESTADOS_BR.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Area Total (ha)</label>
            <input
              className="input"
              type="number"
              step="0.1"
              min="0"
              value={form.area_total_ha}
              onChange={(e) => setForm({ ...form, area_total_ha: e.target.value })}
              placeholder="Ex: 150.5"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Proprietario</label>
              <input
                className="input"
                value={form.proprietario}
                onChange={(e) => setForm({ ...form, proprietario: e.target.value })}
              />
            </div>
            <div>
              <label className="label">CNPJ / CPF</label>
              <input
                className="input"
                value={form.cnpj_cpf}
                onChange={(e) => setForm({ ...form, cnpj_cpf: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmar}
        titulo={confirmar?.ativar ? "Ativar fazenda?" : "Desativar fazenda?"}
        mensagem={
          confirmar?.ativar
            ? `A fazenda "${confirmar?.nome}" voltara a aparecer no sistema.`
            : `A fazenda "${confirmar?.nome}" ficara inativa. Os dados nao serao apagados.`
        }
        destrutivo={!confirmar?.ativar}
        textoConfirmar={confirmar?.ativar ? "Ativar" : "Desativar"}
        onCancelar={() => setConfirmar(null)}
        onConfirmar={confirmarToggle}
      />
    </div>
  );
}
