// ============================================================
// POST /api/cotacoes/sync
//
// Cron diário (Vercel) busca cotações de mercado em página agro
// pública (noticiasagricolas.com.br) e usa Claude Haiku pra extrair
// JSON estruturado.
//
// AUTH: header `Authorization: Bearer <CRON_SECRET>`
// ENV:  ANTHROPIC_API_KEY, CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY,
//       NEXT_PUBLIC_SUPABASE_URL
//
// Custo estimado: ~$0.01/dia (Claude Haiku ~50k input + ~500 output tokens).
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FONTE_URL = "https://www.noticiasagricolas.com.br/cotacoes";
const FONTE_NOME = "noticiasagricolas.com.br";

type CotacaoExtraida = {
  cultura: string;
  preco_saca: number;
  data: string;
  praca?: string | null;
  variacao_pct?: number | null;
};

function limparHtml(html: string): string {
  // Remove scripts, styles, comentários, espaços excessivos.
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?(html|head|body|meta|link|nav|footer|header|aside|noscript)[^>]*>/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80_000); // cap pra economizar tokens
}

async function extrairComClaude(textoLimpo: string): Promise<CotacaoExtraida[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");

  const client = new Anthropic({ apiKey });
  const hojeISO = new Date().toISOString().slice(0, 10);

  const resp = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    system:
      "Você extrai cotações agrícolas de páginas web brasileiras. " +
      "Retorne APENAS um JSON array válido (começa com [ e termina com ]). " +
      "Sem texto antes ou depois. Sem markdown.",
    messages: [
      {
        role: "user",
        content: `Texto da página Notícias Agrícolas (Cotações de hoje):

${textoLimpo}

Extraia as cotações de mercado FÍSICO das principais culturas brasileiras (SOJA, MILHO, CAFÉ ARÁBICA, CAFÉ ROBUSTA, CANA, TRIGO, BOI GORDO, ALGODÃO).

Retorne JSON array no formato:
[
  {
    "cultura": "SOJA",
    "preco_saca": 135.50,
    "praca": "Paraná",
    "data": "${hojeISO}",
    "variacao_pct": -0.5
  }
]

REGRAS ESTRITAS:
- preco_saca em R$/saca de 60kg (converta se a página mostrar /kg ou /tonelada)
- data no formato YYYY-MM-DD. Use ${hojeISO} se a página não disser explicitamente
- praca: a região/UF se mostrar, senão null
- variacao_pct: número (positivo subiu, negativo caiu) ou null
- cultura sempre em MAIÚSCULAS
- inclua APENAS culturas que apareçam de fato na página com preço numérico
- ignore futures, foque em mercado físico/disponível
- NÃO invente valores. Se não tem certeza, omita a cultura.

Retorne SÓ o JSON array, nada mais.`,
      },
    ],
  });

  const textBlock = resp.content.find((b: any) => b.type === "text") as any;
  const raw = (textBlock?.text || "").trim();

  // Tenta parsear (com fallback se vier com fence markdown)
  let jsonStr = raw;
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) jsonStr = fence[1];

  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function executarSync(): Promise<{ ok: boolean; inseridas: number; detalhe?: any }> {
  // 1. Baixa HTML
  const r = await fetch(FONTE_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    cache: "no-store",
  });
  if (!r.ok) return { ok: false, inseridas: 0, detalhe: `fonte HTTP ${r.status}` };
  const html = await r.text();
  const limpo = limparHtml(html);

  // 2. Extrai com Claude
  let cotacoes: CotacaoExtraida[];
  try {
    cotacoes = await extrairComClaude(limpo);
  } catch (e: any) {
    return { ok: false, inseridas: 0, detalhe: "claude: " + (e?.message || e) };
  }
  if (cotacoes.length === 0) return { ok: true, inseridas: 0, detalhe: "nenhuma cotacao extraida" };

  // 3. Upsert na tabela
  const sb = getSupabaseAdmin();
  const rows = cotacoes.map((c) => ({
    cultura: String(c.cultura || "").trim().toUpperCase(),
    preco_saca: Number(c.preco_saca),
    data: c.data,
    praca: c.praca || null,
    fonte: FONTE_NOME,
    variacao_pct: c.variacao_pct ?? null,
  })).filter((r) => r.cultura && !isNaN(r.preco_saca) && r.preco_saca > 0 && r.data);

  if (rows.length === 0) return { ok: true, inseridas: 0, detalhe: "rows validas: 0" };

  const ins = await sb
    .from("cotacoes_diarias")
    .upsert(rows, { onConflict: "cultura,data,praca,fonte" });
  if (ins.error) return { ok: false, inseridas: 0, detalhe: ins.error.message };

  return { ok: true, inseridas: rows.length, detalhe: rows };
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const res = await executarSync();
  return NextResponse.json(res, { status: res.ok ? 200 : 500 });
}

// GET pra debug humano (mesma auth)
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json(
      {
        api_configurada: !!process.env.ANTHROPIC_API_KEY,
        fonte: FONTE_URL,
        nota: "Use POST com Bearer CRON_SECRET pra disparar.",
      },
      { status: 401 },
    );
  }
  const res = await executarSync();
  return NextResponse.json(res);
}
