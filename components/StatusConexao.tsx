"use client";

// Chip pequeno e sempre visivel no header do operador mostrando o
// estado do app: online/offline + fila pendente. Diferente do
// OfflineBanner (que ocupa linha inteira e so aparece quando ha
// problema), este indicador fica discreto e da feedback constante
// "esta tudo ok".

import { useCallback, useEffect, useState } from "react";
import { EVT_QUEUE_CHANGED, emConexaoReal, tamanhoFila } from "@/lib/offline";

type Estado = "online_ok" | "online_pendente" | "offline" | "verificando";

export default function StatusConexao() {
  const [estado, setEstado] = useState<Estado>("verificando");
  const [fila, setFila] = useState(0);

  const atualizar = useCallback(async () => {
    const f = tamanhoFila();
    setFila(f);
    const online = await emConexaoReal(2000);
    if (!online) setEstado("offline");
    else if (f > 0) setEstado("online_pendente");
    else setEstado("online_ok");
  }, []);

  useEffect(() => {
    void atualizar();
    const onOn = () => void atualizar();
    const onOff = () => setEstado("offline");
    const onQueue = () => void atualizar();
    window.addEventListener("online", onOn);
    window.addEventListener("offline", onOff);
    window.addEventListener(EVT_QUEUE_CHANGED, onQueue as any);
    const t = setInterval(() => void atualizar(), 30_000);
    return () => {
      window.removeEventListener("online", onOn);
      window.removeEventListener("offline", onOff);
      window.removeEventListener(EVT_QUEUE_CHANGED, onQueue as any);
      clearInterval(t);
    };
  }, [atualizar]);

  let cor = "#9e9e9e"; // cinza pra verificando
  let label = "Verificando...";
  let icone = "○";

  if (estado === "online_ok") {
    cor = "#7CB342";
    label = "Atualizado";
    icone = "●";
  } else if (estado === "online_pendente") {
    cor = "#f57c00";
    label = `${fila} pendente${fila > 1 ? "s" : ""}`;
    icone = "●";
  } else if (estado === "offline") {
    cor = "#e53935";
    label = "Offline";
    icone = "●";
  }

  return (
    <div
      className="flex items-center gap-1.5 whitespace-nowrap"
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "#fff",
        background: "rgba(255,255,255,.08)",
        padding: "4px 10px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,.15)",
      }}
      title={
        estado === "online_ok"
          ? "Conectado. Sistema sincronizado e pronto pra uso."
          : estado === "online_pendente"
            ? `Conectado, mas ${fila} lancamento(s) ainda nao sincronizado(s).`
            : estado === "offline"
              ? "Sem conexao. Lancamentos serao salvos localmente e enviados ao voltar."
              : "Verificando conexao..."
      }
    >
      <span style={{ color: cor, fontSize: 14, lineHeight: 1 }}>{icone}</span>
      <span>{label}</span>
    </div>
  );
}
