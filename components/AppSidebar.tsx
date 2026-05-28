"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

type NavItem = { href: string; label: string; icon: string };
type NavGroup = { id: string; label: string; icon: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    id: "inicio",
    label: "Início",
    icon: "🏠",
    items: [
      { href: "/home",             label: "Home",                 icon: "🏡" },
      { href: "/dashboard",        label: "Painel Geral",         icon: "📊" },
      { href: "/alertas",          label: "Alertas",              icon: "🔔" },
      { href: "/resumo-fazendas",  label: "Resumo das Fazendas",  icon: "📍" },
      { href: "/ia-operacional",   label: "IA Operacional",       icon: "🤖" },
    ],
  },
  {
    id: "producao",
    label: "Produção",
    icon: "🌱",
    items: [
      { href: "/safras",            label: "Safras",              icon: "📅" },
      { href: "/fechamento-safra",  label: "Encerramento Safra",  icon: "📈" },
      { href: "/talhoes",           label: "Talhões",             icon: "🌾" },
      { href: "/lancamentos",       label: "Atividades",          icon: "📋" },
      { href: "/qualidade-lotes",   label: "Qualidade Produção",  icon: "📦" },
    ],
  },
  {
    id: "estoque",
    label: "Estoque & Insumos",
    icon: "📦",
    items: [
      { href: "/insumos",           label: "Meus Insumos",        icon: "🧪" },
    ],
  },
  {
    id: "maquinas",
    label: "Máquinas & Equip.",
    icon: "🚜",
    items: [
      { href: "/maquinas",          label: "Máquinas",            icon: "🚜" },
      { href: "/operadores",        label: "Equipe Operacional",  icon: "👷" },
    ],
  },
  {
    id: "fazendas",
    label: "Fazendas",
    icon: "🏢",
    items: [
      { href: "/fazendas",          label: "Minhas Fazendas",     icon: "🏡" },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    icon: "💰",
    items: [
      { href: "/despesas-fixas",    label: "Despesas Fixas",      icon: "💼" },
      { href: "/vendas-graos",      label: "Contratos & Vendas",  icon: "🌾" },
    ],
  },
  {
    id: "qualidade",
    label: "Qualidade",
    icon: "🏅",
    items: [
      { href: "/certificacao",      label: "Certificações",       icon: "🏅" },
      { href: "/analise-solo",      label: "Análise de Solo",     icon: "🧪" },
      { href: "/qualidade-lotes",   label: "Qualidade de Lotes",  icon: "📦" },
      { href: "/documentos",        label: "Documentos",          icon: "📁" },
    ],
  },
  {
    id: "relatorios",
    label: "Relatórios",
    icon: "📊",
    items: [
      { href: "/dashboard",         label: "Relatórios Gerais",   icon: "📊" },
      { href: "/exportar",          label: "Exportações",         icon: "📤" },
    ],
  },
  {
    id: "config",
    label: "Configurações",
    icon: "⚙️",
    items: [
      { href: "/usuarios",          label: "Usuários",            icon: "👤" },
    ],
  },
  {
    id: "sobre",
    label: "Sobre",
    icon: "ℹ️",
    items: [
      { href: "/sobre",                 label: "Sobre o JA Agrotec",  icon: "🌾" },
      { href: "/sobre/historia",        label: "História",            icon: "📖" },
      { href: "/sobre/ajuda",           label: "Ajuda",               icon: "❓" },
      { href: "/sobre/troubleshooting", label: "Troubleshooting",     icon: "🛠️" },
      { href: "/sobre/ecossistema",     label: "Ecossistema",         icon: "🌐" },
      { href: "/sobre/changelog",       label: "Changelog",           icon: "📝" },
    ],
  },
];

type Props = {
  mobileOpen?: boolean;
  onClose?: () => void;
};

export default function AppSidebar({ mobileOpen = false, onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [nome, setNome] = useState<string>("");
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>(() => {
    // Inicia com todos os grupos que contem a rota ativa expandidos
    const init: Record<string, boolean> = {};
    GROUPS.forEach((g) => {
      init[g.id] = g.items.some((it) => pathname === it.href || pathname?.startsWith(it.href + "/"));
    });
    // Inicio sempre aberto por padrao
    if (!Object.values(init).some(Boolean)) init["inicio"] = true;
    return init;
  });

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabase();
    let active = true;
    (async () => {
      const r = await supabase
        .from("usuarios")
        .select("nome")
        .eq("auth_id", user.id)
        .maybeSingle();
      if (active && r.data?.nome) setNome(r.data.nome);
    })();
    return () => { active = false; };
  }, [user]);

  useEffect(() => { if (mobileOpen && onClose) onClose(); /* eslint-disable-next-line */ }, [pathname]);

  function toggleGrupo(id: string) {
    setExpandidos((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function sair() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const conteudo = (
    <>
      {/* Logo header */}
      <div className="p-4 border-b" style={{ borderColor: "rgba(124,179,66,.12)" }}>
        <div className="flex items-center gap-3">
          <div className="relative overflow-hidden rounded-xl bg-white shrink-0" style={{ width: 44, height: 44 }}>
            <img
              src="/logo-ja-agrotec.png"
              alt="JA Agrotec"
              className="absolute inset-0 w-full h-full object-cover scale-[1.6]"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span style={{ fontFamily: "var(--f2)", fontSize: 17, fontWeight: 700, color: "#fff", letterSpacing: 2, lineHeight: 1 }}>
              AGROTEC
            </span>
            <span style={{ fontSize: 9, fontWeight: 600, color: "var(--green)", letterSpacing: 3, textTransform: "uppercase", marginTop: 4 }}>
              Módulo Produtor
            </span>
          </div>
        </div>
      </div>

      {/* Section heading */}
      <div
        style={{
          fontSize: 9, fontWeight: 700, color: "rgba(124,179,66,.5)",
          letterSpacing: 2.5, textTransform: "uppercase",
          padding: "16px 20px 8px",
        }}
      >
        Visão Geral
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {GROUPS.map((g) => {
          const hasActive = g.items.some((it) => pathname === it.href || pathname?.startsWith(it.href + "/"));
          const aberto = !!expandidos[g.id];
          return (
            <div key={g.id} className="mb-0.5">
              <button
                type="button"
                onClick={() => toggleGrupo(g.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-ja transition-colors"
                style={{
                  color: hasActive ? "#fff" : "rgba(255,255,255,.7)",
                  background: hasActive ? "rgba(124,179,66,.08)" : "transparent",
                  fontSize: 13, fontWeight: 600,
                  textShadow: hasActive ? "0 0 8px rgba(124,179,66,.3)" : "none",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(124,179,66,.08)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = hasActive ? "rgba(124,179,66,.08)" : "transparent"; }}
              >
                <span style={{ fontSize: 17, width: 22, textAlign: "center" }}>{g.icon}</span>
                <span className="flex-1 text-left">{g.label}</span>
                <span
                  style={{
                    fontSize: 11,
                    transition: "transform .2s, color .2s",
                    transform: aberto ? "rotate(180deg)" : "none",
                    color: aberto ? "var(--green)" : "rgba(255,255,255,.4)",
                  }}
                >
                  ▼
                </span>
              </button>

              <div
                style={{
                  maxHeight: aberto ? 900 : 0,
                  overflow: "hidden",
                  transition: "max-height .25s ease",
                  marginLeft: 12,
                  marginTop: aberto ? 2 : 0,
                  borderLeft: "1px solid rgba(124,179,66,.18)",
                  paddingLeft: 6,
                }}
              >
                {g.items.map((it) => {
                  const ativo = pathname === it.href || (pathname && pathname.startsWith(it.href + "/"));
                  return (
                    <Link
                      key={it.href + g.id}
                      href={it.href}
                      className="flex items-center gap-2.5 px-3 py-1.5 rounded-ja transition-colors my-0.5"
                      style={{
                        color: ativo ? "#fff" : "rgba(255,255,255,.6)",
                        background: ativo ? "rgba(124,179,66,.18)" : "transparent",
                        fontSize: 12.5, fontWeight: ativo ? 600 : 500,
                        position: "relative",
                      }}
                    >
                      {ativo && (
                        <span
                          style={{
                            position: "absolute", left: -7, top: 6, bottom: 6, width: 2,
                            background: "var(--green)", borderRadius: 2,
                          }}
                        />
                      )}
                      <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>{it.icon}</span>
                      <span className="flex-1">{it.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer com usuario + sair */}
      <div className="p-3 border-t" style={{ borderColor: "rgba(124,179,66,.12)" }}>
        {nome && (
          <div className="px-3 py-1.5 mb-1" style={{ fontSize: 11, color: "rgba(255,255,255,.55)" }}>
            <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(124,179,66,.6)" }}>
              Conectado como
            </div>
            <div style={{ color: "#fff", fontWeight: 600, fontSize: 12, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {nome}
            </div>
          </div>
        )}
        <button
          onClick={sair}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-ja transition-colors"
          style={{ color: "rgba(255,255,255,.7)", fontSize: 13, fontWeight: 600 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(229,57,53,.18)"; (e.currentTarget as HTMLElement).style.color = "#ff8a85"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,.7)"; }}
        >
          <span style={{ fontSize: 16 }}>↩</span>
          <span>Sair</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className="hidden lg:flex flex-col shrink-0 gradient-sidebar"
        style={{ width: "var(--sidebar-w)", minHeight: "100vh" }}
      >
        {conteudo}
      </aside>

      {/* Mobile overlay */}
      <div
        className={"lg:hidden fixed inset-0 z-40 transition-opacity " + (mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}
        onClick={onClose}
        aria-hidden={!mobileOpen}
      >
        <div className="absolute inset-0 bg-black/60" />
      </div>
      <aside
        className={"lg:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col gradient-sidebar transition-transform duration-200 " + (mobileOpen ? "translate-x-0" : "-translate-x-full")}
        onClick={(e) => e.stopPropagation()}
      >
        {conteudo}
      </aside>
    </>
  );
}
