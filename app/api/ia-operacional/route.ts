// ============================================================
// POST /api/ia-operacional
//
// Recebe um snapshot da fazenda (lancamentos, safras, vendas,
// insumos, talhoes agregados) e chama Claude Haiku pedindo um
// diagnostico estruturado em JSON com oportunidades, riscos e
// acoes prioritarias.
//
// Caso ANTHROPIC_API_KEY nao esteja configurada ou a chamada
// falhe, retorna 503 e o client cai pro modo heuristico.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checarLimite, getIp } from "@/lib/rate-limit";
import { logErro, logInfo, logWarn } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODELO = "claude-haiku-4-5-20251001";

// Rate limit in-memory: 10 reqs/min por IP. ATENCAO: Vercel serverless
// nao garante persistencia entre invocacoes (Map zera entre cold
// starts), entao isso e BEST-EFFORT, nao seguro contra abuso real.
// A protecao seria contra abuso e Bearer token obrigatorio.
const MAX_REQS = 10;
const JANELA_SEGS = 60;

type ItemIA = {
  id?: string;
  icone?: string;
  titulo: string;
  descricao: string;
  prioridade: "alta" | "media" | "baixa";
  acao?: { label: string; href: string };
};

type Resposta = {
  oportunidades: ItemIA[];
  riscos: ItemIA[];
  acoes: ItemIA[];
  resumo?: string;
};

const ROTAS_VALIDAS = new Set([
  "/lancamentos", "/safras", "/talhoes", "/vendas-graos", "/insumos",
  "/fechamento-safra", "/maquinas", "/dashboard", "/qualidade-lotes",
  "/analise-solo", "/certificacao", "/documentos", "/despesas-fixas",
  "/alertas", "/exportar",
]);

function sanitizarItem(it: any): ItemIA | null {
  if (!it || typeof it !== "object") return null;
  if (typeof it.titulo !== "string" || typeof it.descricao !== "string") return null;
  const prio = it.prioridade;
  if (prio !== "alta" && prio !== "media" && prio !== "baixa") return null;
  let acao: ItemIA["acao"] = undefined;
  if (it.acao && typeof it.acao === "object") {
    const href = String(it.acao.href || "");
    if (ROTAS_VALIDAS.has(href)) {
      acao = { label: String(it.acao.label || "Abrir"), href };
    }
  }
  return {
    icone: typeof it.icone === "string" ? it.icone : undefined,
    titulo: it.titulo.slice(0, 120),
    descricao: it.descricao.slice(0, 400),
    prioridade: prio,
    acao,
  };
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  // 1) Autenticacao obrigatoria - so user logado consome a IA.
  //    Sem Bearer token valido, retorna 401 imediato sem chamar Claude.
  //    Essa e a primeira camada de protecao contra DoS financeiro.
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) {
    logWarn("ia_sem_token", { ip });
    return NextResponse.json({ erro: "autenticacao obrigatoria" }, { status: 401 });
  }

  // Valida o token via Supabase
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!sbUrl || !anonKey) {
    return NextResponse.json({ erro: "env vars ausentes" }, { status: 503 });
  }
  const sb = createClient(sbUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const rUser = await sb.auth.getUser(token);
  if (rUser.error || !rUser.data.user) {
    logWarn("ia_token_invalido", { ip });
    return NextResponse.json({ erro: "token invalido" }, { status: 401 });
  }
  const authUserId = rUser.data.user.id;

  // 2) Rate limit in-memory por minuto (best-effort, freia bursts).
  const limite = checarLimite(`ia:user:${authUserId}`, MAX_REQS, JANELA_SEGS);
  if (!limite.ok) {
    logWarn("ia_rate_limit", { ip, authUserId, resetIn: limite.resetIn });
    return NextResponse.json(
      { erro: "Muitas requisicoes. Tente novamente em alguns segundos." },
      {
        status: 429,
        headers: {
          "Retry-After": String(limite.resetIn),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  // 3) Quota DIARIA persistente em Postgres (sobrevive cold start).
  //    Default 100/dia/user. Superadmin retorna ok=true limite=-1 (sem cap).
  const rQ = await sb.rpc("consumir_quota_ia", { p_limite_diario: 100 });
  if (rQ.error) {
    logErro("ia_quota_erro", rQ.error, { ip, authUserId });
    // Falha "soft": loga mas deixa passar (nao quero quebrar UX se DB
    // estiver com problema temporario). Auth + rate limit in-memory
    // ainda barram abuso massivo.
  } else {
    const q = (rQ.data || [])[0];
    if (q && q.ok === false) {
      logWarn("ia_quota_excedida", { authUserId, usado: q.usado, limite: q.limite });
      return NextResponse.json(
        {
          erro: `Limite diario de ${q.limite} analises ja foi atingido. Tente amanha ou solicite upgrade.`,
        },
        { status: 429 },
      );
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { erro: "ANTHROPIC_API_KEY nao configurada" },
      { status: 503 },
    );
  }

  let snapshot: any;
  try {
    snapshot = await req.json();
  } catch {
    return NextResponse.json({ erro: "Body invalido" }, { status: 400 });
  }

  // System fixo (regras + formato + rotas) — marcado pra cache_control.
  // Em pratica: Haiku 4.5 min cacheable = 4096 tokens, esse system fica
  // abaixo, entao normalmente nao cacheia. Marcado por consistencia e
  // pra ja estar pronto se as regras crescerem.
  const system = `Voce e um agronomo consultor analisando dados de uma fazenda brasileira. Devolva diagnostico estruturado em JSON com 3 listas: oportunidades, riscos, acoes prioritarias. Cada item deve ter titulo curto (max 80 chars), descricao acionavel (max 300 chars) e prioridade (alta/media/baixa). Quando relevante, sugira navegacao com acao.href usando UMA destas rotas: ${Array.from(ROTAS_VALIDAS).join(", ")}.

REGRAS:
- Use APENAS dados do snapshot, nao invente numeros.
- Cite valores concretos em R$/ha, sc/ha, % quando possivel.
- Prioridade "alta" so pra coisas urgentes (estoque zerado, safra atrasada, prejuizo, contrato a vencer).
- Maximo 4 itens por lista; menos e melhor.
- Resposta SOMENTE JSON valido, sem markdown nem texto fora.

Formato:
{
  "resumo": "uma frase com diagnostico geral",
  "oportunidades": [{ "icone": "💡", "titulo": "...", "descricao": "...", "prioridade": "alta|media|baixa", "acao": { "label": "...", "href": "/rota" } }],
  "riscos": [...],
  "acoes": [...]
}`;

  const userPrompt = `SNAPSHOT DA FAZENDA:
${JSON.stringify(snapshot, null, 2)}`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 2048,
        system: [
          { type: "text", text: system, cache_control: { type: "ephemeral" } },
        ],
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!r.ok) {
      const erroTxt = await r.text();
      logErro("ia_claude_nao_ok", new Error(erroTxt.slice(0, 200)), { status: r.status, ip });
      return NextResponse.json(
        { erro: `Claude API retornou ${r.status}` },
        { status: 502 },
      );
    }

    const data = await r.json();
    const texto: string = data?.content?.[0]?.text || "";
    const limpo = texto.replace(/```json|```/g, "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(limpo);
    } catch (e) {
      logErro("ia_resposta_invalida", e, { ip, sample: texto.slice(0, 100) });
      return NextResponse.json(
        { erro: "Resposta da IA nao e JSON valido" },
        { status: 502 },
      );
    }

    const resposta: Resposta = {
      resumo: typeof parsed.resumo === "string" ? parsed.resumo.slice(0, 280) : undefined,
      oportunidades: (parsed.oportunidades || []).map(sanitizarItem).filter(Boolean).slice(0, 4),
      riscos: (parsed.riscos || []).map(sanitizarItem).filter(Boolean).slice(0, 4),
      acoes: (parsed.acoes || []).map(sanitizarItem).filter(Boolean).slice(0, 4),
    };

    logInfo("ia_resposta_ok", {
      ip,
      ops: resposta.oportunidades.length,
      risc: resposta.riscos.length,
      acoes: resposta.acoes.length,
    });
    return NextResponse.json(resposta);
  } catch (e: any) {
    logErro("ia_excecao", e, { ip });
    return NextResponse.json(
      { erro: "Falha ao chamar Claude" },
      { status: 502 },
    );
  }
}
