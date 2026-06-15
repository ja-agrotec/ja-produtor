// GET /api/health
//
// Healthcheck pra monitor externo (UptimeRobot, BetterStack, Pingdom).
// Confere:
//   - app responde (status 200)
//   - Supabase responde (select trivial na tabela fazendas)
//   - latencia
// Retorna JSON com { ok, ts, supabase: { ok, ms } }.
//
// Tambem serve pra manter Supabase free vivo (memo: pausa em 7 dias
// sem atividade): basta agendar um cron externo batendo aqui 1x/dia.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const inicio = Date.now();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { ok: false, ts: new Date().toISOString(), erro: "env vars ausentes" },
      { status: 503 },
    );
  }

  let supabaseOk = false;
  let supabaseMs = 0;
  let supabaseErro: string | undefined;

  try {
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const t0 = Date.now();
    const r = await sb.from("fazendas").select("id", { head: true, count: "exact" }).limit(1);
    supabaseMs = Date.now() - t0;
    if (r.error) {
      supabaseErro = r.error.message;
    } else {
      supabaseOk = true;
    }
  } catch (e: any) {
    supabaseErro = String(e?.message || e).slice(0, 200);
  }

  const totalMs = Date.now() - inicio;
  const ok = supabaseOk;
  return NextResponse.json(
    {
      ok,
      ts: new Date().toISOString(),
      total_ms: totalMs,
      supabase: { ok: supabaseOk, ms: supabaseMs, erro: supabaseErro },
    },
    { status: ok ? 200 : 503 },
  );
}
