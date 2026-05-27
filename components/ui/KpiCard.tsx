"use client";
import { ReactNode } from "react";

type Accent = "green" | "orange" | "red" | "blue" | "purple";

type Props = {
  rotulo: string;
  valor: ReactNode;
  icone?: string;
  hint?: string;
  accent?: Accent;
};

export default function KpiCard({ rotulo, valor, icone, hint, accent = "green" }: Props) {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between mb-2">
        <span className="text-caps">{rotulo}</span>
        {icone && <span style={{ fontSize: 20 }}>{icone}</span>}
      </div>
      <div className="kpi-number">{valor}</div>
      {hint && (
        <div className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>
          {hint}
        </div>
      )}
      <div className={`kpi-accent ${accent}`} />
    </div>
  );
}
