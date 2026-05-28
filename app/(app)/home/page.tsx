"use client";

// Home / dashboard executivo do produtor.
// Portado de modules/admin-home.js (legado HTML+JS).

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Fazenda, Insumo, Safra, Lancamento, VendaGraos } from "@/lib/types";
import { fmtBRL, fmtBRLShort, fmtData, fmtInt, hoje } from "@/lib/format";
import { getFazendaSelecionada } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import KpiCard from "@/components/ui/KpiCard";
import EmptyState from "@/components/ui/EmptyState";
import FazendaSelector from "@/components/ui/FazendaSelector";

type CotacaoCultura = { cultura: string; preco: number | null; data: string | null };

type ClimaInfo = {
  temperatura: number | null;
  windspeed: number | null;
  weathercode: number | null;
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
  const [ultimosLanc, setUltimosLanc] = useState<Lancamento[]>([]);
  const [clima, setClima] = useState<ClimaInfo | null>(null);
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
    const [rFaz, rTal, rSaf, rIns, rVen, rLan] = await Promise.all([
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

    // Cotações: último preço por cultura
    const vendas = (rVen.data || []) as VendaGraos[];
    const porCultura: Record<string, CotacaoCultura> = {};
    vendas.forEach((v) => {
      const c = (v.cultura || "").trim();
      if (!c || !v.preco_saca) return;
      if (filtroFaz && v.fazenda_id !== filtroFaz) return;
      if (!porCultura[c]) {
        porCultura[c] = { cultura: c, preco: v.preco_saca, data: v.data_contrato || null };
      }
    });
    setCotacoes(Object.values(porCultura).slice(0, 5));

    setUltimosLanc((rLan.data || []) as Lancamento[]);
    setCarregando(false);
  }

  // Clima: pega cidade/estado da fazenda selecionada (ou da fazenda com maior
  // area_total_ha quando "todas"); geocode via Open-Meteo Geocoding API;
  // depois forecast. Cache simples em sessionStorage por cidade,estado.
  useEffect(() => {
    if (fazendasInfo.length === 0) return;

    (async () => {
      // 1. Determina fazenda alvo
      let alvo = fazendaSel ? fazendasInfo.find((f) => f.id === fazendaSel) : null;
      if (!alvo) {
        // "Todas" ou fazenda invalida -> escolhe a maior area
        alvo = [...fazendasInfo]
          .filter((f) => f.cidade) // so as que tem cidade
          .sort((a, b) => (Number(b.area_total_ha || 0)) - (Number(a.area_total_ha || 0)))[0];
      }
      // Fallback: Brasilia se nada utilizavel
      const cidade = alvo?.cidade?.trim() || "Brasília";
      const estado = alvo?.estado?.trim() || "DF";

      // 2. Geocoding (cache em sessionStorage)
      const cacheKey = `geo_${cidade}_${estado}`;
      let coords: { lat: number; lon: number } | null = null;
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) coords = JSON.parse(cached);
      } catch { /* ignore */ }

      if (!coords) {
        try {
          const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&country=BR&count=1&language=pt`;
          const r = await fetch(url);
          const data = await r.json();
          const first = data?.results?.[0];
          if (first?.latitude && first?.longitude) {
            coords = { lat: first.latitude, lon: first.longitude };
            try { sessionStorage.setItem(cacheKey, JSON.stringify(coords)); } catch { /* ignore */ }
          }
        } catch {
          coords = null;
        }
      }
      // Fallback final: Brasilia
      if (!coords) coords = { lat: -15.78, lon: -47.92 };

      setCidadeClima(cidade);

      // 3. Forecast
      try {
        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&timezone=America%2FSao_Paulo`,
        );
        const data = await r.json();
        const cw = data?.current_weather;
        if (cw) {
          setClima({
            temperatura: cw.temperature ?? null,
            windspeed: cw.windspeed ?? null,
            weathercode: cw.weathercode ?? null,
          });
        }
      } catch {
        setClima(null);
      }
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
              <span style={{ fontSize: 42 }}>{iconeClima(clima.weathercode)}</span>
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

        {/* Cotações de hoje */}
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>📊 Cotações de hoje</h3>
          {cotacoes.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Sem contratos recentes para extrair preço.
            </p>
          ) : (
            <div className="space-y-2">
              {cotacoes.map((c) => (
                <div
                  key={c.cultura}
                  className="flex items-center justify-between p-2 rounded-ja"
                  style={{ background: "#f0f7eb" }}
                >
                  <div>
                    <div className="font-semibold text-sm">{c.cultura}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>
                      Último contrato {fmtData(c.data)}
                    </div>
                  </div>
                  <div className="font-bold text-base" style={{ color: "#2d7d32" }}>
                    {fmtBRL(c.preco)}/sc
                  </div>
                </div>
              ))}
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
