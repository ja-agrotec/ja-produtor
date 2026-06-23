// Manifest do PWA Produtor (modulo principal /home). Servido em /manifest.webmanifest.
// Era app/manifest.ts (file convention) mas isso injetava <link rel=manifest>
// AUTOMATICAMENTE em todas as paginas, ignorando o metadata.manifest do
// layout filho /operador. Resultado: PWA "JA Produtor" instalado mesmo em
// /operador. Como Route Handler explicito + metadata em cada layout, o
// cascade do Next 14 funciona corretamente.
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    name: "JA Agrotec · Módulo Produtor",
    short_name: "JA Produtor",
    description: "Gestão completa da propriedade rural — parte do ecossistema JA Agrotec.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "any",
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
    shortcuts: [
      { name: "Home", short_name: "Home", url: "/home" },
      { name: "Painel Geral", short_name: "Painel", url: "/dashboard" },
      { name: "Atividades", short_name: "Atividades", url: "/lancamentos" },
    ],
  });
}
