"use client";

// Botao "Instalar app" sempre visivel no topo (versao header).
// Diferente do InstalarPwaBanner que so aparece quando o navegador
// dispara beforeinstallprompt (criterio Chrome), este botao FICA
// sempre visivel ate o app estar em standalone mode. Ao clicar, abre
// modal com instrucoes pra cada plataforma + dispara prompt nativo
// se disponivel.

import { useEffect, useState } from "react";

type DeferredPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function ehStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if ((window.navigator as any).standalone === true) return true;
  return window.matchMedia("(display-mode: standalone)").matches;
}

function ehIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function ehAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export default function BotaoInstalarPwa() {
  const [deferred, setDeferred] = useState<DeferredPrompt | null>(null);
  const [aberto, setAberto] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [instalado, setInstalado] = useState(false);

  useEffect(() => {
    setStandalone(ehStandalone());
    function onBefore(e: Event) {
      e.preventDefault();
      setDeferred(e as DeferredPrompt);
    }
    function onInstalled() {
      setDeferred(null);
      setInstalado(true);
      setAberto(false);
    }
    window.addEventListener("beforeinstallprompt", onBefore);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBefore);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function instalarAgora() {
    if (!deferred) return;
    await deferred.prompt();
    const r = await deferred.userChoice;
    if (r.outcome === "accepted") {
      setDeferred(null);
      setInstalado(true);
      setAberto(false);
    }
  }

  // Ja esta rodando como PWA -> nao precisa do botao
  if (standalone || instalado) return null;

  const ios = ehIOS();
  const android = ehAndroid();

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 whitespace-nowrap"
        style={{
          background: "#7CB342",
          color: "#fff",
          fontWeight: 600,
        }}
        title="Instalar app no celular"
      >
        <span>📱</span>
        <span>Instalar</span>
      </button>

      {aberto && (
        <div
          onClick={() => setAberto(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rounded-ja-lg bg-white"
            style={{
              maxWidth: 480,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: 20,
              color: "var(--text)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg" style={{ color: "var(--dark)" }}>
                📱 Instalar app
              </h2>
              <button
                onClick={() => setAberto(false)}
                style={{ background: "transparent", border: 0, fontSize: 22, cursor: "pointer", color: "var(--muted)" }}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            {deferred && (
              <div className="mb-4">
                <button onClick={instalarAgora} className="btn-primary w-full justify-center">
                  Instalar agora
                </button>
                <p className="text-xs mt-2 text-center" style={{ color: "var(--muted)" }}>
                  Toque acima pra instalacao automatica
                </p>
              </div>
            )}

            {ios && (
              <div className="rounded-ja p-3 mb-3" style={{ background: "var(--green-bg)" }}>
                <div className="font-semibold text-sm mb-2">🍎 No iPhone / iPad (Safari)</div>
                <ol className="text-sm space-y-1.5" style={{ marginLeft: 18, listStyleType: "decimal", color: "var(--muted)" }}>
                  <li>Toque no icone <b>Compartilhar</b> <span style={{ fontSize: 16 }}>⬆️</span> na barra inferior</li>
                  <li>Role e toque em <b>Adicionar a Tela de Inicio</b></li>
                  <li>Toque em <b>Adicionar</b> no canto superior direito</li>
                </ol>
                <p className="text-xs mt-2" style={{ color: "var(--dim)" }}>
                  Importante: precisa estar no Safari (nao Chrome).
                </p>
              </div>
            )}

            {android && !deferred && (
              <div className="rounded-ja p-3 mb-3" style={{ background: "var(--green-bg)" }}>
                <div className="font-semibold text-sm mb-2">🤖 No Android (Chrome)</div>
                <ol className="text-sm space-y-1.5" style={{ marginLeft: 18, listStyleType: "decimal", color: "var(--muted)" }}>
                  <li>Toque no menu <b>⋮</b> no canto superior direito</li>
                  <li>Toque em <b>Instalar aplicativo</b> ou <b>Adicionar a tela inicial</b></li>
                  <li>Confirme</li>
                </ol>
                <p className="text-xs mt-2" style={{ color: "var(--dim)" }}>
                  Se nao aparecer no menu: recarregue a pagina e tente de novo.
                </p>
              </div>
            )}

            {!ios && !android && (
              <div className="rounded-ja p-3 mb-3" style={{ background: "var(--green-bg)" }}>
                <div className="font-semibold text-sm mb-2">💻 No computador (Chrome / Edge)</div>
                <ol className="text-sm space-y-1.5" style={{ marginLeft: 18, listStyleType: "decimal", color: "var(--muted)" }}>
                  <li>Procure o icone de <b>instalar</b> na barra de endereco (direita)</li>
                  <li>Ou clique no menu <b>⋮</b> &gt; <b>Instalar JA Agrotec...</b></li>
                  <li>Confirme</li>
                </ol>
              </div>
            )}

            <div
              className="rounded-ja p-3 mt-3 text-xs"
              style={{ background: "#fff8e1", border: "1px solid #ffe082", color: "#5d4037" }}
            >
              <b>Por que instalar?</b> Voce abre direto pelo icone na tela inicial, o app
              funciona <b>sem internet</b> no campo, e a fila de lancamentos sincroniza
              sozinha quando voltar online.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
