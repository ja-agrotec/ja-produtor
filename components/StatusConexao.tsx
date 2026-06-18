"use client";

// Chip pequeno no header do operador que abre painel completo de
// diagnostico do PWA: SW, cache, sessao, fila offline, versao.
// Da ao operador um lugar pra verificar se "tudo esta atualizado"
// sem precisar de DevTools.

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { EVT_QUEUE_CHANGED, emConexaoReal, lerFila, tamanhoFila } from "@/lib/offline";
import { lerCache } from "@/lib/operador-cache";
import { getSupabase } from "@/lib/supabase";

type Estado = "online_ok" | "online_pendente" | "offline" | "verificando";

type Diag = {
  // Conexao
  online: boolean;
  pingMs: number | null;

  // Service Worker
  swEstado: "ativo" | "instalando" | "ausente" | "erro";
  swCache: string | null; // versao do cache (CACHE name)
  swControlador: boolean;

  // Cache Storage
  cacheUrls: number;
  cacheTamanhoKb: number | null;

  // Sessao
  sessaoEmail: string | null;
  sessaoExpiraEm: string | null;

  // Cache de referencias do operador
  perfilNome: string | null;
  fazendaNome: string | null;
  ultimaSyncReferencias: string | null;

  // Fila offline
  filaCount: number;
  ultimaSyncFila: string | null;

  // Versao do app
  versaoCommit: string;
  versaoBuildEm: string;
};

function vazioDiag(): Diag {
  return {
    online: false,
    pingMs: null,
    swEstado: "ausente",
    swCache: null,
    swControlador: false,
    cacheUrls: 0,
    cacheTamanhoKb: null,
    sessaoEmail: null,
    sessaoExpiraEm: null,
    perfilNome: null,
    fazendaNome: null,
    ultimaSyncReferencias: null,
    filaCount: 0,
    ultimaSyncFila: null,
    versaoCommit: process.env.NEXT_PUBLIC_COMMIT_SHA || "?",
    versaoBuildEm: process.env.NEXT_PUBLIC_BUILD_TIME || "?",
  };
}

function fmtData(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

async function coletarDiagnostico(): Promise<Diag> {
  const d = vazioDiag();

  // Conexao
  const t0 = Date.now();
  d.online = await emConexaoReal(3000);
  if (d.online) d.pingMs = Date.now() - t0;

  // Service Worker
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw-operador.js");
      if (!reg) {
        d.swEstado = "ausente";
      } else if (reg.active) {
        d.swEstado = "ativo";
        d.swControlador = !!navigator.serviceWorker.controller;
      } else if (reg.installing || reg.waiting) {
        d.swEstado = "instalando";
      }
    } catch {
      d.swEstado = "erro";
    }
  }

  // Cache Storage - lista o cache mais novo
  if (typeof caches !== "undefined") {
    try {
      const keys = await caches.keys();
      const opCache = keys.filter((k) => k.startsWith("ja-operador-")).sort().reverse()[0];
      if (opCache) {
        d.swCache = opCache;
        const c = await caches.open(opCache);
        const reqs = await c.keys();
        d.cacheUrls = reqs.length;
        // Estimar tamanho via response sizes
        let totalBytes = 0;
        for (const r of reqs) {
          try {
            const res = await c.match(r);
            if (res) {
              const buf = await res.clone().arrayBuffer();
              totalBytes += buf.byteLength;
            }
          } catch { /* skip */ }
        }
        d.cacheTamanhoKb = Math.round(totalBytes / 1024);
      }
    } catch { /* ignore */ }
  }

  // Sessao Supabase (lida do localStorage, instantanea)
  try {
    const sb = getSupabase();
    const { data } = await sb.auth.getSession();
    if (data.session) {
      d.sessaoEmail = data.session.user?.email || null;
      if (data.session.expires_at) {
        d.sessaoExpiraEm = new Date(data.session.expires_at * 1000).toISOString();
      }
    }
  } catch { /* ignore */ }

  // Cache de referencias do operador
  const ref = lerCache();
  d.perfilNome = ref.perfil?.nome || null;
  d.fazendaNome = ref.fazenda?.nome || null;
  d.ultimaSyncReferencias = ref.ultima_sync;

  // Fila offline
  d.filaCount = tamanhoFila();
  if (typeof window !== "undefined") {
    d.ultimaSyncFila = localStorage.getItem("ja_agro_offline_ultima_sync");
  }

  return d;
}

export default function StatusConexao() {
  const [estado, setEstado] = useState<Estado>("verificando");
  const [fila, setFila] = useState(0);
  const [aberto, setAberto] = useState(false);
  const [diag, setDiag] = useState<Diag | null>(null);
  const [carregandoDiag, setCarregandoDiag] = useState(false);

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

  async function abrirPainel() {
    setAberto(true);
    setCarregandoDiag(true);
    try {
      const d = await coletarDiagnostico();
      setDiag(d);
    } finally {
      setCarregandoDiag(false);
    }
  }

  async function atualizarCache() {
    if (!navigator.serviceWorker) return;
    setCarregandoDiag(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw-operador.js");
      if (reg) {
        await reg.update();
        toast.success("Verificacao de update enviada. Se houver nova versao, app vai recarregar.");
      } else {
        toast.error("Service Worker nao registrado");
      }
      // Re-coleta diag
      setDiag(await coletarDiagnostico());
    } catch (e: any) {
      toast.error("Falha: " + (e?.message || e));
    } finally {
      setCarregandoDiag(false);
    }
  }

  async function limparDados() {
    if (!confirm("Tem certeza? Vai limpar cache do SW, cache de referencias e fila offline. Lancamentos pendentes serao PERDIDOS.")) return;
    setCarregandoDiag(true);
    try {
      // Cache Storage
      if (typeof caches !== "undefined") {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      // localStorage relevantes
      localStorage.removeItem("op_referencias_cache_v1");
      localStorage.removeItem("ja_agro_offline_queue");
      localStorage.removeItem("ja_agro_offline_ultima_sync");
      toast.success("Dados locais limpos. Recarregando...");
      setTimeout(() => window.location.reload(), 1500);
    } finally {
      setCarregandoDiag(false);
    }
  }

  let cor = "#9e9e9e";
  let label = "Verificando...";
  let icone = "○";
  if (estado === "online_ok") { cor = "#7CB342"; label = "Atualizado"; icone = "●"; }
  else if (estado === "online_pendente") { cor = "#f57c00"; label = `${fila} pendente${fila > 1 ? "s" : ""}`; icone = "●"; }
  else if (estado === "offline") { cor = "#e53935"; label = "Offline"; icone = "●"; }

  return (
    <>
      <button
        type="button"
        onClick={abrirPainel}
        className="flex items-center gap-1.5 whitespace-nowrap"
        style={{
          fontSize: 11, fontWeight: 600, color: "#fff",
          background: "rgba(255,255,255,.08)",
          padding: "4px 10px", borderRadius: 12,
          border: "1px solid rgba(255,255,255,.15)",
          cursor: "pointer",
        }}
        title="Toque pra ver diagnostico"
      >
        <span style={{ color: cor, fontSize: 14, lineHeight: 1 }}>{icone}</span>
        <span>{label}</span>
      </button>

      {aberto && (
        <div
          onClick={() => setAberto(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            zIndex: 100, display: "flex", alignItems: "center",
            justifyContent: "center", padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rounded-ja-lg bg-white"
            style={{
              maxWidth: 520, width: "100%", maxHeight: "90vh",
              overflowY: "auto", padding: 20, color: "var(--text)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg" style={{ color: "var(--dark)" }}>
                🔍 Diagnostico do app
              </h2>
              <button
                onClick={() => setAberto(false)}
                style={{ background: "transparent", border: 0, fontSize: 22, cursor: "pointer", color: "var(--muted)" }}
                aria-label="Fechar"
              >×</button>
            </div>

            {carregandoDiag && !diag ? (
              <div className="text-center py-8" style={{ color: "var(--muted)" }}>Coletando...</div>
            ) : diag ? (
              <>
                <Secao titulo="🌐 Conexao">
                  <Linha label="Status" valor={diag.online ? "✅ Online" : "❌ Offline"} cor={diag.online ? "#2d7d32" : "#e53935"} />
                  {diag.online && diag.pingMs !== null && <Linha label="Latencia (ping)" valor={`${diag.pingMs} ms`} />}
                </Secao>

                <Secao titulo="⚙️ Service Worker">
                  <Linha
                    label="Estado"
                    valor={
                      diag.swEstado === "ativo" ? "✅ Ativo"
                      : diag.swEstado === "instalando" ? "🔄 Instalando"
                      : diag.swEstado === "ausente" ? "⚠️ Nao registrado"
                      : "❌ Erro"
                    }
                    cor={diag.swEstado === "ativo" ? "#2d7d32" : "#e53935"}
                  />
                  <Linha label="Controlando aba" valor={diag.swControlador ? "✅ Sim" : "Nao (recarregue)"} />
                  {diag.swCache && <Linha label="Versao do cache" valor={diag.swCache} />}
                </Secao>

                <Secao titulo="📦 Cache de assets">
                  <Linha label="Arquivos cacheados" valor={diag.cacheUrls.toString()} />
                  {diag.cacheTamanhoKb !== null && <Linha label="Tamanho aprox." valor={`${diag.cacheTamanhoKb} KB`} />}
                </Secao>

                <Secao titulo="👤 Sessao">
                  <Linha label="Logado como" valor={diag.sessaoEmail || "Nao logado"} />
                  {diag.sessaoExpiraEm && <Linha label="Token expira em" valor={fmtData(diag.sessaoExpiraEm)} />}
                </Secao>

                <Secao titulo="📋 Dados da fazenda no PWA">
                  <Linha label="Perfil" valor={diag.perfilNome || "Nao carregado"} />
                  <Linha label="Fazenda" valor={diag.fazendaNome || "Nao carregada"} />
                  <Linha label="Ultima sincronizacao" valor={fmtData(diag.ultimaSyncReferencias)} cor={diag.ultimaSyncReferencias ? undefined : "var(--warn)"} />
                </Secao>

                <Secao titulo="📤 Fila offline">
                  <Linha label="Pendentes" valor={diag.filaCount.toString()} cor={diag.filaCount > 0 ? "#f57c00" : "#2d7d32"} />
                  <Linha label="Ultimo sync" valor={fmtData(diag.ultimaSyncFila)} />
                </Secao>

                <Secao titulo="🏷️ Versao do app">
                  <Linha label="Commit" valor={diag.versaoCommit.slice(0, 7)} />
                  <Linha label="Compilado em" valor={fmtData(diag.versaoBuildEm)} />
                </Secao>

                <div className="flex gap-2 mt-4 pt-3" style={{ borderTop: "1px solid var(--brd)" }}>
                  <button
                    onClick={atualizarCache}
                    disabled={carregandoDiag}
                    className="btn-primary"
                    style={{ flex: 1, padding: "8px 12px", fontSize: 13 }}
                  >
                    🔄 Verificar update
                  </button>
                  <button
                    onClick={limparDados}
                    disabled={carregandoDiag}
                    className="btn-ghost"
                    style={{ padding: "8px 12px", fontSize: 13, color: "#e53935", borderColor: "#e53935" }}
                  >
                    🗑️ Limpar dados
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 p-3 rounded" style={{ background: "var(--green-bg)" }}>
      <div className="font-semibold text-sm mb-2" style={{ color: "var(--text)" }}>{titulo}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Linha({ label, valor, cor }: { label: string; valor: string; cor?: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span style={{ color: cor || "var(--text)", fontWeight: 600 }}>{valor}</span>
    </div>
  );
}
