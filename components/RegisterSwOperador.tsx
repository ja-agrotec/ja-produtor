"use client";

// Registra o Service Worker do Operador. Necessario pra PWA abrir
// offline servindo HTML/JS/CSS do cache. Sem isso, instalar a PWA
// so dava visual "fullscreen sem barra" mas nao funcionava offline.

import { useEffect } from "react";

export default function RegisterSwOperador() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const tentar = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw-operador.js", {
          scope: "/operador",
        });
        // Se ha update aguardando, ativa
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
        reg.addEventListener("updatefound", () => {
          const novo = reg.installing;
          if (!novo) return;
          novo.addEventListener("statechange", () => {
            if (novo.state === "installed" && navigator.serviceWorker.controller) {
              // Nova versao disponivel - recarrega na proxima nav
              // (silencioso pra nao atrapalhar lancamentos em andamento)
            }
          });
        });
      } catch (e) {
        console.warn("[ja] SW operador falhou:", e);
      }
    };

    if (document.readyState === "complete") {
      void tentar();
    } else {
      window.addEventListener("load", () => void tentar(), { once: true });
    }
  }, []);

  return null;
}
