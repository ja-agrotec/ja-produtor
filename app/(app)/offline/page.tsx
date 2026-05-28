"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";
import { fmtDataHora } from "@/lib/format";
import {
  EVT_QUEUE_CHANGED,
  emConexaoReal,
  lerFila,
  removerDaFila,
  sincronizar,
  ultimaSincronizacao,
  type OfflineItem,
} from "@/lib/offline";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import KpiCard from "@/components/ui/KpiCard";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function OfflinePage() {
  const [fila, setFila] = useState<OfflineItem[]>([]);
  const [online, setOnline] = useState<boolean>(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [confirmar, setConfirmar] = useState<number | null>(null);
  const [ultimaSync, setUltimaSync] = useState<string | null>(null);

  function refresh() {
    setFila(lerFila());
    setUltimaSync(ultimaSincronizacao());
  }

  useEffect(() => {
    refresh();
    // Estado inicial e listeners
    void emConexaoReal().then(setOnline);
    const upOn = async () => setOnline(await emConexaoReal());
    const upOff = () => setOnline(false);
    const onQ = () => refresh();
    window.addEventListener("online", upOn);
    window.addEventListener("offline", upOff);
    window.addEventListener(EVT_QUEUE_CHANGED, onQ as any);
    return () => {
      window.removeEventListener("online", upOn);
      window.removeEventListener("offline", upOff);
      window.removeEventListener(EVT_QUEUE_CHANGED, onQ as any);
    };
  }, []);

  async function sincronizarItem(idx: number) {
    if (!online) {
      toast.error("Sem conexão");
      return;
    }
    const q = lerFila();
    const item = q[idx];
    if (!item) return;

    const sb = getSupabase();
    const tabela = item.tabela || "lancamentos";
    let payload = item.payload || { ...item };
    if (!item.payload) {
      delete (payload as any).criado_em;
      delete (payload as any).status;
      delete (payload as any).tabela;
      delete (payload as any).modulo;
    }
    const r = await sb.from(tabela).insert(payload);
    if (r.error) {
      // Marca o item como erro, mantem na fila
      const novaFila = lerFila();
      if (novaFila[idx]) {
        novaFila[idx] = { ...novaFila[idx], status: "erro: " + r.error.message };
        // Salva direto (sem dispatch — refresh manual)
        localStorage.setItem("ja_agro_offline_queue", JSON.stringify(novaFila));
        setFila(novaFila);
      }
      toast.error("Erro: " + r.error.message);
      return;
    }
    removerDaFila(idx);
    refresh();
    toast.success("Item sincronizado");
  }

  async function sincronizarTudo() {
    if (!online) {
      toast.error("Sem conexão");
      return;
    }
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
      refresh();
    }
  }

  function statusBadge(s: string | undefined) {
    if (!s || s === "pendente") return <span className="badge badge-warn">Pendente</span>;
    if (s === "sincronizado") return <span className="badge badge-success">Sincronizado</span>;
    if (s.startsWith("erro")) return <span className="badge badge-danger" title={s}>Erro</span>;
    return <span className="badge badge-neutral">{s}</span>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Fila Offline"
        icone="🔄"
        subtitulo="Lançamentos capturados sem conexão aguardando envio ao servidor"
        acoes={
          <>
            <button className="btn-ghost" onClick={refresh}>Atualizar</button>
            <button
              className="btn-primary"
              onClick={sincronizarTudo}
              disabled={sincronizando || !fila.length || !online}
            >
              {sincronizando ? "Sincronizando..." : `Sincronizar tudo (${fila.length})`}
            </button>
          </>
        }
      />

      <div className="grid-cards">
        <KpiCard
          rotulo="Pendentes"
          valor={fila.length}
          icone="⏳"
          accent={fila.length > 0 ? "orange" : "green"}
          hint="No navegador"
        />
        <KpiCard
          rotulo="Conexão"
          valor={online ? "Online" : "Offline"}
          icone={online ? "📶" : "📵"}
          accent={online ? "green" : "red"}
        />
        <KpiCard
          rotulo="Última sincronização"
          valor={ultimaSync ? fmtDataHora(ultimaSync) : "—"}
          icone="🕐"
          accent="blue"
          hint={ultimaSync ? "Registrada localmente" : "Nenhuma ainda"}
        />
      </div>

      {fila.length === 0 ? (
        <EmptyState
          icone="✅"
          titulo="Nada pendente"
          descricao="Não há lançamentos aguardando sincronização."
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Capturado em</th>
                <th>Origem</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {fila.map((it, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>{fmtDataHora(it.criado_em)}</td>
                  <td><span className="badge badge-info">{it.modulo || it.tabela || "lancamentos"}</span></td>
                  <td>{it.tipo || "—"}</td>
                  <td>{it.descricao || it.categoria || "—"}</td>
                  <td>{it.valor != null ? String(it.valor) : "—"}</td>
                  <td>{statusBadge(it.status)}</td>
                  <td>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        className="btn-secondary"
                        onClick={() => sincronizarItem(idx)}
                        disabled={!online}
                      >
                        Reenviar
                      </button>
                      <button className="btn-danger" onClick={() => setConfirmar(idx)}>
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirmar !== null}
        titulo="Remover da fila?"
        mensagem="O item será removido definitivamente da fila local e não será enviado ao servidor."
        destrutivo
        textoConfirmar="Remover"
        onCancelar={() => setConfirmar(null)}
        onConfirmar={() => {
          if (confirmar !== null) {
            removerDaFila(confirmar);
            refresh();
            toast.success("Item removido da fila");
            setConfirmar(null);
          }
        }}
      />
    </div>
  );
}
