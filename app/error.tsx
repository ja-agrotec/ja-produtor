"use client";

// Error boundary do segmento root (cobre tudo que nao foi capturado
// por boundaries mais especificos). Mostra fallback amigavel e
// loga estruturado pro Vercel Logs.

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const payload = {
      ts: new Date().toISOString(),
      sev: "error",
      evento: "react_render_error",
      url: typeof window !== "undefined" ? window.location.pathname : undefined,
      digest: error.digest,
      erro: { mensagem: error.message, stack: error.stack, nome: error.name },
    };
    console.error("[JA] " + JSON.stringify(payload));
  }, [error]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--bg, #f7faf3)" }}
    >
      <div className="card w-full max-w-md text-center">
        <div style={{ fontSize: 56, marginBottom: 8 }}>🌧️</div>
        <h1 className="font-display text-2xl mb-2" style={{ color: "var(--dark)" }}>
          Algo deu errado
        </h1>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
          A tela falhou ao carregar. Voce pode tentar de novo ou voltar pra home.
        </p>
        {error.digest && (
          <p
            className="text-xs mb-4 font-mono p-2 rounded"
            style={{ background: "var(--green-bg)", color: "var(--dim)" }}
          >
            Ref: {error.digest}
          </p>
        )}
        <div className="flex gap-2 justify-center">
          <button onClick={reset} className="btn-primary">
            Tentar de novo
          </button>
          <Link href="/home" className="btn-ghost">
            Ir pra home
          </Link>
        </div>
      </div>
    </div>
  );
}
