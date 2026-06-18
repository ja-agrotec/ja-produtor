"use client";

// Registra o Service Worker do Operador e FORCA update agressivo.
// Sem isso, browser pode demorar dias pra perceber nova versao do SW.

import { useEffect } from "react";

export default function RegisterSwOperador() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const tentar = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw-operador.js", {
          scope: "/operador",
          updateViaCache: "none", // sempre busca SW novo do servidor
        });

        // Forca verificacao de nova versao toda vez que o user abre
        try {
          await reg.update();
        } catch { /* ignore */ }

        // Se ha SW waiting, manda skip waiting pra ativar agora
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        // Quando achar um SW novo instalando, pula o waiting
        reg.addEventListener("updatefound", () => {
          const novo = reg.installing;
          if (!novo) return;
          novo.addEventListener("statechange", () => {
            if (novo.state === "installed") {
              if (navigator.serviceWorker.controller) {
                // Update disponivel - ativa imediatamente
                novo.postMessage({ type: "SKIP_WAITING" });
              }
            }
          });
        });

        // Se o controller muda (skipWaiting + claim), recarrega a pagina
        // pra pegar shell novo. So uma vez pra evitar loop.
        let recarregando = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (recarregando) return;
          recarregando = true;
          window.location.reload();
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
