// Manifest da PWA Operador. Servido em /operador/manifest.json.
// Diferente do manifest raiz (/manifest.webmanifest) pra que instalar
// o atalho do Operador no celular crie um app distinto do Produtor.
//
// IMPORTANTE: Chrome Android exige icons com sizes EXPLICITOS
// (192x192 e 512x512) pra disparar beforeinstallprompt. "any" sozinho
// falha o criterio "installable" e o banner nao aparece.
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    name: "JA Agrotec · Operador",
    short_name: "JA Operador",
    description: "App de campo do JA Agrotec — lançamentos diários offline-first.",
    start_url: "/operador",
    scope: "/operador",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#1A2E1A",
    theme_color: "#7CB342",
    lang: "pt-BR",
    categories: ["business", "productivity", "agriculture"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  });
}
