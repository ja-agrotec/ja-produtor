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
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxOTIgMTkyIj48cmVjdCB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgZmlsbD0iIzdDQjM0MiIgcng9IjI0Ii8+PHRleHQgeD0iOTYiIHk9IjEzMCIgZm9udC1zaXplPSIxMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPvCfjL48L3RleHQ+PC9zdmc+",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    shortcuts: [
      { name: "Home", short_name: "Home", url: "/home" },
      { name: "Painel Geral", short_name: "Painel", url: "/dashboard" },
      { name: "Atividades", short_name: "Atividades", url: "/lancamentos" },
    ],
  };
}
