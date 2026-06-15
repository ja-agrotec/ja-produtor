// Logger estruturado JSON pra Vercel Logs.
// Prefixo "[JA]" facilita filtro na busca do painel.
// Pronto pra plugar em Sentry/Logflare/BetterStack: basta adicionar
// um sink em logErro/logInfo que envia pro provider escolhido.

type Severidade = "info" | "warn" | "error" | "fatal";

type LogEntry = {
  ts: string;
  sev: Severidade;
  evento: string;
  contexto?: Record<string, unknown>;
  erro?: { mensagem: string; stack?: string; nome?: string };
};

function emitir(entry: LogEntry) {
  // Em prod (Vercel), console.log/error vai pro Vercel Logs com timestamp
  // Em dev, sai colorido no terminal
  const linha = `[JA] ${JSON.stringify(entry)}`;
  if (entry.sev === "error" || entry.sev === "fatal") {
    console.error(linha);
  } else if (entry.sev === "warn") {
    console.warn(linha);
  } else {
    console.log(linha);
  }
}

export function logInfo(evento: string, contexto?: Record<string, unknown>) {
  emitir({ ts: new Date().toISOString(), sev: "info", evento, contexto });
}

export function logWarn(evento: string, contexto?: Record<string, unknown>) {
  emitir({ ts: new Date().toISOString(), sev: "warn", evento, contexto });
}

export function logErro(
  evento: string,
  erro: unknown,
  contexto?: Record<string, unknown>,
) {
  const e = erro instanceof Error ? erro : new Error(String(erro));
  emitir({
    ts: new Date().toISOString(),
    sev: "error",
    evento,
    contexto,
    erro: { mensagem: e.message, stack: e.stack, nome: e.name },
  });
}
