// Helpers genericos compartilhados

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout> | null = null;
  return ((...args: any[]) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  }) as T;
}

// Constantes globais do app
export const CULTURAS_PADRAO = ["CAFÉ", "MILHO", "SOJA", "CANA", "OUTRAS"];

// Casa uma string de cultura (que pode vir de safras.cultura ou
// talhoes.cultura_atual com formatos "Cafe", "Cafe Arabica", "soja",
// "CAFÉ") com uma das CULTURAS_PADRAO. Match e' por normalizacao
// (lowercase, sem acentos) + match de prefixo.
// Retorna a cultura padrao se achar, senao retorna o valor original
// pra preservar dado (usar como option dinamica no select).
export function matchCulturaPadrao(valor: string | null | undefined): string {
  if (!valor) return "";
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const nv = norm(valor);
  // Match exato primeiro
  const exato = CULTURAS_PADRAO.find((c) => norm(c) === nv);
  if (exato) return exato;
  // Match por prefixo (ex: "Cafe Arabica" -> "CAFÉ")
  const primPalavra = nv.split(/\s+/)[0];
  const prefixo = CULTURAS_PADRAO.find((c) => norm(c) === primPalavra || primPalavra.startsWith(norm(c)));
  if (prefixo) return prefixo;
  // Preserva valor original (componente deve renderizar como option dinamica)
  return valor;
}

// Versao slug usada em qualidade-lotes (abas lowercase sem acento).
// Retorna so 4 culturas suportadas pelas abas, ou null se nao bate.
export function matchCulturaSlug(
  valor: string | null | undefined,
): "cafe" | "soja" | "milho" | "cana" | null {
  if (!valor) return null;
  const slug = valor.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  if (slug.startsWith("cafe")) return "cafe";
  if (slug.startsWith("soja")) return "soja";
  if (slug.startsWith("milho")) return "milho";
  if (slug.startsWith("cana")) return "cana";
  return null;
}
export const UNIDADES_PADRAO = ["KG", "L", "SC", "T", "UN", "CX", "G", "ML", "H", "HA", "D"];
export const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO",
  "MA","MT","MS","MG","PA","PB","PR","PE","PI",
  "RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export const ITENS_POR_PAGINA = 12;
export const TOAST_DURACAO = 3500;
export const DEBOUNCE_MS = 350;

// Chaves de sessionStorage compartilhadas com modulos legados
export const SS_FAZENDA_SELECIONADA = "homeFazSel";
export const LS_OFFLINE_QUEUE = "ja_agro_offline_queue";

// Helpers de sessao
export function getFazendaSelecionada(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SS_FAZENDA_SELECIONADA);
}

export function setFazendaSelecionada(fazendaId: string | null): void {
  if (typeof window === "undefined") return;
  if (fazendaId) sessionStorage.setItem(SS_FAZENDA_SELECIONADA, fazendaId);
  else sessionStorage.removeItem(SS_FAZENDA_SELECIONADA);
}
