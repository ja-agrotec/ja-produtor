"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase";
import { bootstrap, lerCache, sincronizarReferencias } from "@/lib/operador-cache";
import OfflineBanner from "@/components/OfflineBanner";
import { emConexaoReal } from "@/lib/offline";
import { toast } from "sonner";

export default function OperadorLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pronto, setPronto] = useState(false);
  const [perfilNome, setPerfilNome] = useState<string>("");
  const [fazendaNome, setFazendaNome] = useState<string>("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (!user) return;

    (async () => {
      // Tenta usar cache primeiro (rapido, funciona offline)
      const cache = lerCache();
      if (cache.perfil && cache.perfil.auth_id === user.id) {
        setPerfilNome(cache.perfil.nome);
        setFazendaNome(cache.fazenda?.nome || "");
        setPronto(true);
        // Se online, sincroniza referencias em background
        if (await emConexaoReal()) {
          try {
            const novo = await sincronizarReferencias(getSupabase(), cache.perfil);
            setFazendaNome(novo.fazenda?.nome || cache.fazenda?.nome || "");
          } catch {
            /* sync silencioso — cache ja serve */
          }
        }
        return;
      }

      // Sem cache valido — precisa estar online pra bootstrap
      if (!(await emConexaoReal())) {
        toast.error("Primeiro acesso precisa de internet. Conecte e tente de novo.");
        return;
      }

      try {
        const c = await bootstrap(getSupabase(), user.id);
        if (!c || !c.perfil) {
          // Usuario logado mas sem perfil de operador (ex: admin) -
          // NAO derruba sessao. Redireciona pro Produtor com aviso.
          toast.info("Esta área é exclusiva pra usuários com role=operador. Voltando pro Produtor.");
          router.push("/home");
          return;
        }
        setPerfilNome(c.perfil.nome);
        setFazendaNome(c.fazenda?.nome || "");
        setPronto(true);
      } catch (e: any) {
        // Bootstrap pode lancar "Operador sem fazenda atribuida"
        const msg = String(e?.message || "Erro ao carregar perfil");
        if (msg.includes("fazenda atribuida")) {
          toast.error(msg);
          router.push("/home");
          return;
        }
        toast.error(msg);
      }
    })();
  }, [user, loading, router]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen" style={{ color: "var(--muted)" }}>Carregando...</div>;
  }
  if (!user) return null;
  if (!pronto) {
    return <div className="flex items-center justify-center h-screen" style={{ color: "var(--muted)" }}>Preparando seu app...</div>;
  }

  async function sair() {
    const sb = getSupabase();
    await sb.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      {/* Manifest da PWA Operador (override do manifest raiz) */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <link rel="manifest" href="/operador/manifest.json" />
        <meta name="theme-color" content="#1A2E1A" />
      </head>
      <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
        <OfflineBanner />

        {/* Header mobile-first */}
        <header
          className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3"
          style={{
            background: "linear-gradient(180deg, #1A2E1A 0%, #152615 100%)",
            color: "#fff",
            borderBottom: "1px solid rgba(124,179,66,.2)",
          }}
        >
          <div className="relative overflow-hidden rounded-lg bg-white shrink-0" style={{ width: 36, height: 36 }}>
            <img
              src="/logo-ja-agrotec.png"
              alt="JA"
              className="absolute inset-0 w-full h-full object-cover scale-[1.6]"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ fontFamily: "var(--f2)", fontSize: 14, fontWeight: 700, letterSpacing: 2, lineHeight: 1 }}>
              OPERADOR
            </div>
            <div style={{ fontSize: 11, color: "var(--green)", letterSpacing: 1, marginTop: 2 }}>
              {fazendaNome || "—"}
            </div>
          </div>
          <button
            onClick={sair}
            className="text-xs px-3 py-1.5 rounded-md"
            style={{ background: "rgba(255,255,255,.1)", color: "#fff" }}
          >
            Sair
          </button>
        </header>

        <main className="flex-1 p-4 max-w-2xl w-full mx-auto">{children}</main>

        <footer
          className="px-4 py-3 text-xs text-center"
          style={{ color: "var(--muted)", borderTop: "1px solid var(--brd)" }}
        >
          {perfilNome} · JA Agrotec Operador
        </footer>
      </div>
    </>
  );
}
