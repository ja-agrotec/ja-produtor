"use client";
import { ReactNode, useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  titulo: string;
  children: ReactNode;
  rodape?: ReactNode;
  larguraMax?: number;
};

export default function Modal({ open, onClose, titulo, children, rodape, larguraMax = 560 }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      style={{ background: "rgba(26,46,26,.55)" }}
    >
      <div
        className="bg-white rounded-ja-lg shadow-ja-lg w-full overflow-hidden animate-slide-up"
        style={{ maxWidth: larguraMax, maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: "var(--brd)" }}
        >
          <h3>{titulo}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-ja px-2 py-1 text-lg"
            style={{ color: "var(--muted)" }}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto" style={{ flex: 1 }}>
          {children}
        </div>
        {rodape && (
          <div
            className="flex justify-end gap-2 px-5 py-3 border-t"
            style={{ borderColor: "var(--brd)", background: "#fafcf8" }}
          >
            {rodape}
          </div>
        )}
      </div>
    </div>
  );
}
