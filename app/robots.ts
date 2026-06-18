import type { MetadataRoute } from "next";

const BASE = "https://produtor.ja-agrotec.com.br";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Areas logadas e API ficam fora do crawl
        allow: ["/", "/login", "/signup"],
        disallow: [
          "/api/",
          "/(app)/",
          "/dashboard",
          "/lancamentos",
          "/safras",
          "/talhoes",
          "/vendas-graos",
          "/insumos",
          "/maquinas",
          "/fechamento-safra",
          "/qualidade-lotes",
          "/analise-solo",
          "/certificacao",
          "/documentos",
          "/despesas-fixas",
          "/alertas",
          "/exportar",
          "/configuracoes",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
