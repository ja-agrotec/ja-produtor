import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
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
      {
        src: "/logo-ja-agrotec.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo-ja-agrotec.png",
        sizes: "any",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Home", short_name: "Home", url: "/home" },
      { name: "Painel Geral", short_name: "Painel", url: "/dashboard" },
      { name: "Atividades", short_name: "Atividades", url: "/lancamentos" },
    ],
  };
}
