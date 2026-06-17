// Rate limit in-memory simples (sliding window por IP+endpoint).
// Suficiente pra single-region Vercel; pra multi-region migrar pra
// Upstash/Redis depois.
//
// Vercel serverless funcoes ficam quentes ~5min. O Map global e
// reset entre cold starts - aceita burst legitimo apos restart.
//
// Limite e por (chave, janela): chave geralmente e IP + rota.

type Entrada = { count: number; resetAt: number };
const balde = new Map<string, Entrada>();

// Limpeza preguicosa: a cada 100 inserts, varre entradas expiradas
let opsDesdeLimpeza = 0;
function limparExpirados(agora: number) {
  for (const [k, v] of balde.entries()) {
    if (v.resetAt < agora) balde.delete(k);
  }
}

export type ResultadoLimite = {
  ok: boolean;
  remaining: number;
  resetIn: number; // segundos
};

/**
 * @param chave identificador unico (ex: "ia:1.2.3.4")
 * @param maxReqs maximo de requisicoes na janela
 * @param janelaSegs duracao da janela em segundos
 */
export function checarLimite(
  chave: string,
  maxReqs: number,
  janelaSegs: number,
): ResultadoLimite {
  const agora = Date.now();
  const e = balde.get(chave);

  if (++opsDesdeLimpeza >= 100) {
    limparExpirados(agora);
    opsDesdeLimpeza = 0;
  }

  if (!e || e.resetAt < agora) {
    balde.set(chave, { count: 1, resetAt: agora + janelaSegs * 1000 });
    return { ok: true, remaining: maxReqs - 1, resetIn: janelaSegs };
  }
  if (e.count >= maxReqs) {
    return {
      ok: false,
      remaining: 0,
      resetIn: Math.ceil((e.resetAt - agora) / 1000),
    };
  }
  e.count++;
  return {
    ok: true,
    remaining: maxReqs - e.count,
    resetIn: Math.ceil((e.resetAt - agora) / 1000),
  };
}

/**
 * Extrai IP do request - prioriza X-Forwarded-For do Vercel.
 */
export function getIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const vrip = req.headers.get("x-real-ip");
  if (vrip) return vrip;
  return "unknown";
}
