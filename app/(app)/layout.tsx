"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase";
import AppSidebar from "@/components/AppSidebar";
import OfflineBanner from "@/components/OfflineBanner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [verificando, setVerificando] = useState(true);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) { setVerificando(false); return; }
    (async () => {
      const sb = getSupabase();
      const r = await sb
        .from("usuarios")
        .select("ativo, role")
        .eq("auth_id", user.id)
        .maybeSingle();
      if (r.data && r.data.ativo === false) {
        await sb.auth.signOut();
        router.push("/login?inativo=1");
        return;
      }
      const role = r.data?.role;

      // Operador nunca deveria ver as rotas do Produtor (/home, /dashboard,
      // etc). Redireciona pra /operador imediatamente. Pode acontecer quando
      // o operador instala a PWA do Produtor por engano (start_url=/home)
      // e entra direto na rota errada.
      if (
        role === "operador" &&
        pathname !== "/operador" &&
        !pathname.startsWith("/operador/")
      ) {
        router.push("/operador");
        return;
      }

      // Onboarding: se admin/gerente nao tem fazenda cadastrada e nao
      // esta na propria tela de onboarding, redireciona pra wizard.
      if (
        pathname !== "/onboarding" &&
        pathname !== "/operador" &&
        !pathname.startsWith("/operador/") &&
        role !== "operador"
      ) {
        let pulou = false;
        try {
          pulou = typeof window !== "undefined" && localStorage.getItem("ja_onboarding_pulado") === "1";
        } catch { /* ignore */ }
        if (!pulou) {
          const f = await sb.from("fazendas").select("id", { count: "exact", head: true });
          const semFazenda = !f.error && (f.count ?? 0) === 0;
          if (semFazenda) {
            router.push("/onboarding");
            return;
          }
        }
      }
      setVerificando(false);
    })();
  }, [user, pathname, router]);

  if (loading || verificando) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ color: "var(--muted)" }}>
        Carregando...
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <AppSidebar mobileOpen={menuMobileAberto} onClose={() => setMenuMobileAberto(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <OfflineBanner />
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-ja-brd flex items-center justify-between px-3 py-2 shadow-sm">
          <button
            onClick={() => setMenuMobileAberto(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-ja-green-bg"
            aria-label="Abrir menu"
          >
            <span className="block w-5 h-0.5 bg-ja-dark mb-1"></span>
            <span className="block w-5 h-0.5 bg-ja-dark mb-1"></span>
            <span className="block w-5 h-0.5 bg-ja-dark"></span>
          </button>
          <div className="flex items-center gap-2">
            <div className="relative overflow-hidden rounded-lg bg-white" style={{ width: 32, height: 32 }}>
              <img
                src="/logo-ja-agrotec.png"
                alt="JA Agrotec"
                className="absolute inset-0 w-full h-full object-cover scale-[1.6]"
              />
            </div>
            <span className="font-display font-semibold text-sm">AGROTEC</span>
          </div>
          <Link
            href="/guia"
            className="p-2 -mr-2 rounded-lg hover:bg-ja-green-bg flex items-center justify-center"
            aria-label="Guia do usuario"
            style={{ fontSize: 18 }}
          >
            ❓
          </Link>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden">
          {children}
        </main>

        {/* Botao flutuante de ajuda (desktop) - visivel em todas as paginas
            exceto onboarding, pra nao confundir no primeiro acesso */}
        {pathname !== "/onboarding" && (
          <Link
            href="/guia"
            className="hidden lg:flex fixed bottom-6 right-6 z-30 rounded-full shadow-lg items-center justify-center hover:scale-105 transition-transform"
            style={{
              width: 52, height: 52,
              background: "var(--green)", color: "white", fontSize: 24,
            }}
            aria-label="Abrir guia do usuario"
            title="Guia do usuario"
          >
            ❓
          </Link>
        )}
      </div>
    </div>
  );
}
