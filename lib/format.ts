// Helpers de formatacao pt-BR

export function esc(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function fmt(n: number | null | undefined, casas: number = 2): string {
  if (n === null || n === undefined || isNaN(Number(n))) return "0";
  return Number(n).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export function fmtInt(n: number | null | undefined): string {
  return fmt(n, 0);
}

export function fmtBRL(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(Number(v))) return "R$ 0,00";
  return Number(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function fmtBRLShort(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(Number(v))) return "R$ 0";
  const abs = Math.abs(Number(v));
  if (abs >= 1_000_000) return `R$ ${fmt(Number(v) / 1_000_000, 1)} mi`;
  if (abs >= 1_000) return `R$ ${fmt(Number(v) / 1_000, 1)} mil`;
  return `R$ ${fmt(Number(v), 0)}`;
}

export function fmtData(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}

export function fmtDataHora(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR");
}

export function fmtPct(n: number | null | undefined, casas: number = 1): string {
  if (n === null || n === undefined || isNaN(Number(n))) return "0%";
  return `${fmt(n, casas)}%`;
}

export function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}
