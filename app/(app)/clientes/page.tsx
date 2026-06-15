"use client";

// Pagina de clientes da plataforma (donos de fazenda).
// Visivel SO pra superadmin.
//
// Diferente de /usuarios (membros internos da fazenda do admin
// logado), aqui se cadastra um novo CLIENTE - alguem que vai
// abrir conta, definir plano e criar fazendas pelo /onboarding.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { fmtData } from "@/lib/format";
import { listarPlanos, type Plano } from "@/lib/limites";
import PageHeader from "@/components/ui/PageHeader";
import KpiCard from "@/components/ui/KpiCard";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type Cliente = {
  id: string;
  nome: string;
  email: string;
  role: string;
  telefone: string | null;
  ativo: boolean;
  ultimo_acesso: string | null;
  criado_em: string;
  plano_id: string | null;
  qtd_fazendas?: number;
};

type Form = {
  nome: string;
  email: string;
  telefone: string;
  plano_id: string;
  senha_inicial: string;
};

const FORM_VAZIO: Form = {
  nome: "",
  email: "",
  telefone: "",
  plano_id: "",
  senha_inicial: "",
};

function gerarSenha() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 12; i++) s += c.charAt(Math.floor(Math.random() * c.length));
  return s;
}

export default function ClientesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");

  const [novoOpen, setNovoOpen] = useState(false);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [verSenha, setVerSenha] = useState(false);
  const [senhaCriada, setSenhaCriada] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<{ id: string; nome: string; ativar: boolean } | null>(null);

  // Guard: somente superadmin
  useEffect(() => {
    if (!user) return;
    (async () => {
      const sb = getSupabase();
      const r = await sb.from("usuarios").select("role").eq("auth_id", user.id).maybeSingle();
      setAutorizado(r.data?.role === "superadmin");
    })();
  }, [user]);

  useEffect(() => {
    if (autorizado === true) {
      carregar();
      listarPlanos().then(setPlanos);
    }
  }, [autorizado]);

  async function carregar() {
    setCarregando(true);
    const sb = getSupabase();
    // Clientes = role admin ou superadmin (donos de fazenda)
    const rUsu = await sb
      .from("usuarios")
      .select("id, nome, email, role, telefone, ativo, ultimo_acesso, criado_em, plano_id")
      .in("role", ["admin", "superadmin"])
      .order("criado_em", { ascending: false });

    if (rUsu.error) {
      toast.error("Erro ao carregar: " + rUsu.error.message);
      setCarregando(false);
      return;
    }
    const lista = (rUsu.data || []) as Cliente[];

    // Conta fazendas criadas por cada cliente
    const rFaz = await sb
      .from("fazendas")
      .select("criado_por")
      .eq("ativo", true);
    const contagem: Record<string, number> = {};
    (rFaz.data || []).forEach((f: any) => {
      if (f.criado_por) contagem[f.criado_por] = (contagem[f.criado_por] || 0) + 1;
    });
    setClientes(
      lista.map((c) => ({ ...c, qtd_fazendas: contagem[c.id] || 0 })),
    );
    setCarregando(false);
  }

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(
      (c) => c.nome.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
    );
  }, [clientes, busca]);

  const kpis = useMemo(() => {
    const ativos = clientes.filter((c) => c.ativo).length;
    const com1Mais = clientes.filter((c) => (c.qtd_fazendas || 0) > 0).length;
    const semFazenda = clientes.filter((c) => c.ativo && (c.qtd_fazendas || 0) === 0).length;
    return {
      total: clientes.length,
      ativos,
      com1Mais,
      semFazenda,
    };
  }, [clientes]);

  function abrirNovo() {
    const planoPadrao = planos.find((p) => p.codigo === "pequeno");
    setForm({
      ...FORM_VAZIO,
      senha_inicial: gerarSenha(),
      plano_id: planoPadrao?.id || "",
    });
    setSenhaCriada(null);
    setVerSenha(false);
    setNovoOpen(true);
  }

  function fechar() {
    setNovoOpen(false);
    setForm(FORM_VAZIO);
    setSenhaCriada(null);
  }

  async function salvar() {
    if (!form.nome.trim()) return toast.error("Informe o nome");
    if (!form.email.trim()) return toast.error("Informe o email");
    if (form.senha_inicial.length < 8) return toast.error("Senha precisa de 8+ caracteres");
    if (!form.plano_id) return toast.error("Selecione o plano");

    setSalvando(true);
    try {
      const sb = getSupabase();
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error("Sessao expirada, faca login novamente");
        setSalvando(false);
        return;
      }
      const r = await fetch("/api/criar-cliente", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nome: form.nome.trim(),
          email: form.email.trim().toLowerCase(),
          telefone: form.telefone.trim() || null,
          plano_id: form.plano_id,
          senha_inicial: form.senha_inicial,
        }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        toast.error("Erro: " + (data.erro || r.statusText));
        setSalvando(false);
        return;
      }
      toast.success("Cliente criado!");
      setSenhaCriada(form.senha_inicial);
      carregar();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function trocarPlano(clienteId: string, novoPlanoId: string) {
    const sb = getSupabase();
    const r = await sb.from("usuarios").update({ plano_id: novoPlanoId }).eq("id", clienteId);
    if (r.error) {
      toast.error("Erro: " + r.error.message);
      return;
    }
    toast.success("Plano atualizado");
    setClientes((arr) => arr.map((c) => (c.id === clienteId ? { ...c, plano_id: novoPlanoId } : c)));
  }

  async function confirmarToggle() {
    if (!confirmar) return;
    const sb = getSupabase();
    const r = await sb.from("usuarios").update({ ativo: confirmar.ativar }).eq("id", confirmar.id);
    if (r.error) {
      toast.error("Erro: " + r.error.message);
      return;
    }
    toast.success(confirmar.ativar ? "Cliente reativado" : "Cliente desativado");
    setConfirmar(null);
    carregar();
  }

  if (loading || autorizado === null) {
    return <div className="card text-center py-10" style={{ color: "var(--muted)" }}>Carregando...</div>;
  }
  if (autorizado === false) {
    return (
      <div>
        <PageHeader titulo="Acesso negado" icone="🔒" />
        <div className="card">
          <p style={{ color: "var(--muted)" }}>
            Esta area e restrita ao superadmin do sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Clientes"
        icone="🤝"
        subtitulo="Donos de fazenda cadastrados na plataforma"
        acoes={
          <button className="btn-primary" onClick={abrirNovo}>
            + Novo cliente
          </button>
        }
      />

      <div className="grid-cards">
        <KpiCard rotulo="Total" valor={kpis.total} icone="👥" accent="blue" />
        <KpiCard rotulo="Ativos" valor={kpis.ativos} icone="✅" accent="green" />
        <KpiCard rotulo="Com fazenda" valor={kpis.com1Mais} icone="🏞️" accent="green" />
        <KpiCard rotulo="Sem fazenda ainda" valor={kpis.semFazenda} icone="⏳" accent="orange" />
      </div>

      <div className="card flex flex-wrap gap-3 items-center">
        <input
          className="input"
          placeholder="Buscar por nome ou email..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ flex: "1 1 240px" }}
        />
      </div>

      {carregando ? (
        <div className="card text-center py-6" style={{ color: "var(--muted)" }}>Carregando...</div>
      ) : filtrados.length === 0 ? (
        <EmptyState
          icone="🤝"
          titulo="Nenhum cliente"
          descricao="Cadastre o primeiro dono de fazenda clicando em 'Novo cliente'."
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th>Plano</th>
                <th>Fazendas</th>
                <th>Status</th>
                <th>Ultimo acesso</th>
                <th>Cadastro</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.nome}
                    {c.role === "superadmin" && (
                      <span className="badge badge-success" style={{ marginLeft: 6 }}>SA</span>
                    )}
                  </td>
                  <td>{c.email}</td>
                  <td>{c.telefone || "—"}</td>
                  <td>
                    <select
                      className="input"
                      style={{ padding: "4px 8px", fontSize: 12, minWidth: 120 }}
                      value={c.plano_id || ""}
                      onChange={(e) => trocarPlano(c.id, e.target.value)}
                      disabled={c.role === "superadmin"}
                    >
                      <option value="">(sem plano)</option>
                      {planos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} ({p.max_fazendas === null ? "ilim" : p.max_fazendas})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ textAlign: "center" }}>{c.qtd_fazendas ?? 0}</td>
                  <td>
                    {c.ativo ? (
                      <span className="badge badge-success">ativo</span>
                    ) : (
                      <span className="badge badge-danger">inativo</span>
                    )}
                  </td>
                  <td>{c.ultimo_acesso ? fmtData(c.ultimo_acesso) : "—"}</td>
                  <td>{fmtData(c.criado_em)}</td>
                  <td>
                    {c.role !== "superadmin" && (
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 12 }}
                        onClick={() =>
                          setConfirmar({ id: c.id, nome: c.nome, ativar: !c.ativo })
                        }
                      >
                        {c.ativo ? "Desativar" : "Reativar"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal novo cliente */}
      <Modal
        open={novoOpen}
        onClose={fechar}
        titulo={senhaCriada ? "Cliente criado" : "Novo cliente"}
        larguraMax={520}
        rodape={
          senhaCriada ? (
            <button className="btn-primary" onClick={fechar}>Fechar</button>
          ) : (
            <>
              <button className="btn-ghost" onClick={fechar} disabled={salvando}>Cancelar</button>
              <button className="btn-primary" onClick={salvar} disabled={salvando}>
                {salvando ? "Criando..." : "Criar cliente"}
              </button>
            </>
          )
        }
      >
        {senhaCriada ? (
          <div className="space-y-3">
            <div className="text-sm" style={{ color: "var(--muted)" }}>
              ✅ <b>{form.email}</b> foi cadastrado. Anote a senha temporaria abaixo
              e repasse pro cliente. Ele vai trocar no primeiro acesso ou via
              &quot;Esqueci minha senha&quot;.
            </div>
            <div
              className="p-3 rounded font-mono text-center"
              style={{ background: "var(--green-bg)", fontSize: 18, fontWeight: 700 }}
            >
              {senhaCriada}
            </div>
            <div className="text-xs" style={{ color: "var(--dim)" }}>
              No proximo login, o cliente cai automaticamente no <code>/onboarding</code>
              pra cadastrar a primeira fazenda.
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            <div>
              <label className="label">Nome completo *</label>
              <input
                className="input"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                autoFocus
              />
            </div>
            <div>
              <label className="label">E-mail *</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Telefone (opcional)</label>
              <input
                className="input"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <label className="label">Plano *</label>
              <select
                className="input"
                value={form.plano_id}
                onChange={(e) => setForm({ ...form, plano_id: e.target.value })}
              >
                <option value="">Selecione...</option>
                {planos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} {p.max_fazendas === null ? "(ilimitado)" : `(ate ${p.max_fazendas} fazenda${p.max_fazendas === 1 ? "" : "s"})`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Senha inicial</label>
              <div className="flex gap-2">
                <input
                  className="input"
                  type={verSenha ? "text" : "password"}
                  value={form.senha_inicial}
                  onChange={(e) => setForm({ ...form, senha_inicial: e.target.value })}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setVerSenha(!verSenha)}
                  style={{ minWidth: 80 }}
                >
                  {verSenha ? "Ocultar" : "Mostrar"}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setForm({ ...form, senha_inicial: gerarSenha() })}
                  style={{ minWidth: 80 }}
                >
                  Gerar
                </button>
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--dim)" }}>
                O cliente pode trocar via &quot;Esqueci minha senha&quot; no proximo login.
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmar}
        titulo={confirmar?.ativar ? "Reativar cliente" : "Desativar cliente"}
        mensagem={
          confirmar?.ativar
            ? `Reativar ${confirmar?.nome}? Ele volta a conseguir logar.`
            : `Desativar ${confirmar?.nome}? Ele e seus operadores nao conseguirao logar ate ser reativado.`
        }
        textoConfirmar={confirmar?.ativar ? "Reativar" : "Desativar"}
        onConfirmar={confirmarToggle}
        onCancelar={() => setConfirmar(null)}
      />
    </div>
  );
}
