"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase";
import AppSidebar from "@/components/AppSidebar";

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
        .select("ativo")
        .eq("auth_id", user.id)
        .maybeSingle();
      if (r.data && r.data.ativo === false) {
        await sb.auth.signOut();
        router.push("/login?inativo=1");
        return;
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
          <div className="w-9" />
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
