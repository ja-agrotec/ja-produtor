"use client";
// Selector global de fazenda — persiste no sessionStorage e dispara
// evento "fazenda:changed" pra paginas que queiram re-fetch.
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { getFazendaSelecionada, setFazendaSelecionada } from "@/lib/utils";
import type { Fazenda } from "@/lib/types";

type Props = {
  onChange?: (fazendaId: string | null) => void;
  incluirTodas?: boolean;
};

export default function FazendaSelector({ onChange, incluirTodas = true }: Props) {
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [selecionada, setSelecionada] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const sb = getSupabase();
      const r = await sb.from("fazendas").select("*").eq("ativo", true).order("nome");
      if (!active) return;
      const lista = (r.data || []) as Fazenda[];
      setFazendas(lista);
      const atual = getFazendaSelecionada();
      const validaAtual = atual && lista.some((f) => f.id === atual);
      const inicial = validaAtual ? atual : null;
      setSelecionada(inicial);
      if (onChange) onChange(inicial);
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function alterar(v: string) {
    const novoId = v === "" ? null : v;
    setSelecionada(novoId);
    setFazendaSelecionada(novoId);
    if (onChange) onChange(novoId);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("fazenda:changed", { detail: { fazendaId: novoId } }));
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-caps">Fazenda</span>
      <select
        className="input"
        style={{ width: "auto", minWidth: 200 }}
        value={selecionada || ""}
        onChange={(e) => alterar(e.target.value)}
      >
        {incluirTodas && <option value="">Todas as fazendas</option>}
        {fazendas.map((f) => (
          <option key={f.id} value={f.id}>{f.nome}</option>
        ))}
      </select>
    </div>
  );
}
