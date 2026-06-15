"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import type { Usuario, Fazenda, Role } from "@/lib/types";
import { fmtData } from "@/lib/format";
import { ITENS_POR_PAGINA, DEBOUNCE_MS, debounce } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import KpiCard from "@/components/ui/KpiCard";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const EDGE_CRIAR_USUARIO =
  "https://gohoqgctcqltorfeohom.supabase.co/functions/v1/criar-usuario";

type UsuarioRow = Usuario & { fazendas?: { nome: string } | null };

type Form = {
  nome: string;
  email: string;
  senha_inicial: string;
  role: Role;
  fazenda_id: string;
  telefone: string;
  cargo: string;
};

const FORM_VAZIO: Form = {
  nome: "",
  email: "",
  senha_inicial: "",
  role: "operador",
  fazenda_id: "",
  telefone: "",
  cargo: "",
};

// Membros da fazenda - admin nao aparece (esse perfil e criado em /clientes)
const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: "gerente", label: "Gerente", hint: "Dashboard (leitura)" },
  { value: "operador", label: "Operador", hint: "Só app de campo" },
  { value: "visualizador", label: "Visualizador", hint: "Somente leitura" },
];

function roleBadge(r: Role) {
  switch (r) {
    case "superadmin":
      return <span className="badge badge-success">Superadmin</span>;
    case "admin":
      return <span className="badge badge-success">Admin</span>;
    case "gerente":
      return <span className="badge badge-info">Gerente</span>;
    case "operador":
      return <span className="badge badge-neutral">Operador</span>;
    case "visualizador":
      return <span className="badge badge-warn">Visualizador</span>;
    default:
      return <span className="badge badge-neutral">{r}</span>;
  }
}

export default function UsuariosPage() {
  const { user } = useAuth();
  const [eSuperadmin, setESuperadmin] = useState(false);
  const [fazendaDoAdmin, setFazendaDoAdmin] = useState<string | null>(null);

  const [itens, setItens] = useState<UsuarioRow[]>([]);
  const [fazendas, setFazendas] = useState<Pick<Fazenda, "id" | "nome">[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [pagina, setPagina] = useState(0);
  const [busca, setBusca] = useState("");
  const [buscaDeb, setBuscaDeb] = useState("");
  const [fPapel, setFPapel] = useState<"" | Role>("");
  const [fFazenda, setFFazenda] = useState("");

  const [novoOpen, setNovoOpen] = useState(false);
  const [editando, setEditando] = useState<UsuarioRow | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [verSenha, setVerSenha] = useState(false);
  const [senhaGerada, setSenhaGerada] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<{
    id: string;
    nome: string;
    ativar: boolean;
  } | null>(null);

  useEffect(() => {
    const fn = debounce((v: string) => setBuscaDeb(v), DEBOUNCE_MS);
    fn(busca);
  }, [busca]);

  useEffect(() => {
    carregarFazendas();
    if (!user) return;
    (async () => {
      const sb = getSupabase();
      const r = await sb
        .from("usuarios")
        .select("role, fazenda_id")
        .eq("auth_id", user.id)
        .maybeSingle();
      if (r.data) {
        setESuperadmin(r.data.role === "superadmin");
        setFazendaDoAdmin(r.data.fazenda_id);
      }
    })();
  }, [user]);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, buscaDeb, fPapel, fFazenda]);

  async function carregarFazendas() {
    const sb = getSupabase();
    const r = await sb
      .from("fazendas")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome");
    if (!r.error) setFazendas(r.data || []);
  }

  async function carregar() {
    setCarregando(true);
    const sb = getSupabase();
    // Membros = gerente/operador/visualizador. Donos (admin/superadmin)
    // vivem em /clientes e nao aparecem aqui pra evitar confusao.
    let q = sb
      .from("usuarios")
      .select("*, fazendas(nome)")
      .in("role", ["gerente", "operador", "visualizador"])
      .order("nome");

    if (buscaDeb)
      q = q.or(`nome.ilike.%${buscaDeb}%,email.ilike.%${buscaDeb}%`);
    if (fPapel) q = q.eq("role", fPapel);
    if (fFazenda) q = q.eq("fazenda_id", fFazenda);

    q = q.range(pagina * ITENS_POR_PAGINA, (pagina + 1) * ITENS_POR_PAGINA - 1);

    const r = await q;
    if (r.error) {
      toast.error("Erro ao carregar usuários: " + r.error.message);
      setCarregando(false);
      return;
    }
    setItens((r.data || []) as UsuarioRow[]);
    setCarregando(false);
  }

  const totalAtivos = useMemo(() => itens.filter((u) => u.ativo).length, [itens]);
  const totalOperadores = useMemo(
    () => itens.filter((u) => u.role === "operador").length,
    [itens],
  );

  function abrirNovo() {
    setForm({
      ...FORM_VAZIO,
      senha_inicial: gerarSenha(),
      // Admin nao-superadmin so pode criar membros DENTRO da fazenda dele
      fazenda_id: !eSuperadmin && fazendaDoAdmin ? fazendaDoAdmin : "",
    });
    setEditando(null);
    setSenhaGerada(null);
    setNovoOpen(true);
  }

  function abrirEditar(u: UsuarioRow) {
    setForm({
      nome: u.nome || "",
      email: u.email || "",
      senha_inicial: "",
      role: u.role,
      fazenda_id: u.fazenda_id || "",
      telefone: u.telefone || "",
      cargo: u.cargo || "",
    });
    setEditando(u);
    setNovoOpen(false);
    setSenhaGerada(null);
  }

  function fecharForm() {
    setNovoOpen(false);
    setEditando(null);
    setSenhaGerada(null);
    setVerSenha(false);
  }

  function gerarSenha() {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let s = "";
    for (let i = 0; i < 10; i++)
      s += chars.charAt(Math.floor(Math.random() * chars.length));
    return s;
  }

  async function salvar() {
    if (!form.nome.trim()) {
      toast.error("Informe o nome");
      return;
    }
    if (!form.email.trim()) {
      toast.error("Informe o email");
      return;
    }
    if (!form.fazenda_id) {
      toast.error("Selecione a fazenda");
      return;
    }
    if (!editando && (!form.senha_inicial || form.senha_inicial.length < 8)) {
      toast.error("A senha inicial precisa de 8+ caracteres");
      return;
    }

    setSalvando(true);
    const sb = getSupabase();

    if (editando) {
      // Edição: só atualiza colunas locais (não troca email/senha aqui)
      const r = await sb
        .from("usuarios")
        .update({
          nome: form.nome.trim(),
          role: form.role,
          fazenda_id: form.fazenda_id,
          telefone: form.telefone.trim() || null,
          cargo: form.cargo.trim() || null,
        })
        .eq("id", editando.id);
      setSalvando(false);
      if (r.error) {
        toast.error("Erro: " + r.error.message);
        return;
      }
      toast.success("Usuário atualizado!");
      fecharForm();
      carregar();
      return;
    }

    // Criar novo: chama Edge Function
    try {
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      // tenta usar a sessão do usuário logado (mais seguro), cai pra anon key
      const {
        data: { session },
      } = await sb.auth.getSession();
      const token = session?.access_token || anonKey;

      const res = await fetch(EDGE_CRIAR_USUARIO, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          email: form.email.trim(),
          nome: form.nome.trim(),
          role: form.role,
          fazenda_id: form.fazenda_id,
          senha_inicial: form.senha_inicial,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) {
        const msg = json.error || json.message || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      setSenhaGerada(form.senha_inicial);
      toast.success("Usuário criado! Anote a senha temporária.");
      carregar();
    } catch (e: any) {
      let msg = e.message || "Erro ao criar usuário";
      if (msg.includes("already registered") || msg.includes("registered"))
        msg = "Este e-mail já está cadastrado.";
      toast.error(msg);
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarToggle() {
    if (!confirmar) return;
    const sb = getSupabase();
    const r = await sb
      .from("usuarios")
      .update({ ativo: confirmar.ativar })
      .eq("id", confirmar.id);
    if (r.error) {
      toast.error("Erro: " + r.error.message);
      return;
    }
    toast.success(confirmar.ativar ? "Usuário ativado!" : "Usuário desativado!");
    setConfirmar(null);
    carregar();
  }

  function resetSenha(u: UsuarioRow) {
    const sb = getSupabase();
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-senha`
        : undefined;
    sb.auth
      .resetPasswordForEmail(u.email, redirectTo ? { redirectTo } : undefined)
      .then((r) => {
        if (r.error) {
          toast.error("Erro ao enviar: " + r.error.message);
          return;
        }
        toast.success("E-mail de reset enviado para " + u.email);
      })
      .catch((e) => {
        toast.error("Erro ao enviar reset: " + (e?.message || "tente novamente"));
      });
  }

  const totalPaginas =
    itens.length === ITENS_POR_PAGINA ? pagina + 2 : pagina + 1;

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Membros da fazenda"
        icone="👥"
        subtitulo="Gerentes, operadores e visualizadores. Donos de fazenda ficam em /clientes."
        acoes={
          <button className="btn-primary" onClick={abrirNovo}>
            + Novo Membro
          </button>
        }
      />

      <div className="grid-cards">
        <KpiCard rotulo="Listados" valor={itens.length} icone="👥" accent="green" />
        <KpiCard rotulo="Ativos (página)" valor={totalAtivos} icone="✅" accent="blue" />
        <KpiCard rotulo="Operadores (página)" valor={totalOperadores} icone="👷" accent="purple" />
      </div>

      <div className="card flex flex-wrap gap-3 items-center">
        <input
          className="input"
          placeholder="Buscar nome ou email..."
          value={busca}
          onChange={(e) => {
            setPagina(0);
            setBusca(e.target.value);
          }}
          style={{ maxWidth: 280 }}
        />
        <select
          className="input"
          value={fPapel}
          onChange={(e) => {
            setPagina(0);
            setFPapel(e.target.value as "" | Role);
          }}
          style={{ maxWidth: 180 }}
        >
          <option value="">Todos os papéis</option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={fFazenda}
          onChange={(e) => {
            setPagina(0);
            setFFazenda(e.target.value);
          }}
          style={{ maxWidth: 220 }}
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
      ) : itens.length === 0 ? (
        <EmptyState
          icone="👥"
          titulo={buscaDeb || fPapel || fFazenda ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
          descricao={
            buscaDeb || fPapel || fFazenda
              ? "Ajuste os filtros para encontrar o que procura."
              : "Cadastre o primeiro usuário do sistema."
          }
          acao={
            !buscaDeb && !fPapel && !fFazenda ? (
              <button className="btn-primary" onClick={abrirNovo}>
                + Cadastrar primeiro usuário
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Papel</th>
                <th>Fazenda</th>
                <th>Último acesso</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((u) => {
                const av = (u.nome || u.email || "U")[0].toUpperCase();
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg,#22c55e,#2196F3)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            fontWeight: 800,
                            color: "#fff",
                          }}
                        >
                          {av}
                        </div>
                        <div>
                          <strong>{u.nome}</strong>
                          {u.cargo && (
                            <div style={{ color: "var(--muted)", fontSize: 12 }}>
                              {u.cargo}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: 13 }}>
                      {u.email}
                    </td>
                    <td>{roleBadge(u.role)}</td>
                    <td>{u.fazendas?.nome || "—"}</td>
                    <td style={{ color: "var(--muted)", fontSize: 13 }}>
                      {fmtData(u.ultimo_acesso)}
                    </td>
                    <td>
                      {u.ativo ? (
                        <span className="badge badge-success">Ativo</span>
                      ) : (
                        <span className="badge badge-danger">Inativo</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-2 flex-wrap">
                        <button className="btn-ghost" onClick={() => abrirEditar(u)}>
                          Editar
                        </button>
                        <button
                          className="btn-ghost"
                          onClick={() => resetSenha(u)}
                          title="Enviar e-mail de reset"
                        >
                          Reset senha
                        </button>
                        <button
                          className={u.ativo ? "btn-danger" : "btn-secondary"}
                          onClick={() =>
                            setConfirmar({
                              id: u.id,
                              nome: u.nome,
                              ativar: !u.ativo,
                            })
                          }
                        >
                          {u.ativo ? "Desativar" : "Ativar"}
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
              Página {pagina + 1}
              {totalPaginas > pagina + 1 ? ` de ~${totalPaginas}` : ""}
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
                Próxima →
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={novoOpen || !!editando}
        onClose={fecharForm}
        titulo={editando ? "Editar Usuário" : "Novo Usuário"}
        larguraMax={640}
        rodape={
          senhaGerada ? (
            <button type="button" className="btn-primary" onClick={fecharForm}>
              Fechar
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn-ghost"
                onClick={fecharForm}
                disabled={salvando}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={salvar}
                disabled={salvando}
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </>
          )
        }
      >
        {senhaGerada ? (
          <div className="space-y-3">
            <div
              style={{
                padding: 16,
                background: "var(--green-bg, #e8f5e9)",
                borderLeft: "4px solid #22c55e",
                borderRadius: 8,
              }}
            >
              <strong>✅ Usuário criado com sucesso!</strong>
              <p style={{ marginTop: 6, fontSize: 13 }}>
                Anote a senha temporária abaixo e envie para o usuário em canal
                seguro. Ele poderá trocar depois.
              </p>
            </div>
            <div>
              <label className="label">Senha temporária</label>
              <div
                style={{
                  padding: 12,
                  background: "#fff8d1",
                  border: "1px solid #f0c419",
                  borderRadius: 8,
                  fontFamily: "monospace",
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: 1,
                  userSelect: "all",
                }}
              >
                {senhaGerada}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="label">Nome completo *</label>
              <input
                className="input"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                maxLength={100}
                autoFocus
              />
            </div>
            <div>
              <label className="label">
                Email *
                {editando && (
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--muted)",
                      marginLeft: 6,
                    }}
                  >
                    (não pode ser alterado)
                  </span>
                )}
              </label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                readOnly={!!editando}
                style={editando ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
              />
            </div>

            {!editando && (
              <div>
                <label className="label">Senha inicial *</label>
                <div style={{ position: "relative" }}>
                  <input
                    className="input"
                    type={verSenha ? "text" : "password"}
                    value={form.senha_inicial}
                    onChange={(e) =>
                      setForm({ ...form, senha_inicial: e.target.value })
                    }
                    placeholder="Mínimo 8 caracteres"
                    style={{ paddingRight: 96 }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      display: "flex",
                      gap: 4,
                    }}
                  >
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: "2px 6px", fontSize: 12 }}
                      onClick={() => setVerSenha((v) => !v)}
                      title={verSenha ? "Ocultar" : "Mostrar"}
                    >
                      {verSenha ? "🙈" : "👁"}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: "2px 6px", fontSize: 12 }}
                      onClick={() =>
                        setForm({ ...form, senha_inicial: gerarSenha() })
                      }
                      title="Gerar nova senha"
                    >
                      🔄
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                  O usuário poderá trocar depois.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Papel *</label>
                <select
                  className="input"
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value as Role })
                  }
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} — {r.hint}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Fazenda *</label>
                <select
                  className="input"
                  value={form.fazenda_id}
                  onChange={(e) =>
                    setForm({ ...form, fazenda_id: e.target.value })
                  }
                  disabled={!eSuperadmin && !!fazendaDoAdmin}
                  title={!eSuperadmin && !!fazendaDoAdmin ? "Membros sao sempre da sua fazenda" : undefined}
                >
                  <option value="">Selecione</option>
                  {fazendas.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
                {!eSuperadmin && fazendaDoAdmin && (
                  <div className="text-xs mt-1" style={{ color: "var(--dim)" }}>
                    Membros sao sempre cadastrados na sua propria fazenda.
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Telefone</label>
                <input
                  className="input"
                  value={form.telefone}
                  onChange={(e) =>
                    setForm({ ...form, telefone: e.target.value })
                  }
                  placeholder="(99) 99999-9999"
                />
              </div>
              <div>
                <label className="label">Cargo</label>
                <input
                  className="input"
                  value={form.cargo}
                  onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                  placeholder="Ex: Gerente de campo"
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmar}
        titulo={confirmar?.ativar ? "Ativar usuário?" : "Desativar usuário?"}
        mensagem={
          confirmar?.ativar
            ? `O usuário "${confirmar?.nome}" poderá voltar a acessar o sistema.`
            : `O usuário "${confirmar?.nome}" não conseguirá mais fazer login. Os dados serão preservados.`
        }
        destrutivo={!confirmar?.ativar}
        textoConfirmar={confirmar?.ativar ? "Ativar" : "Desativar"}
        onCancelar={() => setConfirmar(null)}
        onConfirmar={confirmarToggle}
      />
    </div>
  );
}
