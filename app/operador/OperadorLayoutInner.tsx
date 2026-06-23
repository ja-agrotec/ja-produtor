"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase";
import { bootstrap, lerCache, sincronizarReferencias } from "@/lib/operador-cache";
import OfflineBanner from "@/components/OfflineBanner";
import InstalarPwaBanner from "@/components/InstalarPwaBanner";
import BotaoInstalarPwa from "@/components/BotaoInstalarPwa";
import StatusConexao from "@/components/StatusConexao";
import RegisterSwOperador from "@/components/RegisterSwOperador";
import { emConexaoReal } from "@/lib/offline";
import { toast } from "sonner";

function ehStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if ((window.navigator as any).standalone === true) return true;
  return window.matchMedia("(display-mode: standalone)").matches;
}

export default function OperadorLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pronto, setPronto] = useState(false);
  const [perfilNome, setPerfilNome] = useState<string>("");
  const [fazendaNome, setFazendaNome] = useState<string>("");
  const [contaErrada, setContaErrada] = useState<{ email: string; standalone: boolean } | null>(null);

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
          // Usuario logado mas nao e operador (admin/superadmin/etc).
          // Se estamos em PWA standalone (apk Operador instalado),
          // NAO redireciona pra /home porque isso sai do escopo da PWA
          // e mostra menu Produtor confuso. Mostra tela explicativa
          // pedindo pra trocar de conta.
          if (ehStandalone()) {
            setContaErrada({ email: user.email || "?", standalone: true });
            return;
          }
          // Navegador normal: redireciona pro Produtor
          toast.info("Esta area e exclusiva pra usuarios com role=operador. Voltando pro Produtor.");
          router.push("/home");
          return;
        }
        setPerfilNome(c.perfil.nome);
        setFazendaNome(c.fazenda?.nome || "");
        setPronto(true);
      } catch (e: any) {
        const msg = String(e?.message || "Erro ao carregar perfil");
        if (msg.includes("fazenda atribuida")) {
          if (ehStandalone()) {
            setContaErrada({ email: user.email || "?", standalone: true });
            return;
          }
          toast.error(msg);
          router.push("/home");
          return;
        }
        toast.error(msg);
      }
    })();
  }, [user, loading, router]);

  async function sair() {
    const sb = getSupabase();
    await sb.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen" style={{ color: "var(--muted)" }}>Carregando...</div>;
  }
  if (!user) return null;

  // PWA standalone com conta errada (nao-operador): mostra tela
  // explicativa em vez de redirecionar pra /home (que sairia do scope
  // da PWA e mostraria menu Produtor confusoo)
  if (contaErrada) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "linear-gradient(135deg,#1A2E1A 0%,#2d4a2d 100%)" }}
      >
        <div className="card w-full max-w-md text-center">
          <div style={{ fontSize: 56 }}>👤</div>
          <h1 className="font-display text-xl mt-3 mb-2" style={{ color: "var(--dark)" }}>
            Conta sem perfil de operador
          </h1>
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
            Voce esta logado como <b>{contaErrada.email}</b>.
            Este app e exclusivo pra usuarios com papel <b>operador</b>.
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
            Sai e logue com uma conta de operador pra usar o app de campo.
          </p>
          <button onClick={sair} className="btn-primary w-full justify-center">
            Sair e trocar de conta
          </button>
        </div>
      </div>
    );
  }

  if (!pronto) {
    return <div className="flex items-center justify-center h-screen" style={{ color: "var(--muted)" }}>Preparando seu app...</div>;
  }

  // Manifest/theme-color override agora vem do server layout (app/operador/layout.tsx)
  // via export const metadata — client-side <head> nao chega a tempo do Chrome
  // avaliar o PWA, oferecia sempre o manifest raiz (JA Produtor).
  return (
    <>
      <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
        <RegisterSwOperador />
        <OfflineBanner />
        <InstalarPwaBanner />

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
            <div className="flex items-center gap-2 mt-1">
              <div style={{ fontSize: 11, color: "var(--green)", letterSpacing: 1 }}>
                {fazendaNome || "—"}
              </div>
              <StatusConexao />
            </div>
          </div>
          <BotaoInstalarPwa />
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
