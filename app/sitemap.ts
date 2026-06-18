import type { MetadataRoute } from "next";

const BASE = "https://produtor.ja-agrotec.com.br";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${BASE}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
  ];
}
