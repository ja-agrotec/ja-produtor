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
