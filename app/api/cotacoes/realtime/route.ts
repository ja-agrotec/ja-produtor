// ============================================================
// GET /api/cotacoes/realtime
//
// Pega preco intraday de commodities (Yahoo Finance CBOT/ICE)
// + cotacao USD/BRL (AwesomeAPI) e calcula equivalente R$/saca 60kg
// pra cada cultura.
//
// IMPORTANTE: e ESTIMATIVA baseada em futuros internacionais +
// dolar. NAO inclui o "basis" brasileiro (premio/desconto regional).
// Pra preco de venda exato, usar CEPEA fisico.
//
// Cache 5min via Next.js revalidate.
// ============================================================
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 300; // 5 minutos
export const runtime = "nodejs";

// Conversoes pra R$/saca 60kg.
// fator = quanto preco_unidade representa em uma saca de 60kg
type Conversao = {
  yahooSymbol: string;
  unidadeOrigem: string;     // descricao
  saca: number;              // tamanho saca em kg (60 ou 50)
  // formula: preco_brl = preco_usd_unidade * fatorParaSacaPadrao * USD_BRL
  fatorParaSaca: number;
  bolsa: string;             // CBOT / ICE / etc.
  observacao?: string;
};

const CULTURAS: Record<string, Conversao> = {
  SOJA: {
    yahooSymbol: "ZS=F",
    unidadeOrigem: "USc/bushel",
    saca: 60,
    fatorParaSaca: 2.2046 / 100, // 60kg = 2.2046 bushels; cents -> dollar
    bolsa: "CBOT",
  },
  MILHO: {
    yahooSymbol: "ZC=F",
    unidadeOrigem: "USc/bushel",
    saca: 60,
    fatorParaSaca: 2.3622 / 100, // 60kg = 2.3622 bushels milho (bushel milho = 25.4kg)
    bolsa: "CBOT",
  },
  TRIGO: {
    yahooSymbol: "ZW=F",
    unidadeOrigem: "USc/bushel",
    saca: 60,
    fatorParaSaca: 2.2046 / 100,
    bolsa: "CBOT",
  },
  "CAFÉ": {
    yahooSymbol: "KC=F",
    unidadeOrigem: "USc/lb",
    saca: 60,
    fatorParaSaca: 132.277 / 100, // 60kg = 132.277 libras
    bolsa: "ICE",
    observacao: "Arábica (referência mundo)",
  },
  CAFE: {
    yahooSymbol: "KC=F",
    unidadeOrigem: "USc/lb",
    saca: 60,
    fatorParaSaca: 132.277 / 100,
    bolsa: "ICE",
    observacao: "Arábica (referência mundo)",
  },
  "AÇÚCAR": {
    yahooSymbol: "SB=F",
    unidadeOrigem: "USc/lb",
    saca: 50,
    fatorParaSaca: 110.231 / 100, // 50kg = 110.231 libras
    bolsa: "ICE",
    observacao: "Sugar #11",
  },
  ACUCAR: {
    yahooSymbol: "SB=F",
    unidadeOrigem: "USc/lb",
    saca: 50,
    fatorParaSaca: 110.231 / 100,
    bolsa: "ICE",
    observacao: "Sugar #11",
  },
  "ALGODÃO": {
    yahooSymbol: "CT=F",
    unidadeOrigem: "USc/lb",
    saca: 1, // algodao geralmente em @ ou kg, vou retornar /lb mesmo
    fatorParaSaca: 1 / 100, // simplificado: retorna USD/lb x USD_BRL
    bolsa: "ICE",
    observacao: "ICE Cotton #2 (R$/lb)",
  },
  ALGODAO: {
    yahooSymbol: "CT=F",
    unidadeOrigem: "USc/lb",
    saca: 1,
    fatorParaSaca: 1 / 100,
    bolsa: "ICE",
    observacao: "ICE Cotton #2 (R$/lb)",
  },
};

type ResultadoCultura = {
  cultura: string;
  bolsa: string;
  simbolo: string;
  preco_usd: number;
  unidade: string;
  preco_brl_saca: number;
  saca_kg: number;
  variacao_pct: number | null;
  observacao?: string;
};

async function buscarYahoo(symbol: string): Promise<{
  preco: number | null;
  variacaoPct: number | null;
  ts: number | null;
}> {
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ja-agrotec/1.0)" },
        next: { revalidate: 300 },
      },
    );
    if (!r.ok) return { preco: null, variacaoPct: null, ts: null };
    const data = await r.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return { preco: null, variacaoPct: null, ts: null };
    const preco = meta.regularMarketPrice ?? null;
    const ant = meta.chartPreviousClose ?? meta.previousClose ?? null;
    const variacaoPct =
      preco != null && ant != null && ant > 0 ? ((preco - ant) / ant) * 100 : null;
    return { preco, variacaoPct, ts: meta.regularMarketTime || null };
  } catch {
    return { preco: null, variacaoPct: null, ts: null };
  }
}

async function buscarDolar(): Promise<{ bid: number | null; ts: string | null; fonte: string }> {
  // 1. Primaria: AwesomeAPI (intraday). Vercel as vezes bloqueia, entao
  //    User-Agent de browser real.
  try {
    const r = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
      next: { revalidate: 60 },
    });
    if (r.ok) {
      const data = await r.json();
      const d = data?.USDBRL;
      if (d && Number(d.bid)) {
        return { bid: Number(d.bid), ts: d.create_date || null, fonte: "awesomeapi" };
      }
    }
  } catch { /* tenta fallback */ }

  // 2. Fallback: BCB PTAX (oficial, diario, sem rate limit)
  try {
    const r = await fetch(
      "https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados/ultimos/1?formato=json",
      { next: { revalidate: 3600 } },
    );
    if (r.ok) {
      const data = await r.json();
      const ult = Array.isArray(data) ? data[data.length - 1] : null;
      if (ult?.valor) {
        return {
          bid: Number(String(ult.valor).replace(",", ".")) || null,
          ts: ult.data || null,
          fonte: "bcb-ptax",
        };
      }
    }
  } catch { /* todas falharam */ }

  return { bid: null, ts: null, fonte: "indisponivel" };
}

export async function GET() {
  // Busca dolar + cada commodity em paralelo
  const [dolarInfo, ...commodities] = await Promise.all([
    buscarDolar(),
    ...Object.entries(CULTURAS).map(async ([cultura, conf]) => {
      const y = await buscarYahoo(conf.yahooSymbol);
      return { cultura, conf, ...y };
    }),
  ]);
  const dolar = dolarInfo.bid;
  const dolarTs = dolarInfo.ts;

  if (!dolar) {
    return NextResponse.json(
      { ok: false, erro: "USD/BRL indisponivel (awesomeapi+bcb falharam)" },
      { status: 503 },
    );
  }

  // Deduplica culturas (CAFE/CAFÉ apontam pro mesmo simbolo)
  const vistos = new Set<string>();
  const cotacoes: ResultadoCultura[] = [];
  for (const c of commodities) {
    if (c.preco == null) continue;
    if (vistos.has(c.conf.yahooSymbol)) continue;
    vistos.add(c.conf.yahooSymbol);
    const precoBrl = c.preco * c.conf.fatorParaSaca * dolar;
    cotacoes.push({
      cultura: c.cultura,
      bolsa: c.conf.bolsa,
      simbolo: c.conf.yahooSymbol,
      preco_usd: c.preco,
      unidade: c.conf.unidadeOrigem,
      preco_brl_saca: Number(precoBrl.toFixed(2)),
      saca_kg: c.conf.saca,
      variacao_pct: c.variacaoPct != null ? Number(c.variacaoPct.toFixed(2)) : null,
      observacao: c.conf.observacao,
    });
  }

  return NextResponse.json({
    ok: true,
    dolar_brl: dolar,
    dolar_atualizado: dolarTs,
    dolar_fonte: dolarInfo.fonte,
    atualizado_em: new Date().toISOString(),
    cotacoes,
    nota:
      "Estimativa baseada em futuros internacionais (CBOT/ICE) x USD/BRL. " +
      "Nao inclui basis brasileiro. Pra preço de venda exato use CEPEA.",
  });
}
