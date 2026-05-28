// ============================================================
// POST /api/cotacoes/sync
// Endpoint chamado por cron Vercel (1x/dia) pra buscar cotações
// numa API externa e popular a tabela cotacoes_diarias.
//
// AUTENTICAÇÃO: header `Authorization: Bearer <CRON_SECRET>`
//
// API EXTERNA: definida via env vars (COTACOES_API_URL, COTACOES_API_KEY).
// Hoje funciona como stub: retorna sucesso sem chamar nada externo.
// Quando o usuário assinar uma API (Cotação do Agro / Notamercantil /
// similar), basta preencher as envs e o connector abaixo.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type CotacaoIn = {
  cultura: string;
  preco_saca: number;
  data: string;       // YYYY-MM-DD
  praca?: string;
  fonte: string;
  variacao_pct?: number;
};

/**
 * Conector da API externa. Plugar aqui quando assinatura sair.
 * Padrao esperado: array de CotacaoIn.
 */
async function buscarCotacoesExternas(): Promise<CotacaoIn[]> {
  const apiUrl = process.env.COTACOES_API_URL;
  const apiKey = process.env.COTACOES_API_KEY;
  if (!apiUrl || !apiKey) {
    // Sem credenciais: retorna vazio (stub).
    return [];
  }
  // PLACEHOLDER — adaptar ao formato real da API escolhida.
  // Exemplo generico:
  //   GET <apiUrl>/cotacoes/hoje
  //   Headers: { Authorization: Bearer <apiKey> }
  //   Returns: [{ produto, preco, data, praca, variacao }]
  try {
    const r = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    if (!r.ok) return [];
    const raw = await r.json();
    // Normalizar conforme retorno real. Stub assume array.
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  // 1. Auth via CRON_SECRET (Vercel cron passa esse header automaticamente)
  const auth = req.headers.get("authorization") || "";
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Busca cotacoes externas
  const cotacoes = await buscarCotacoesExternas();
  if (cotacoes.length === 0) {
    return NextResponse.json({
      ok: true,
      inseridas: 0,
      nota: "API externa nao configurada ou sem dados. Configure COTACOES_API_URL e COTACOES_API_KEY.",
    });
  }

  // 3. Upsert na tabela (UNIQUE em cultura,data,praca,fonte)
  const sb = getSupabaseAdmin();
  const r = await sb
    .from("cotacoes_diarias")
    .upsert(cotacoes, { onConflict: "cultura,data,praca,fonte" });

  if (r.error) {
    return NextResponse.json({ ok: false, error: r.error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, inseridas: cotacoes.length });
}

// GET pra debug humano (so retorna se NAO houver creds, pra evitar disparar cron via GET)
export async function GET() {
  const apiUrl = process.env.COTACOES_API_URL;
  const apiKey = process.env.COTACOES_API_KEY;
  return NextResponse.json({
    api_configurada: !!(apiUrl && apiKey),
    api_url: apiUrl ? "configurada" : "vazia",
    api_key: apiKey ? "configurada" : "vazia",
    nota: "Use POST com Bearer CRON_SECRET pra disparar sync. Vercel cron faz isso automaticamente.",
  });
}
