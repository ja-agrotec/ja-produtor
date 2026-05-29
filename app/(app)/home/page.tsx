"use client";

// Home / dashboard executivo do produtor.
// Portado de modules/admin-home.js (legado HTML+JS).

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Fazenda, Insumo, Safra, Lancamento, VendaGraos } from "@/lib/types";
import { fmtBRL, fmtBRLShort, fmtData, fmtInt, hoje } from "@/lib/format";
import { getFazendaSelecionada } from "@/lib/utils";
import { buscarClima, iconeWmo, nomeDiaCurto, type ClimaAtual, type DiaPrevisao } from "@/lib/clima";

// Mapping cultura -> URL oficial CEPEA/Esalq (preço físico do dia).
const CEPEA_URLS: Record<string, string> = {
  SOJA:     "https://www.cepea.org.br/br/indicador/soja.aspx",
  MILHO:    "https://www.cepea.org.br/br/indicador/milho.aspx",
  "CAFÉ":   "https://www.cepea.org.br/br/indicador/cafe.aspx",
  CAFE:     "https://www.cepea.org.br/br/indicador/cafe.aspx",
  CANA:     "https://www.cepea.org.br/br/indicador/cana-de-acucar.aspx",
  "CANA-DE-AÇÚCAR": "https://www.cepea.org.br/br/indicador/cana-de-acucar.aspx",
  TRIGO:    "https://www.cepea.org.br/br/indicador/trigo.aspx",
  "ALGODÃO": "https://www.cepea.org.br/br/indicador/algodao.aspx",
  ALGODAO:  "https://www.cepea.org.br/br/indicador/algodao.aspx",
  ARROZ:    "https://www.cepea.org.br/br/indicador/arroz.aspx",
  "FEIJÃO": "https://www.cepea.org.br/br/indicador/feijao.aspx",
  FEIJAO:   "https://www.cepea.org.br/br/indicador/feijao.aspx",
  "BOI GORDO": "https://www.cepea.org.br/br/indicador/boi-gordo.aspx",
  BOI:      "https://www.cepea.org.br/br/indicador/boi-gordo.aspx",
};

// Mapping cultura -> URL TradingView (intraday/futuros). Preferencia
// B3 quando ha contrato local, senao cai pra CBOT/ICE internacional.
const TV_URLS: Record<string, string> = {
  SOJA:      "https://br.tradingview.com/symbols/CBOT-ZS1!/",                  // CBOT Soybeans
  MILHO:     "https://br.tradingview.com/symbols/BMFBOVESPA-CCM1!/",          // B3 Milho
  "CAFÉ":    "https://br.tradingview.com/symbols/BMFBOVESPA-ICF1!/",          // B3 Cafe Arabica
  CAFE:      "https://br.tradingview.com/symbols/BMFBOVESPA-ICF1!/",
  CANA:      "https://br.tradingview.com/symbols/NYSE-SB1!/",                  // ICE Acucar (Sugar #11)
  "CANA-DE-AÇÚCAR": "https://br.tradingview.com/symbols/NYSE-SB1!/",
  TRIGO:     "https://br.tradingview.com/symbols/CBOT-ZW1!/",                  // CBOT Wheat
  "ALGODÃO": "https://br.tradingview.com/symbols/NYSE-CT1!/",                  // ICE Cotton
  ALGODAO:   "https://br.tradingview.com/symbols/NYSE-CT1!/",
  ARROZ:     "https://br.tradingview.com/symbols/CBOT-ZR1!/",                  // CBOT Rice
  "BOI GORDO": "https://br.tradingview.com/symbols/BMFBOVESPA-BGI1!/",         // B3 Boi Gordo
  BOI:       "https://br.tradingview.com/symbols/BMFBOVESPA-BGI1!/",
};

function urlCepea(cultura: string): string {
  const norm = (cultura || "").trim().toUpperCase();
  return (
    CEPEA_URLS[norm] ||
    `https://www.google.com/search?q=${encodeURIComponent(
      "cotação " + cultura + " cepea hoje",
    )}`
  );
}

function urlIntraday(cultura: string): string {
  const norm = (cultura || "").trim().toUpperCase();
  return (
    TV_URLS[norm] ||
    `https://br.tradingview.com/markets/futures/quotes-agricultural/`
  );
}
import PageHeader from "@/components/ui/PageHeader";
import KpiCard from "@/components/ui/KpiCard";
import EmptyState from "@/components/ui/EmptyState";
import FazendaSelector from "@/components/ui/FazendaSelector";

type CotacaoCultura = { cultura: string; preco: number | null; data: string | null; idadeDias: number | null };
type CotacaoIntraday = {
  cultura: string;
  bolsa: string;
  simbolo: string;
  preco_brl_saca: number;
  saca_kg: number;
  variacao_pct: number | null;
  observacao?: string;
};

const DICAS_AGRONOMICAS = [
  "Monitoramento frequente de pragas reduz custos de controle em até 40%.",
  "Análise de solo a cada 2 anos garante adubação mais precisa e econômica.",
  "Semeadura na época correta pode aumentar a produtividade em 15-20%.",
  "Irrigação suplementar no período crítico valoriza 5 sc/ha em média.",
  "Manutenção preventiva de máquinas reduz paradas em até 60% no plantio.",
  "Registro detalhado de lançamentos permite identificar gargalos de custo.",
];

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function iconeClima(code: number | null): string {
  if (code === null) return "🌡️";
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code <= 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  return "⛈️";
}

export default function HomePage() {
  const { user } = useAuth();
  const [fazendaSel, setFazendaSel] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  // KPIs
  const [fazendasAtivas, setFazendasAtivas] = useState(0);
  const [talhoesAtivos, setTalhoesAtivos] = useState(0);
  const [safrasAbertas, setSafrasAbertas] = useState(0);
  const [insumosCriticos, setInsumosCriticos] = useState(0);
  const [valorEstoque, setValorEstoque] = useState(0);

  // Widgets
  const [cotacoes, setCotacoes] = useState<CotacaoCultura[]>([]);
  const [intraday, setIntraday] = useState<Record<string, CotacaoIntraday>>({});
  const [dolar, setDolar] = useState<number | null>(null);
  const [ultimosLanc, setUltimosLanc] = useState<Lancamento[]>([]);
  const [clima, setClima] = useState<ClimaAtual | null>(null);
  const [previsao, setPrevisao] = useState<DiaPrevisao[]>([]);
  const [cidadeClima, setCidadeClima] = useState<string>("");
  const [fazendasInfo, setFazendasInfo] = useState<
    Array<{ id: string; nome: string; cidade: string | null; estado: string | null; area_total_ha: number | null }>
  >([]);
  const [lembrete, setLembrete] = useState("");

  const dica = useMemo(
    () => DICAS_AGRONOMICAS[new Date().getDate() % DICAS_AGRONOMICAS.length],
    [],
  );

  // Lembrete persiste em localStorage por dia
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `ja_agro_lembrete_${hoje()}`;
    setLembrete(localStorage.getItem(key) || "");
  }, []);

  function salvarLembrete(v: string) {
    setLembrete(v);
    if (typeof window !== "undefined") {
      const key = `ja_agro_lembrete_${hoje()}`;
      localStorage.setItem(key, v);
    }
  }

  // Sincroniza fazenda selecionada (sessionStorage) + eventos globais
  useEffect(() => {
    setFazendaSel(getFazendaSelecionada());
    const onChange = (e: Event) => {
      const ev = e as CustomEvent<{ fazendaId: string | null }>;
      setFazendaSel(ev.detail?.fazendaId ?? null);
    };
    window.addEventListener("fazenda:changed", onChange);
    return () => window.removeEventListener("fazenda:changed", onChange);
  }, []);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fazendaSel]);

  async function carregar() {
    setCarregando(true);
    const sb = getSupabase();
    const filtroFaz = fazendaSel;

    // Tudo em paralelo
    const [rFaz, rTal, rSaf, rIns, rVen, rLan, rSafCult] = await Promise.all([
      sb.from("fazendas").select("id,nome,cidade,estado,area_total_ha").eq("ativo", true),
      filtroFaz
        ? sb.from("talhoes").select("id").eq("ativo", true).eq("fazenda_id", filtroFaz)
        : sb.from("talhoes").select("id").eq("ativo", true),
      filtroFaz
        ? sb
            .from("safras")
            .select("id,status,fazenda_id")
            .eq("status", "aberta")
            .eq("fazenda_id", filtroFaz)
        : sb.from("safras").select("id,status").eq("status", "aberta"),
      sb.from("insumos").select("id,estoque_atual,estoque_minimo,preco_unitario").eq("ativo", true),
      sb
        .from("vendas_graos")
        .select("cultura,preco_saca,data_contrato,fazenda_id")
        .order("data_contrato", { ascending: false })
        .limit(50),
      filtroFaz
        ? sb
            .from("lancamentos")
            .select("*")
            .eq("status", "confirmado")
            .eq("fazenda_id", filtroFaz)
            .order("data_lancamento", { ascending: false })
            .limit(6)
        : sb
            .from("lancamentos")
            .select("*")
            .eq("status", "confirmado")
            .order("data_lancamento", { ascending: false })
            .limit(6),
      // Culturas que a fazenda (ou todas) tem cadastradas nas safras
      filtroFaz
        ? sb.from("safras").select("cultura").eq("fazenda_id", filtroFaz)
        : sb.from("safras").select("cultura"),
    ]);

    setFazendasAtivas(rFaz.data?.length || 0);
    setFazendasInfo((rFaz.data || []) as any[]);
    setTalhoesAtivos(rTal.data?.length || 0);
    setSafrasAbertas(rSaf.data?.length || 0);

    const insumos = (rIns.data || []) as Insumo[];
    setInsumosCriticos(
      insumos.filter(
        (i) =>
          (i.estoque_minimo || 0) > 0 &&
          (i.estoque_atual || 0) <= (i.estoque_minimo || 0),
      ).length,
    );
    setValorEstoque(
      insumos.reduce(
        (s, i) => s + (i.estoque_atual || 0) * (i.preco_unitario || 0),
        0,
      ),
    );

    // Cotacoes: TODAS as culturas que a fazenda cultiva (safras),
    // com o ultimo preco praticado em vendas_graos por cultura.
    const vendas = (rVen.data || []) as VendaGraos[];
    const culturasFazenda = Array.from(
      new Set(
        ((rSafCult.data || []) as Array<{ cultura: string | null }>)
          .map((s) => (s.cultura || "").trim().toUpperCase())
          .filter(Boolean),
      ),
    );

    // Ultimo preco por cultura (filtra por fazenda se aplicavel)
    const ultimoPrecoPorCultura: Record<string, { preco: number; data: string }> = {};
    vendas.forEach((v) => {
      const c = (v.cultura || "").trim().toUpperCase();
      if (!c || !v.preco_saca) return;
      if (filtroFaz && v.fazenda_id !== filtroFaz) return;
      const dataAtual = v.data_contrato || "";
      const prev = ultimoPrecoPorCultura[c];
      if (!prev || dataAtual > prev.data) {
        ultimoPrecoPorCultura[c] = { preco: v.preco_saca, data: dataAtual };
      }
    });

    const hojeISO = hoje();
    const lista: CotacaoCultura[] = culturasFazenda.map((cult) => {
      const ult = ultimoPrecoPorCultura[cult];
      let idadeDias: number | null = null;
      if (ult?.data) {
        const d1 = new Date(ult.data + "T00:00:00").getTime();
        const d2 = new Date(hojeISO + "T00:00:00").getTime();
        idadeDias = Math.max(0, Math.round((d2 - d1) / 86400000));
      }
      return {
        cultura: cult,
        preco: ult?.preco ?? null,
        data: ult?.data ?? null,
        idadeDias,
      };
    });
    // Ordena: com cotacao recente primeiro; sem cotacao no fim
    lista.sort((a, b) => {
      if (a.preco == null && b.preco != null) return 1;
      if (a.preco != null && b.preco == null) return -1;
      return (a.idadeDias ?? 9999) - (b.idadeDias ?? 9999);
    });
    setCotacoes(lista);

    setUltimosLanc((rLan.data || []) as Lancamento[]);
    setCarregando(false);
  }

  // Cotacao intraday (Yahoo CBOT/ICE x USD/BRL) — refresh a cada 5min
  useEffect(() => {
    let active = true;
    async function fetchIntraday() {
      try {
        const r = await fetch("/api/cotacoes/realtime", { cache: "no-store" });
        const data = await r.json();
        if (!active || !data.ok) return;
        const map: Record<string, CotacaoIntraday> = {};
        (data.cotacoes as CotacaoIntraday[]).forEach((c) => {
          map[c.cultura.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "")] = c;
        });
        setIntraday(map);
        setDolar(data.dolar_brl ?? null);
      } catch { /* silencioso */ }
    }
    fetchIntraday();
    const i = setInterval(fetchIntraday, 5 * 60 * 1000);
    return () => { active = false; clearInterval(i); };
  }, []);

  // Clima: pega cidade da fazenda selecionada (ou maior area se "todas")
  // e busca atual + previsao 5 dias via lib/clima.ts
  useEffect(() => {
    if (fazendasInfo.length === 0) return;
    (async () => {
      let alvo = fazendaSel ? fazendasInfo.find((f) => f.id === fazendaSel) : null;
      if (!alvo) {
        alvo = [...fazendasInfo]
          .filter((f) => f.cidade)
          .sort((a, b) => Number(b.area_total_ha || 0) - Number(a.area_total_ha || 0))[0];
      }
      const cidade = alvo?.cidade?.trim() || "Brasília";
      const estado = alvo?.estado?.trim() || "DF";
      const c = await buscarClima(cidade, estado, 5);
      setCidadeClima(c.cidade);
      setClima(c.atual);
      setPrevisao(c.previsao);
    })();
  }, [fazendaSel, fazendasInfo]);

  const nomeUsuario =
    (user?.user_metadata?.nome as string | undefined) ||
    (user?.email ? user.email.split("@")[0] : "Produtor");

  return (
    <div className="space-y-4">
      {/* HERO BANNER */}
      <div
        className="gradient-hero rounded-ja-lg p-6 text-white flex items-center justify-between gap-4 flex-wrap"
        style={{ background: "linear-gradient(135deg,#1A2E1A 0%,#2d4a2d 60%,#1565c0 100%)" }}
      >
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider opacity-80">JA Agrotec · Produtor</div>
          <h1 style={{ color: "#fff", fontSize: "clamp(20px,3vw,28px)", margin: "6px 0" }}>
            {saudacao()}, {nomeUsuario}! 🌾
          </h1>
          <div className="text-sm opacity-90">
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <FazendaSelector onChange={(id) => setFazendaSel(id)} />
          {clima && (
            <div className="flex items-center gap-3 mt-2">
              <span style={{ fontSize: 42 }}>{iconeWmo(clima.weathercode)}</span>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
                  {clima.temperatura !== null ? `${Math.round(clima.temperatura)}°C` : "—"}
                </div>
                <div className="text-xs opacity-80">
                  {cidadeClima || "—"} · 💨 {clima.windspeed ? Math.round(clima.windspeed) : 0} km/h
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Previsao 5 dias */}
      {previsao.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 style={{ margin: 0 }}>Previsão · {cidadeClima || "—"}</h3>
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              Próximos {previsao.length} dia(s)
            </span>
          </div>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${previsao.length}, minmax(0, 1fr))` }}
          >
            {previsao.map((p) => {
              const choveuMuito = p.chuvaMm >= 5;
              const ventoForte = p.ventoMaxKmh >= 30;
              return (
                <div
                  key={p.data}
                  className="flex flex-col items-center text-center rounded-ja py-2 px-1"
                  style={{
                    background: choveuMuito ? "var(--info-lt)" : "var(--green-bg)",
                    border: ventoForte ? "1px solid var(--warn)" : "1px solid var(--brd)",
                  }}
                >
                  <div className="text-caps" style={{ fontSize: 10 }}>
                    {nomeDiaCurto(p.data)}
                  </div>
                  <div style={{ fontSize: 28, lineHeight: 1, margin: "4px 0" }}>
                    {iconeWmo(p.weathercode)}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                    {Math.round(p.tempMax)}°
                    <span style={{ color: "var(--muted)", fontWeight: 500, marginLeft: 4 }}>
                      / {Math.round(p.tempMin)}°
                    </span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: choveuMuito ? "var(--info)" : "var(--muted)" }}>
                    💧 {p.chuvaMm > 0 ? `${p.chuvaMm.toFixed(1)}mm` : "—"}
                  </div>
                  <div className="text-xs" style={{ color: ventoForte ? "var(--warn)" : "var(--muted)" }}>
                    💨 {Math.round(p.ventoMaxKmh)} km/h
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid-cards">
        <KpiCard
          rotulo="Fazendas Ativas"
          valor={carregando ? "…" : fazendasAtivas}
          icone="🏡"
          accent="green"
        />
        <KpiCard
          rotulo="Talhões Ativos"
          valor={carregando ? "…" : talhoesAtivos}
          icone="🌱"
          accent="blue"
        />
        <KpiCard
          rotulo="Safras Abertas"
          valor={carregando ? "…" : safrasAbertas}
          icone="🌾"
          accent="purple"
        />
        <KpiCard
          rotulo="Insumos Críticos"
          valor={carregando ? "…" : insumosCriticos}
          icone="📦"
          accent={insumosCriticos > 0 ? "red" : "green"}
          hint={insumosCriticos > 0 ? "Abaixo do estoque mínimo" : "Tudo em ordem"}
        />
        <KpiCard
          rotulo="Valor de Estoque"
          valor={carregando ? "…" : fmtBRLShort(valorEstoque)}
          icone="💰"
          accent="orange"
        />
      </div>

      {/* WIDGETS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lembrete do dia */}
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>📌 Lembrete do dia</h3>
          <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>
            Persistido no navegador para hoje ({fmtData(hoje())})
          </p>
          <textarea
            className="input"
            rows={4}
            placeholder="Anotações rápidas, recados, lembretes..."
            value={lembrete}
            onChange={(e) => salvarLembrete(e.target.value)}
            style={{ resize: "vertical" }}
          />
        </div>

        {/* Dica agronômica */}
        <div
          className="card"
          style={{
            background: "linear-gradient(135deg,#e8f5e9,#f1f8e9)",
            borderLeft: "4px solid #2d7d32",
          }}
        >
          <div className="text-caps mb-2" style={{ color: "#2d7d32" }}>
            🌿 Dica do Agrônomo
          </div>
          <div style={{ fontSize: 15, color: "#1A2E1A", fontWeight: 600, lineHeight: 1.5 }}>
            {dica}
          </div>
        </div>

        {/* Cotações: intraday + sua venda + atalho pra CEPEA */}
        <div className="card">
          <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
            <h3 style={{ margin: 0 }}>📊 Cotações</h3>
            {dolar && (
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                Estimativa CBOT/ICE × USD/BRL R$ {dolar.toFixed(4)}
              </span>
            )}
          </div>
          {cotacoes.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Cadastre uma safra para começar a acompanhar as cotações das suas culturas.
            </p>
          ) : (
            <div className="space-y-2">
              {cotacoes.map((c) => {
                const sem = c.preco == null;
                const isHoje = c.idadeDias === 0;
                const recente = c.idadeDias != null && c.idadeDias <= 7;
                const antigo = c.idadeDias != null && c.idadeDias > 30;
                let badge: { label: string; cls: string } | null = null;
                if (sem) badge = { label: "Sem registro", cls: "badge-neutral" };
                else if (isHoje) badge = { label: "Hoje", cls: "badge-success" };
                else if (recente) badge = { label: `${c.idadeDias}d atrás`, cls: "badge-info" };
                else if (antigo) badge = { label: `${c.idadeDias}d atrás`, cls: "badge-warn" };
                else if (c.idadeDias != null) badge = { label: `${c.idadeDias}d atrás`, cls: "badge-neutral" };

                // Match intraday (normaliza sem acento pra bater com a chave do mapa)
                const key = c.cultura.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
                const intra = intraday[key];

                return (
                  <div
                    key={c.cultura}
                    className="flex items-center justify-between gap-3 p-2 rounded-ja"
                    style={{
                      background: sem ? "var(--bg)" : "var(--green-bg)",
                      opacity: sem ? 0.85 : 1,
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm flex items-center gap-2 flex-wrap">
                        {c.cultura}
                        {badge && <span className={`badge ${badge.cls}`} style={{ fontSize: 9 }}>{badge.label}</span>}
                      </div>
                      {intra && (
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="font-bold text-sm" style={{ color: "var(--info)" }}>
                            ~ {fmtBRL(intra.preco_brl_saca)}{intra.saca_kg !== 1 ? `/sc ${intra.saca_kg}kg` : "/lb"}
                          </span>
                          {intra.variacao_pct != null && (
                            <span
                              className="text-xs font-semibold"
                              style={{
                                color: intra.variacao_pct > 0 ? "var(--success)"
                                  : intra.variacao_pct < 0 ? "var(--danger)" : "var(--muted)",
                              }}
                            >
                              {intra.variacao_pct > 0 ? "▲" : intra.variacao_pct < 0 ? "▼" : "−"}
                              {" " + Math.abs(intra.variacao_pct).toFixed(2)}%
                            </span>
                          )}
                          <span className="text-xs" style={{ color: "var(--dim)" }}>
                            ({intra.bolsa})
                          </span>
                        </div>
                      )}
                      <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                        {c.data
                          ? `Sua última venda: ${fmtBRL(c.preco)}/sc em ${fmtData(c.data)}`
                          : "Nenhuma venda registrada"}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <a
                        href={urlCepea(c.cultura)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Cotação física do dia (CEPEA/Esalq) — ${c.cultura}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          padding: "5px 10px",
                          background: "var(--info)",
                          color: "#fff",
                          borderRadius: "var(--r)",
                          fontSize: 11,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          textDecoration: "none",
                        }}
                      >
                        💹 CEPEA
                      </a>
                      <a
                        href={urlIntraday(c.cultura)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Cotação em tempo real (TradingView) — ${c.cultura}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          padding: "5px 10px",
                          background: "var(--success)",
                          color: "#fff",
                          borderRadius: "var(--r)",
                          fontSize: 11,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          textDecoration: "none",
                        }}
                      >
                        📈 Tempo real
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Próximas tarefas / últimos lançamentos */}
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>📋 Últimos lançamentos</h3>
          {carregando ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Carregando...
            </p>
          ) : ultimosLanc.length === 0 ? (
            <EmptyState
              icone="📋"
              titulo="Nada por aqui"
              descricao="Nenhum lançamento confirmado recente."
            />
          ) : (
            <div className="space-y-1">
              {ultimosLanc.map((l) => {
                const isDespesa = l.tipo === "despesa";
                return (
                  <div
                    key={l.id}
                    className="flex items-center justify-between py-2 border-b"
                    style={{ borderColor: "var(--brd)" }}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {l.descricao || l.tipo}
                      </div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>
                        {fmtData(l.data_lancamento)}
                      </div>
                    </div>
                    <div
                      className="text-sm font-bold whitespace-nowrap"
                      style={{ color: isDespesa ? "#e53935" : "#2d7d32" }}
                    >
                      {isDespesa ? "-" : "+"}
                      {fmtBRL(l.custo_total || 0)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
