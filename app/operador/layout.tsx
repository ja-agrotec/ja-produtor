// Layout server-side de /operador. Existe APENAS pra sobrescrever o
// manifest do PWA via metadata server-side. O Chrome avalia o manifest
// no HTML inicial — manipular <head> via client component (como era
// antes) nao chega a tempo, e o navegador continuava oferecendo o
// manifest raiz "JA Produtor" mesmo em /operador.
//
// A logica de UI (auth, redirect, header, etc) fica em
// OperadorLayoutInner ("use client").
import type { Metadata, Viewport } from "next";
import OperadorLayoutInner from "./OperadorLayoutInner";

export const metadata: Metadata = {
  // /operador/manifest.json e um Route Handler (app/operador/manifest.json/route.ts)
  // que retorna start_url=/operador + scope=/operador + name="JA Operador".
  manifest: "/operador/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#1A2E1A",
};

export default function OperadorLayout({ children }: { children: React.ReactNode }) {
  return <OperadorLayoutInner>{children}</OperadorLayoutInner>;
}
