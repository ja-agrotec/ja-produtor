"use client";
import { ReactNode } from "react";

type Props = {
  icone?: string;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
};

export default function EmptyState({ icone = "📋", titulo, descricao, acao }: Props) {
  return (
    <div className="card flex flex-col items-center justify-center text-center py-10 px-6">
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icone}</div>
      <h3 style={{ marginBottom: 6 }}>{titulo}</h3>
      {descricao && (
        <p className="text-sm max-w-md" style={{ color: "var(--muted)" }}>
          {descricao}
        </p>
      )}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}
