"use client";

// Boundary raiz (substitui o RootLayout em catastrofe).
// Tem que renderizar <html> e <body> manualmente.

import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error(
      "[JA] " +
        JSON.stringify({
          ts: new Date().toISOString(),
          sev: "fatal",
          evento: "react_root_error",
          digest: error.digest,
          erro: { mensagem: error.message, stack: error.stack, nome: error.name },
        }),
    );
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f7faf3" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              background: "white",
              padding: 32,
              borderRadius: 12,
              maxWidth: 420,
              textAlign: "center",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontSize: 56 }}>⚠️</div>
            <h1 style={{ fontSize: 22, marginTop: 12, color: "#1a2e1a" }}>
              Erro inesperado
            </h1>
            <p style={{ fontSize: 14, color: "#666", marginTop: 8 }}>
              A aplicacao encontrou um erro fatal. Por favor, recarregue a pagina.
            </p>
            {error.digest && (
              <p
                style={{
                  fontSize: 11,
                  marginTop: 12,
                  padding: 8,
                  background: "#f0f7eb",
                  borderRadius: 6,
                  fontFamily: "monospace",
                  color: "#999",
                }}
              >
                Ref: {error.digest}
              </p>
            )}
            <a
              href="/home"
              style={{
                display: "inline-block",
                marginTop: 16,
                padding: "10px 20px",
                background: "#7CB342",
                color: "white",
                textDecoration: "none",
                borderRadius: 8,
                fontWeight: 600,
              }}
            >
              Voltar ao inicio
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
