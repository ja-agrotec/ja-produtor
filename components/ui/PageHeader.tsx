"use client";
import { ReactNode } from "react";

type Props = {
  titulo: string;
  subtitulo?: string;
  icone?: string;
  acoes?: ReactNode;
};

export default function PageHeader({ titulo, subtitulo, icone, acoes }: Props) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div className="flex items-start gap-3">
        {icone && (
          <div
            className="rounded-ja-lg flex items-center justify-center shrink-0"
            style={{ width: 48, height: 48, background: "var(--green-bg)" }}
          >
            <span style={{ fontSize: 24 }}>{icone}</span>
          </div>
        )}
        <div>
          <h1>{titulo}</h1>
          {subtitulo && (
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              {subtitulo}
            </p>
          )}
        </div>
      </div>
      {acoes && <div className="flex items-center gap-2 flex-wrap">{acoes}</div>}
    </header>
  );
}
