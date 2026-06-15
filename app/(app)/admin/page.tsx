"use client";

// Painel admin do sistema. Visivel so pra role='admin'.
// Mostra KPIs da plataforma, listas de usuarios/fazendas, saude
// da infra e atalhos pros consoles externos.

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { fmtData, fmtInt } from "@/lib/format";
import { listarPlanos, type Plano } from "@/lib/limites";
import { toast } from "sonner";
import PageHeader from "@/components/ui/PageHeader";
import KpiCard from "@/components/ui/KpiCard";

type Saude = {
  ok: boolean;
  total_ms: number;
  supabase: { ok: boolean; ms: number; erro?: string };
} | null;

type UsuarioRow = {
  id: string;
  nome: string;
  email: string;
  role: string;
  fazenda_id: string | null;
  ativo: boolean;
  ultimo_acesso: string | null;
  criado_em: string;
  plano_id: string | null;
};

type PlanoUso = {
  id: string;
  codigo: string;
  nome: string;
  max_fazendas: number | null;
  usuarios_no_plano: number;
};

type FazendaRow = {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  area_total_ha: number | null;
  criado_em: string;
};

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [kpis, setKpis] = useState({
    totalUsuarios: 0,
    usuariosAtivos: 0,
    novosUsuarios30d: 0,
    totalFazendas: 0,
    areaTotal: 0,
    safrasAtivas: 0,
    lancamentos30d: 0,
  });
  const [usuariosRecentes, setUsuariosRecentes] = useState<UsuarioRow[]>([]);
  const [fazendas, setFazendas] = useState<FazendaRow[]>([]);
  const [saude, setSaude] = useState<Saude>(null);
  const [iaOk, setIaOk] = useState<boolean | null>(null);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [planosUso, setPlanosUso] = useState<PlanoUso[]>([]);

  // Verifica role
  useEffect(() => {
    if (!user) return;
    (async () => {
      const sb = getSupabase();
      const r = await sb
        .from("usuarios")
        .select("role")
        .eq("auth_id", user.id)
        .maybeSingle();
      setAutorizado(r.data?.role === "superadmin");
    })();
  }, [user]);

  // Carrega dados se autorizado
  useEffect(() => {
    if (autorizado !== true) return;
    (async () => {
      setCarregando(true);
      const sb = getSupabase();
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
      const dataLim = trintaDiasAtras.toISOString();

      const [rUsu, rFaz, rSaf, rLan, rPla, rPlaUso] = await Promise.all([
        sb.from("usuarios").select("id, nome, email, role, fazenda_id, ativo, ultimo_acesso, criado_em, plano_id").order("criado_em", { ascending: false }),
        sb.from("fazendas").select("id, nome, cidade, estado, area_total_ha, criado_em").eq("ativo", true).order("nome"),
        sb.from("safras").select("id", { count: "exact", head: true }).eq("status", "aberta"),
        sb.from("lancamentos").select("id", { count: "exact", head: true }).gte("data_lancamento", dataLim.substring(0, 10)),
        listarPlanos(),
        sb.from("v_planos_uso").select("id, codigo, nome, max_fazendas, usuarios_no_plano").order("ordem"),
      ]);
      setPlanos(rPla as Plano[]);
      setPlanosUso((rPlaUso.data || []) as PlanoUso[]);

      const usuarios = (rUsu.data || []) as UsuarioRow[];
      const fz = (rFaz.data || []) as FazendaRow[];

      setKpis({
        totalUsuarios: usuarios.length,
        usuariosAtivos: usuarios.filter((u) => u.ativo).length,
        novosUsuarios30d: usuarios.filter((u) => u.criado_em && u.criado_em >= dataLim).length,
        totalFazendas: fz.length,
        areaTotal: fz.reduce((s, f) => s + (Number(f.area_total_ha) || 0), 0),
        safrasAtivas: rSaf.count ?? 0,
        lancamentos30d: rLan.count ?? 0,
      });
      setUsuariosRecentes(usuarios.slice(0, 20));
      setFazendas(fz);
      setCarregando(false);
    })();
  }, [autorizado]);

  async function trocarPlano(usuarioId: string, novoPlanoId: string) {
    const sb = getSupabase();
    const r = await sb.from("usuarios").update({ plano_id: novoPlanoId }).eq("id", usuarioId);
    if (r.error) {
      toast.error("Erro ao trocar plano: " + r.error.message);
      return;
    }
    toast.success("Plano atualizado");
    setUsuariosRecentes((arr) =>
      arr.map((u) => (u.id === usuarioId ? { ...u, plano_id: novoPlanoId } : u)),
    );
  }

  // Healthcheck (em paralelo)
  useEffect(() => {
    if (autorizado !== true) return;
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setSaude(d))
      .catch(() => setSaude({ ok: false, total_ms: 0, supabase: { ok: false, ms: 0 } }));

    // Probe rapido na IA
    fetch("/api/ia-operacional", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filtros: {}, totais: {}, safras: [], vendas_recentes: [], insumos_em_alerta: [] }),
    })
      .then((r) => setIaOk(r.ok))
      .catch(() => setIaOk(false));
  }, [autorizado]);

  if (loading || autorizado === null) {
    return (
      <div className="card text-center py-10" style={{ color: "var(--muted)" }}>
        Carregando...
      </div>
    );
  }

  if (autorizado === false) {
    return (
      <div>
        <PageHeader titulo="Acesso negado" icone="🔒" />
        <div className="card">
          <p style={{ color: "var(--muted)" }}>
            Esta area e restrita a administradores do sistema.
          </p>
          <Link href="/home" className="btn-primary mt-4 inline-block">
            Voltar para a home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Painel Administrativo"
        icone="🛡️"
        subtitulo="Metricas da plataforma, usuarios cadastrados e saude da infraestrutura"
      />

      {/* KPIs */}
      <div className="grid-cards">
        <KpiCard rotulo="Total de usuarios" valor={fmtInt(kpis.totalUsuarios)} icone="👥" accent="blue" />
        <KpiCard rotulo="Usuarios ativos" valor={fmtInt(kpis.usuariosAtivos)} icone="✅" accent="green" />
        <KpiCard rotulo="Novos 30 dias" valor={fmtInt(kpis.novosUsuarios30d)} icone="🆕" accent="orange" />
        <KpiCard rotulo="Total de fazendas" valor={fmtInt(kpis.totalFazendas)} icone="🏞️" accent="green" />
        <KpiCard rotulo="Area total (ha)" valor={fmtInt(kpis.areaTotal)} icone="📐" accent="blue" />
        <KpiCard rotulo="Safras abertas" valor={fmtInt(kpis.safrasAtivas)} icone="🌱" accent="green" />
        <KpiCard rotulo="Lancamentos 30d" valor={fmtInt(kpis.lancamentos30d)} icone="📋" accent="purple" />
      </div>

      {/* Saude da infra */}
      <div className="card">
        <h3 className="mb-3">Saude da infraestrutura</h3>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <SaudeItem
            nome="App (Vercel)"
            ok={saude?.ok}
            detalhe={saude ? `${saude.total_ms} ms` : "..."}
          />
          <SaudeItem
            nome="Supabase (Postgres)"
            ok={saude?.supabase.ok}
            detalhe={saude?.supabase ? `${saude.supabase.ms} ms` : "..."}
          />
          <SaudeItem
            nome="Claude Haiku (IA)"
            ok={iaOk ?? undefined}
            detalhe={iaOk === null ? "..." : iaOk ? "Respondendo" : "Indisponivel"}
          />
        </div>
      </div>

      {/* Atalhos pros consoles externos */}
      <div className="card">
        <h3 className="mb-3">Consoles externos</h3>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <AtalhoExt
            label="Supabase Studio"
            href="https://supabase.com/dashboard/project/gohoqgctcqltorfeohom"
            icone="🗃️"
          />
          <AtalhoExt
            label="Vercel Deployments"
            href="https://vercel.com/ja-agrotec/ja-produtor/deployments"
            icone="▲"
          />
          <AtalhoExt
            label="Vercel Logs (busque [JA])"
            href="https://vercel.com/ja-agrotec/ja-produtor/logs"
            icone="📜"
          />
          <AtalhoExt
            label="GitHub repo"
            href="https://github.com/ja-agrotec/ja-produtor"
            icone="🐙"
          />
        </div>
      </div>

      {carregando ? (
        <div className="card text-center py-6" style={{ color: "var(--muted)" }}>
          Carregando dados...
        </div>
      ) : (
        <>
          {/* Distribuicao por plano */}
          {planosUso.length > 0 && (
            <div className="card">
              <h3 className="mb-3">Distribuicao por plano</h3>
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                {planosUso.map((p) => (
                  <div key={p.id} className="px-3 py-2 rounded" style={{ background: "var(--green-bg)" }}>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>{p.nome}</div>
                    <div className="font-semibold text-lg">{p.usuarios_no_plano}</div>
                    <div className="text-xs" style={{ color: "var(--dim)" }}>
                      Limite: {p.max_fazendas === null ? "ilimitado" : `${p.max_fazendas} fazenda(s)`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ultimos usuarios */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 style={{ margin: 0 }}>Ultimos usuarios cadastrados</h3>
              <Link href="/usuarios" className="text-xs" style={{ color: "var(--green)" }}>
                Gerenciar →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Role</th>
                    <th>Plano</th>
                    <th>Status</th>
                    <th>Ultimo acesso</th>
                    <th>Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosRecentes.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ color: "var(--muted)", textAlign: "center" }}>
                        Nenhum usuario cadastrado.
                      </td>
                    </tr>
                  ) : (
                    usuariosRecentes.map((u) => (
                      <tr key={u.id}>
                        <td>{u.nome}</td>
                        <td>{u.email}</td>
                        <td><span className="badge badge-info">{u.role}</span></td>
                        <td>
                          <select
                            className="input"
                            style={{ padding: "4px 8px", fontSize: 12, minWidth: 120 }}
                            value={u.plano_id || ""}
                            onChange={(e) => trocarPlano(u.id, e.target.value)}
                          >
                            <option value="">(sem plano)</option>
                            {planos.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nome} ({p.max_fazendas === null ? "ilim" : p.max_fazendas})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {u.ativo ? (
                            <span className="badge badge-success">ativo</span>
                          ) : (
                            <span className="badge badge-danger">inativo</span>
                          )}
                        </td>
                        <td>{u.ultimo_acesso ? fmtData(u.ultimo_acesso) : "—"}</td>
                        <td>{fmtData(u.criado_em)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fazendas */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 style={{ margin: 0 }}>Fazendas cadastradas</h3>
              <Link href="/fazendas" className="text-xs" style={{ color: "var(--green)" }}>
                Gerenciar →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Cidade / UF</th>
                    <th>Area (ha)</th>
                    <th>Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {fazendas.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ color: "var(--muted)", textAlign: "center" }}>
                        Nenhuma fazenda cadastrada.
                      </td>
                    </tr>
                  ) : (
                    fazendas.map((f) => (
                      <tr key={f.id}>
                        <td>{f.nome}</td>
                        <td>{[f.cidade, f.estado].filter(Boolean).join(" / ") || "—"}</td>
                        <td>{f.area_total_ha != null ? fmtInt(f.area_total_ha) : "—"}</td>
                        <td>{fmtData(f.criado_em)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SaudeItem({ nome, ok, detalhe }: { nome: string; ok: boolean | undefined; detalhe: string }) {
  const cor = ok === undefined ? "#666" : ok ? "#2d7d32" : "#e53935";
  const icone = ok === undefined ? "⏳" : ok ? "🟢" : "🔴";
  return (
    <div className="px-3 py-2 rounded" style={{ background: "var(--green-bg)" }}>
      <div className="text-xs" style={{ color: "var(--muted)" }}>{nome}</div>
      <div className="flex items-center gap-2 mt-1">
        <span>{icone}</span>
        <span style={{ color: cor, fontWeight: 600, fontSize: 13 }}>{detalhe}</span>
      </div>
    </div>
  );
}

function AtalhoExt({ label, href, icone }: { label: string; href: string; icone: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="px-3 py-2 rounded hover:bg-ja-green-bg flex items-center gap-2"
      style={{ background: "var(--green-bg)", color: "var(--text)" }}
    >
      <span>{icone}</span>
      <span className="text-sm">{label}</span>
      <span className="ml-auto text-xs" style={{ color: "var(--dim)" }}>↗</span>
    </a>
  );
}
