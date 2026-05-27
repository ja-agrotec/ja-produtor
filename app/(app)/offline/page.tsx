"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";
import { fmtDataHora } from "@/lib/format";
import { LS_OFFLINE_QUEUE } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import KpiCard from "@/components/ui/KpiCard";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type OfflineItem = {
  tipo?: string;
  tabela?: string;
  data_lancamento?: string;
  criado_em?: string;
  status?: string;
  descricao?: string;
  categoria?: string;
  valor?: number | string;
  modulo?: string;
  payload?: any;
  [k: string]: any;
};

function carregarFila(): OfflineItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_OFFLINE_QUEUE) || "[]");
  } catch {
    return [];
  }
}

function salvarFila(q: OfflineItem[]) {
  localStorage.setItem(LS_OFFLINE_QUEUE, JSON.stringify(q));
}

export default function OfflinePage() {
  const [fila, setFila] = useState<OfflineItem[]>([]);
  const [online, setOnline] = useState<boolean>(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [confirmar, setConfirmar] = useState<number | null>(null);

  const [supaPend, setSupaPend] = useState(0);
  const [supaErro, setSupaErro] = useState(0);
  const [supaOk, setSupaOk] = useState(0);

  useEffect(() => {
    setFila(carregarFila());
    setOnline(navigator.onLine);
    const upOn = () => setOnline(true);
    const upOff = () => setOnline(false);
    window.addEventListener("online", upOn);
    window.addEventListener("offline", upOff);
    carregarKpisSupabase();
    return () => {
      window.removeEventListener("online", upOn);
      window.removeEventListener("offline", upOff);
    };
  }, []);

  async function carregarKpisSupabase() {
    const sb = getSupabase();
    const [pend, err, ok] = await Promise.all([
      sb
        .from("lancamentos_offline")
        .select("id", { count: "exact", head: true })
        .eq("status", "pendente"),
      sb
        .from("lancamentos_offline")
        .select("id", { count: "exact", head: true })
        .eq("status", "erro"),
      sb
        .from("lancamentos_offline")
        .select("id", { count: "exact", head: true })
        .eq("status", "sincronizado"),
    ]);
    setSupaPend(pend.count || 0);
    setSupaErro(err.count || 0);
    setSupaOk(ok.count || 0);
  }

  function recarregar() {
    setFila(carregarFila());
  }

  async function sincronizarItem(idx: number) {
    if (!navigator.onLine) {
      toast.error("Sem conexão");
      return;
    }
    const q = carregarFila();
    const item = q[idx];
    if (!item) return;

    const tabela = item.tabela || "lancamentos";
    const payload = item.payload || { ...item };
    // Limpa metadados de fila do payload caso esteja inlined
    if (!item.payload) {
      delete (payload as any).criado_em;
      delete (payload as any).status;
      delete (payload as any).tabela;
      delete (payload as any).modulo;
    }

    const sb = getSupabase();
    const r = await sb.from(tabela).insert(payload);
    if (r.error) {
      q[idx].status = "erro: " + r.error.message;
      salvarFila(q);
      setFila([...q]);
      toast.error("Erro: " + r.error.message);
      return;
    }
    q.splice(idx, 1);
    salvarFila(q);
    setFila([...q]);
    toast.success("Item sincronizado!");
    carregarKpisSupabase();
  }

  async function sincronizarTudo() {
    if (!navigator.onLine) {
      toast.error("Sem conexão");
      return;
    }
    const q = carregarFila();
    if (!q.length) {
      toast.info("Nenhum item pendente");
      return;
    }
    setSincronizando(true);
    const sb = getSupabase();
    let ok = 0;
    let erros = 0;

    for (let i = 0; i < q.length; i++) {
      const item = q[i];
      const tabela = item.tabela || "lancamentos";
      const payload = item.payload || { ...item };
      if (!item.payload) {
        delete (payload as any).criado_em;
        delete (payload as any).status;
        delete (payload as any).tabela;
        delete (payload as any).modulo;
      }
      const r = await sb.from(tabela).insert(payload);
      if (r.error) {
        erros++;
        q[i].status = "erro: " + r.error.message;
      } else {
        ok++;
        q[i].status = "sincronizado";
      }
    }

    // remove os sincronizados, mantém os com erro
    const restante = q.filter((it) => !(it.status === "sincronizado"));
    salvarFila(restante);
    setFila(restante);
    setSincronizando(false);

    if (erros === 0) toast.success(`${ok} item(s) sincronizado(s)!`);
    else toast.warning(`${ok} OK · ${erros} com erro`);
    carregarKpisSupabase();
  }

  function removerItem(idx: number) {
    const q = carregarFila();
    q.splice(idx, 1);
    salvarFila(q);
    setFila([...q]);
    toast.success("Item removido da fila");
    setConfirmar(null);
  }

  function statusBadge(s: string | undefined) {
    if (!s || s === "pendente")
      return <span className="badge badge-warn">Pendente</span>;
    if (s === "sincronizado")
      return <span className="badge badge-success">Sincronizado</span>;
    if (s.startsWith("erro"))
      return <span className="badge badge-danger" title={s}>Erro</span>;
    return <span className="badge badge-neutral">{s}</span>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Fila Offline"
        icone="🔄"
        subtitulo="Gerenciador de sincronização de dados capturados sem conexão"
        acoes={
          <>
            <button className="btn-ghost" onClick={recarregar}>
              Atualizar
            </button>
            <button
              className="btn-primary"
              onClick={sincronizarTudo}
              disabled={sincronizando || !fila.length || !online}
            >
              {sincronizando
                ? "Sincronizando..."
                : `Sincronizar tudo (${fila.length})`}
            </button>
          </>
        }
      />

      <div className="grid-cards">
        <KpiCard
          rotulo="Pendentes locais"
          valor={fila.length}
          icone="⏳"
          accent={fila.length > 0 ? "orange" : "green"}
          hint="LocalStorage do navegador"
        />
        <KpiCard
          rotulo="Conexão"
          valor={online ? "Online" : "Offline"}
          icone={online ? "📶" : "📵"}
          accent={online ? "green" : "red"}
        />
        <KpiCard
          rotulo="Erros no Supabase"
          valor={supaErro}
          icone="⚠️"
          accent="red"
          hint="Tabela lancamentos_offline"
        />
        <KpiCard
          rotulo="Sincronizados (histórico)"
          valor={supaOk}
          icone="✅"
          accent="blue"
          hint={`Pend. Supabase: ${supaPend}`}
        />
      </div>

      {fila.length === 0 ? (
        <EmptyState
          icone="✅"
          titulo="Nada pendente"
          descricao="Não há lançamentos aguardando sincronização no momento."
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
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>
                    {fmtDataHora(it.criado_em)}
                  </td>
                  <td>
                    <span className="badge badge-info">
                      {it.modulo || it.tabela || "lancamentos"}
                    </span>
                  </td>
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
                      <button
                        className="btn-danger"
                        onClick={() => setConfirmar(idx)}
                      >
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
        onConfirmar={() => confirmar !== null && removerItem(confirmar)}
      />
    </div>
  );
}
