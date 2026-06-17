"use client";

// Banner que orienta operador a instalar o PWA na tela inicial do celular.
//
// Comportamento:
//   - Detecta se ja esta rodando em standalone mode -> nao mostra nada
//   - Chrome/Edge/Android: captura beforeinstallprompt e mostra botao
//     "Instalar app" que dispara o prompt nativo
//   - iOS Safari: nao tem beforeinstallprompt - mostra instrucoes
//     "Toque em Compartilhar -> Adicionar a Tela de Inicio"
//   - User pode dispensar (clicar X); fica salvo em localStorage
//     por 7 dias

import { useEffect, useState } from "react";

const LS_DISPENSADO_ATE = "ja_op_pwa_dispensado_ate";

type DeferredPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function ehStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS Safari
  if ((window.navigator as any).standalone === true) return true;
  // Chrome/Edge
  return window.matchMedia("(display-mode: standalone)").matches;
}

function ehIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function estaDispensado(): boolean {
  try {
    const ate = localStorage.getItem(LS_DISPENSADO_ATE);
    if (!ate) return false;
    return new Date().getTime() < Number(ate);
  } catch {
    return false;
  }
}

export default function InstalarPwaBanner() {
  const [deferred, setDeferred] = useState<DeferredPrompt | null>(null);
  const [iosMostra, setIosMostra] = useState(false);
  const [instaladoAgora, setInstaladoAgora] = useState(false);

  useEffect(() => {
    if (ehStandalone()) return; // ja instalado, nada a fazer
    if (estaDispensado()) return; // user dispensou recentemente

    // Chrome/Edge/Android: ouve beforeinstallprompt
    function onBefore(e: Event) {
      e.preventDefault();
      setDeferred(e as DeferredPrompt);
    }
    window.addEventListener("beforeinstallprompt", onBefore);

    // iOS: nao tem evento, mostra banner explicativo
    if (ehIOS()) {
      setIosMostra(true);
    }

    // Se instalou pela UI nativa, esconde
    function onInstalled() {
      setDeferred(null);
      setIosMostra(false);
      setInstaladoAgora(true);
    }
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBefore);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function instalar() {
    if (!deferred) return;
    await deferred.prompt();
    const r = await deferred.userChoice;
    if (r.outcome === "accepted") {
      setDeferred(null);
      setInstaladoAgora(true);
    }
  }

  function dispensar() {
    try {
      const semana = new Date().getTime() + 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem(LS_DISPENSADO_ATE, String(semana));
    } catch { /* ignore */ }
    setDeferred(null);
    setIosMostra(false);
  }

  if (instaladoAgora) {
    return (
      <div
        className="px-4 py-2 text-sm flex items-center gap-2"
        style={{ background: "var(--green-bg)", color: "var(--green-dark, #2d7d32)" }}
      >
        ✅ App instalado! Voce ja pode abrir direto da tela inicial.
      </div>
    );
  }

  // Caso 1: Chrome/Edge/Android com prompt disponivel
  if (deferred) {
    return (
      <div
        className="px-4 py-3 flex items-center gap-3 flex-wrap"
        style={{ background: "#fff8e1", borderBottom: "1px solid #ffe082", color: "#5d4037" }}
      >
        <span style={{ fontSize: 22 }}>📱</span>
        <div className="flex-1 min-w-0" style={{ fontSize: 13 }}>
          <div style={{ fontWeight: 600 }}>Instale o app no celular</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            Acesso rapido pela tela inicial e funciona sem internet no campo.
          </div>
        </div>
        <button
          onClick={instalar}
          className="btn-primary"
          style={{ padding: "8px 16px", fontSize: 13 }}
        >
          Instalar
        </button>
        <button
          onClick={dispensar}
          aria-label="Dispensar"
          style={{ background: "transparent", border: 0, color: "#5d4037", padding: "8px", cursor: "pointer", fontSize: 18 }}
        >
          ×
        </button>
      </div>
    );
  }

  // Caso 2: iOS Safari (sem prompt automatico)
  if (iosMostra) {
    return (
      <div
        className="px-4 py-3 flex items-start gap-3"
        style={{ background: "#fff8e1", borderBottom: "1px solid #ffe082", color: "#5d4037" }}
      >
        <span style={{ fontSize: 22, marginTop: 2 }}>📱</span>
        <div className="flex-1 min-w-0" style={{ fontSize: 13 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Instalar no iPhone</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>
            1. Toque em <b>Compartilhar</b> <span style={{ fontSize: 14 }}>⬆️</span> no Safari<br />
            2. Role e toque em <b>Adicionar a Tela de Inicio</b><br />
            3. Toque em <b>Adicionar</b>
          </div>
        </div>
        <button
          onClick={dispensar}
          aria-label="Dispensar"
          style={{ background: "transparent", border: 0, color: "#5d4037", padding: "0 4px", cursor: "pointer", fontSize: 22, lineHeight: 1 }}
        >
          ×
        </button>
      </div>
    );
  }

  return null;
}
