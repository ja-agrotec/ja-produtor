"use client";

// ============================================================
// Banner sticky de status de conexao + sync automatico.
// - Detecta offline via navigator.onLine + ping periodico ao
//   manifest do proprio dominio (mais confiavel).
// - Mostra banner laranja quando offline.
// - Quando volta online e ha fila, mostra banner verde com
//   botao "Sincronizar N".
// - Sync automatico opcional ao voltar online (se ja conectado
//   ha pelo menos 5s, tenta uma vez).
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  EVT_QUEUE_CHANGED,
  emConexaoReal,
  lerFila,
  sincronizar,
  tamanhoFila,
} from "@/lib/offline";
import { getSupabase } from "@/lib/supabase";

const INTERVAL_PING_MS = 30_000;        // 30s
const INTERVAL_PING_OFFLINE_MS = 10_000; // 10s quando offline (volta logo)

export default function OfflineBanner() {
  const [online, setOnline] = useState<boolean>(true);
  const [filaCount, setFilaCount] = useState<number>(0);
  const [sincronizando, setSincronizando] = useState(false);
  const tentouAutoSyncRef = useRef(false);

  // Atualiza count da fila a cada evento
  const atualizarFila = useCallback(() => {
    setFilaCount(tamanhoFila());
  }, []);

  // Verifica conexao real
  const verificarConexao = useCallback(async () => {
    const ok = await emConexaoReal();
    setOnline(ok);
    return ok;
  }, []);

  // Tenta sync (1x) automaticamente quando volta online
  const tentarAutoSync = useCallback(async () => {
    if (tentouAutoSyncRef.current) return;
    if (lerFila().length === 0) return;
    tentouAutoSyncRef.current = true;
    setSincronizando(true);
    try {
      const sb = getSupabase();
      const { ok, erros } = await sincronizar(sb);
      if (ok > 0) toast.success(`Voltou a conexão — ${ok} pendente(s) sincronizado(s)`);
      if (erros > 0) toast.warning(`${erros} item(s) com erro — abra a fila offline pra ver`);
    } catch (e: any) {
      // silencioso (volta a tentar manualmente)
    } finally {
      setSincronizando(false);
      atualizarFila();
    }
  }, [atualizarFila]);

  // Sync manual (botao)
  const sincronizarManual = useCallback(async () => {
    if (sincronizando) return;
    if (lerFila().length === 0) {
      toast.info("Nenhum item pendente");
      return;
    }
    setSincronizando(true);
    try {
      const sb = getSupabase();
      const { ok, erros } = await sincronizar(sb);
      if (erros === 0) toast.success(`${ok} item(s) sincronizado(s)`);
      else toast.warning(`${ok} OK · ${erros} com erro`);
    } catch (e: any) {
      toast.error("Erro ao sincronizar: " + (e?.message || e));
    } finally {
      setSincronizando(false);
      atualizarFila();
    }
  }, [sincronizando, atualizarFila]);

  useEffect(() => {
    // Estado inicial
    atualizarFila();
    void verificarConexao();

    // Listeners de eventos do browser
    const onOn = async () => {
      const ok = await verificarConexao();
      if (ok) {
        tentouAutoSyncRef.current = false;
        // Aguarda 5s antes de auto-sync (deixar a conexao estabilizar)
        setTimeout(() => void tentarAutoSync(), 5000);
      }
    };
    const onOff = () => setOnline(false);
    window.addEventListener("online", onOn);
    window.addEventListener("offline", onOff);

    // Listener de mudancas na fila (vem de outras paginas)
    const onQueueChanged = () => atualizarFila();
    window.addEventListener(EVT_QUEUE_CHANGED, onQueueChanged as any);

    // Ping periodico (intervalo varia por estado)
    let timer: ReturnType<typeof setInterval>;
    const setupTimer = () => {
      if (timer) clearInterval(timer);
      const ms = online ? INTERVAL_PING_MS : INTERVAL_PING_OFFLINE_MS;
      timer = setInterval(() => {
        void verificarConexao();
      }, ms);
    };
    setupTimer();

    return () => {
      window.removeEventListener("online", onOn);
      window.removeEventListener("offline", onOff);
      window.removeEventListener(EVT_QUEUE_CHANGED, onQueueChanged as any);
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nao renderiza nada quando online e sem fila pendente
  if (online && filaCount === 0) return null;

  // OFFLINE: banner laranja
  if (!online) {
    return (
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "var(--warn)",
          color: "#fff",
          padding: "8px 16px",
          fontSize: 13,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,.15)",
        }}
      >
        <span>📵 Sem conexão</span>
        {filaCount > 0 && (
          <span style={{ background: "rgba(255,255,255,.2)", padding: "2px 10px", borderRadius: 12 }}>
            {filaCount} pendente(s) — serão enviados ao voltar
          </span>
        )}
      </div>
    );
  }

  // ONLINE + fila pendente: banner verde com botao sync
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: "var(--success)",
        color: "#fff",
        padding: "8px 16px",
        fontSize: 13,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,.15)",
      }}
    >
      <span>✅ Conectado</span>
      <span>
        {filaCount} lançamento(s) capturados offline aguardando sincronização
      </span>
      <button
        onClick={sincronizarManual}
        disabled={sincronizando}
        style={{
          background: "rgba(255,255,255,.25)",
          border: "1px solid rgba(255,255,255,.4)",
          color: "#fff",
          padding: "4px 12px",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 700,
          cursor: sincronizando ? "wait" : "pointer",
        }}
      >
        {sincronizando ? "Sincronizando..." : "Sincronizar agora"}
      </button>
    </div>
  );
}
