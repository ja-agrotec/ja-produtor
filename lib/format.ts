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

// Strings no formato "YYYY-MM-DD" (sem hora) precisam ser parseadas como
// data LOCAL, nao UTC. new Date("2026-06-17") interpreta como UTC 00:00,
// e exibido em UTC-3 vira 16/06/2026 21:00 - mostra 1 dia a menos.
// Fix: detecta padrao e constroi Date com componentes locais.
function parseLocal(d: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day);
  }
  return new Date(d);
}

export function fmtData(d: string | null | undefined): string {
  if (!d) return "—";
  const date = parseLocal(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}

export function fmtDataHora(d: string | null | undefined): string {
  if (!d) return "—";
  const date = parseLocal(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR");
}

export function fmtPct(n: number | null | undefined, casas: number = 1): string {
  if (n === null || n === undefined || isNaN(Number(n))) return "0%";
  return `${fmt(n, casas)}%`;
}

// Retorna a data de hoje no fuso LOCAL no formato YYYY-MM-DD.
// Versao antiga usava toISOString() que e UTC - quando o cliente esta
// no Brasil (UTC-3), apos 21h local a UTC ja virou dia seguinte e o
// sistema gravava data errada (1 dia a mais).
export function hoje(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
