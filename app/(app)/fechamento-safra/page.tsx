"use client";

import { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Safra, Fazenda, Lancamento, Categoria } from "@/lib/types";
import { fmtBRL, fmtBRLShort, fmtData, fmtInt, fmtPct } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import KpiCard from "@/components/ui/KpiCard";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// ============================================================
// Pagina de Fechamento de Safra — porta admin-fechamento-safra.js
// SIMPLIFICACOES (vs legacy 1597 linhas):
//   - Nao usa tabela separada fechamento_safra/fechamento_talhao.
//     Atualiza a propria tabela safras com status, producao, produtividade.
//   - Custos sao computados sob demanda agregando lancamentos.
//   - PDF compacto (1-2 paginas): cabecalho, KPIs, breakdown
//     por categoria. Sem detalhe por talhao nem aviso legal/rodape.
//   - Comparativo usa recharts (legacy usava Chart.js).
// ============================================================

type SafraComFazenda = Safra & { fazendas?: { nome: string } | null };

type AggSafra = {
  safra: SafraComFazenda;
  despesas: number;
  receitas: number;
  porCategoria: { categoria: string; valor: number; tipo: "despesa" | "receita" }[];
  lucro: number;
  roi: number | null;
};

type FechamentoForm = {
  safra_id: string;
  producao_sc: string;
  receita_total: string;
  observacoes: string;
};

const ABAS = [
  { id: "visao", label: "Visao Geral", icone: "📊" },
  { id: "lista", label: "Lista de Fechamentos", icone: "📋" },
  { id: "comp", label: "Comparativo", icone: "📈" },
  { id: "novo", label: "Novo Fechamento", icone: "➕" },
] as const;
type AbaId = (typeof ABAS)[number]["id"];

const CORES_PIZZA = ["#7CB342", "#f57c00", "#1565c0", "#6a1b9a", "#e53935", "#2e7d32"];

export default function FechamentoSafraPage() {
  return (
    <Suspense fallback={<div className="card text-center py-10" style={{ color: "var(--muted)" }}>Carregando...</div>}>
      <FechamentoSafraContent />
    </Suspense>
  );
}

function FechamentoSafraContent() {
  const searchParams = useSearchParams();
  const safraQuery = searchParams.get("safra");

  const [aba, setAba] = useState<AbaId>(safraQuery ? "novo" : "visao");
  const [safras, setSafras] = useState<SafraComFazenda[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [form, setForm] = useState<FechamentoForm>({
    safra_id: safraQuery || "",
    producao_sc: "",
    receita_total: "",
    observacoes: "",
  });
  const [salvando, setSalvando] = useState(false);

  const [confirmEncerrar, setConfirmEncerrar] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const sb = getSupabase();
      const [rSaf, rLan, rCat] = await Promise.all([
        sb
          .from("safras")
          .select("*, fazendas(nome)")
          .neq("status", "cancelada")
          .order("data_plantio", { ascending: false, nullsFirst: false }),
        sb.from("lancamentos").select("*").limit(5000),
        sb.from("categorias_lancamento").select("*"),
      ]);
      if (rSaf.error) throw rSaf.error;
      setSafras((rSaf.data || []) as SafraComFazenda[]);
      setLancamentos((rLan.data || []) as Lancamento[]);
      setCategorias((rCat.data || []) as Categoria[]);
    } catch (e: any) {
      toast.error("Erro ao carregar fechamentos: " + (e?.message || e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Quando a query param 'safra' chega, pre-seleciona no form
  useEffect(() => {
    if (safraQuery) {
      setForm((f) => ({ ...f, safra_id: safraQuery }));
      setAba("novo");
    }
  }, [safraQuery]);

  // Indexador rapido de categorias
  const catMap = useMemo(() => {
    const m: Record<string, Categoria> = {};
    categorias.forEach((c) => (m[c.id] = c));
    return m;
  }, [categorias]);

  // Agrega custos/receitas por safra a partir dos lancamentos
  const aggPorSafra = useMemo(() => {
    const map = new Map<string, AggSafra>();
    safras.forEach((s) => {
      map.set(s.id, {
        safra: s,
        despesas: 0,
        receitas: 0,
        porCategoria: [],
        lucro: 0,
        roi: null,
      });
    });

    const catAcc: Record<string, Record<string, { valor: number; tipo: "despesa" | "receita" }>> = {};
    lancamentos.forEach((l) => {
      if (!l.safra_id) return;
      const a = map.get(l.safra_id);
      if (!a) return;
      const valor = Number(l.custo_total || 0);
      if (l.tipo === "despesa") a.despesas += valor;
      else if (l.tipo === "receita") a.receitas += valor;
      const cat = catMap[l.categoria_id]?.nome || "Outros";
      if (!catAcc[l.safra_id]) catAcc[l.safra_id] = {};
      const slot = catAcc[l.safra_id][cat] || { valor: 0, tipo: l.tipo };
      slot.valor += valor;
      catAcc[l.safra_id][cat] = slot;
    });

    map.forEach((a) => {
      const cats = catAcc[a.safra.id] || {};
      a.porCategoria = Object.entries(cats)
        .map(([categoria, v]) => ({ categoria, valor: v.valor, tipo: v.tipo }))
        .sort((x, y) => y.valor - x.valor);
      a.lucro = a.receitas - a.despesas;
      a.roi = a.despesas > 0 ? (a.lucro / a.despesas) * 100 : null;
    });
    return map;
  }, [safras, lancamentos, catMap]);

  const safrasAbertas = useMemo(
    () => safras.filter((s) => s.status === "aberta" || s.status === "planejamento"),
    [safras],
  );
  const safrasEncerradas = useMemo(() => safras.filter((s) => s.status === "encerrada"), [safras]);

  // -- Visao Geral: KPIs gerais e cards de safras prontas pra fechar --
  const kpisVisao = useMemo(() => {
    let totalDespesas = 0;
    let totalReceitas = 0;
    let totalArea = 0;
    let totalProducao = 0;
    safrasEncerradas.forEach((s) => {
      const a = aggPorSafra.get(s.id);
      totalDespesas += a?.despesas || 0;
      totalReceitas += a?.receitas || 0;
      totalArea += Number(s.area_ha || 0);
      totalProducao += Number(s.producao_sc || 0);
    });
    const lucro = totalReceitas - totalDespesas;
    const roi = totalDespesas > 0 ? (lucro / totalDespesas) * 100 : 0;
    return {
      qtdEncerradas: safrasEncerradas.length,
      qtdAbertas: safrasAbertas.length,
      despesas: totalDespesas,
      receitas: totalReceitas,
      lucro,
      roi,
      area: totalArea,
      producao: totalProducao,
    };
  }, [safrasEncerradas, safrasAbertas, aggPorSafra]);

  // -- Form de novo fechamento --
  const safraSelecionada = useMemo(() => {
    if (!form.safra_id) return null;
    return safras.find((s) => s.id === form.safra_id) || null;
  }, [form.safra_id, safras]);

  const aggSafraSelecionada = useMemo(() => {
    if (!safraSelecionada) return null;
    return aggPorSafra.get(safraSelecionada.id) || null;
  }, [safraSelecionada, aggPorSafra]);

  const calculoFechamento = useMemo(() => {
    if (!safraSelecionada || !aggSafraSelecionada) return null;
    const area = Number(safraSelecionada.area_ha || 0);
    const producao = Number(form.producao_sc || 0);
    const produtividade = area > 0 ? producao / area : 0;
    const custo = aggSafraSelecionada.despesas;
    // Se receita_total foi informada manualmente, usa ela; senao usa a soma dos lancamentos
    const receitaInformada = Number(form.receita_total || 0);
    const receita = receitaInformada > 0 ? receitaInformada : aggSafraSelecionada.receitas;
    const lucro = receita - custo;
    const roi = custo > 0 ? (lucro / custo) * 100 : 0;
    return { producao, produtividade, custo, receita, lucro, roi };
  }, [safraSelecionada, aggSafraSelecionada, form.producao_sc, form.receita_total]);

  // -- Acoes --
  function pedirEncerrar() {
    if (!form.safra_id) {
      toast.error("Selecione a safra");
      return;
    }
    if (!form.producao_sc || Number(form.producao_sc) <= 0) {
      toast.error("Informe a producao total em sacas");
      return;
    }
    setConfirmEncerrar(true);
  }

  async function encerrarSafra() {
    if (!safraSelecionada || !calculoFechamento) {
      setConfirmEncerrar(false);
      return;
    }
    setSalvando(true);
    try {
      const sb = getSupabase();
      const payload: any = {
        status: "encerrada",
        producao_sc: calculoFechamento.producao,
        produtividade_sc_ha: calculoFechamento.produtividade,
        custo_total: calculoFechamento.custo,
        receita_total: calculoFechamento.receita,
      };
      // data_colheita: se nao tem, marca hoje
      if (!safraSelecionada.data_colheita) {
        payload.data_colheita = new Date().toISOString().substring(0, 10);
      }
      if (form.observacoes.trim()) {
        const obsAtuais = safraSelecionada.observacoes || "";
        payload.observacoes = `${obsAtuais ? obsAtuais + "\n\n" : ""}[Fechamento] ${form.observacoes.trim()}`;
      }
      const r = await sb.from("safras").update(payload).eq("id", safraSelecionada.id);
      if (r.error) throw r.error;
      toast.success("Safra encerrada com sucesso");
      setConfirmEncerrar(false);
      setForm({ safra_id: "", producao_sc: "", receita_total: "", observacoes: "" });
      setAba("lista");
      void carregar();
    } catch (e: any) {
      toast.error("Erro ao encerrar: " + (e?.message || e));
    } finally {
      setSalvando(false);
    }
  }

  // -- PDF compacto (1-2 paginas) --
  async function gerarPDF(safraId: string) {
    const safra = safras.find((s) => s.id === safraId);
    if (!safra) {
      toast.error("Safra nao encontrada");
      return;
    }
    const agg = aggPorSafra.get(safraId);
    if (!agg) return;
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      const MARGIN = 14;
      let y = MARGIN;

      // Cabecalho
      doc.setFillColor(124, 179, 66);
      doc.rect(0, 0, W, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("FECHAMENTO DE SAFRA", MARGIN, 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("JA Agrotec - Modulo Produtor", MARGIN, 18);
      doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, MARGIN, 23);
      y = 36;

      // Identificacao da safra
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(safra.nome, MARGIN, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(90, 117, 96);
      const linhaInfo = [
        safra.fazendas?.nome,
        safra.cultura,
        safra.ano_agricola,
        safra.data_colheita ? `Colheita: ${fmtData(safra.data_colheita)}` : "",
      ]
        .filter(Boolean)
        .join("  |  ");
      doc.text(linhaInfo, MARGIN, y);
      y += 8;

      // KPIs em grid de 3 colunas
      const area = Number(safra.area_ha || 0);
      const producao = Number(safra.producao_sc || 0);
      const produtividade = Number(safra.produtividade_sc_ha || 0);
      const custo = Number(safra.custo_total || agg.despesas);
      const receita = Number(safra.receita_total || agg.receitas);
      const lucro = receita - custo;
      const roi = custo > 0 ? (lucro / custo) * 100 : 0;
      const custoHa = area > 0 ? custo / area : 0;
      const custoSc = producao > 0 ? custo / producao : 0;

      const kpis: [string, string][] = [
        ["Area", `${fmtInt(area)} ha`],
        ["Producao", `${fmtInt(producao)} sc`],
        ["Produtividade", `${fmtInt(produtividade)} sc/ha`],
        ["Custo Total", fmtBRL(custo)],
        ["Receita", fmtBRL(receita)],
        ["Lucro Liquido", fmtBRL(lucro)],
        ["ROI", fmtPct(roi, 1)],
        ["Custo / ha", fmtBRL(custoHa)],
        ["Custo / sc", fmtBRL(custoSc)],
      ];
      const cardW = (W - 2 * MARGIN - 12) / 3;
      const cardH = 17;
      kpis.forEach((kp, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = MARGIN + col * (cardW + 6);
        const cy = y + row * (cardH + 3);
        doc.setFillColor(240, 247, 235);
        doc.setDrawColor(124, 179, 66);
        doc.roundedRect(x, cy, cardW, cardH, 2, 2, "FD");
        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(kp[0].toUpperCase(), x + 3, cy + 5);
        doc.setTextColor(45, 125, 50);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(kp[1], x + 3, cy + 12);
      });
      y += Math.ceil(kpis.length / 3) * (cardH + 3) + 6;

      // Tabela: Breakdown por categoria
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text("COMPOSICAO DE CUSTOS POR CATEGORIA", MARGIN, y);
      y += 2;

      const despesasCat = agg.porCategoria.filter((c) => c.tipo === "despesa");
      const totalDesp = despesasCat.reduce((a, c) => a + c.valor, 0) || 1;
      const body = despesasCat.map((c) => [
        c.categoria,
        fmtBRL(c.valor),
        `${((c.valor / totalDesp) * 100).toFixed(1)}%`,
      ]);
      autoTable(doc, {
        startY: y + 2,
        head: [["Categoria", "Valor", "% do total"]],
        body: body.length ? body : [["(Sem lancamentos)", "—", "—"]],
        foot: [["TOTAL", fmtBRL(totalDesp), "100,0%"]],
        theme: "grid",
        headStyles: { fillColor: [124, 179, 66], textColor: 255, fontStyle: "bold", fontSize: 9 },
        footStyles: { fillColor: [220, 235, 210], textColor: [30, 30, 30], fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 2 },
        margin: { left: MARGIN, right: MARGIN },
      });
      y = (doc as any).lastAutoTable.finalY + 6;

      // Observacoes (se couber)
      if (safra.observacoes) {
        if (y > 250) doc.addPage();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("OBSERVACOES", MARGIN, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        const lines = doc.splitTextToSize(safra.observacoes, W - 2 * MARGIN);
        doc.text(lines, MARGIN, y);
      }

      const safeNome = safra.nome.replace(/[^a-zA-Z0-9_-]/g, "_");
      doc.save(`Fechamento_${safeNome}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e: any) {
      toast.error("Erro ao gerar PDF: " + (e?.message || e));
    }
  }

  // --- Dados pro grafico comparativo ---
  const dadosComparativo = useMemo(() => {
    return safrasEncerradas
      .slice()
      .sort((a, b) => (a.data_colheita || "").localeCompare(b.data_colheita || ""))
      .map((s) => {
        const agg = aggPorSafra.get(s.id);
        const custo = Number(s.custo_total || agg?.despesas || 0);
        const receita = Number(s.receita_total || agg?.receitas || 0);
        const lucro = receita - custo;
        const roi = custo > 0 ? (lucro / custo) * 100 : 0;
        return {
          nome: s.nome.length > 18 ? s.nome.substring(0, 18) + "…" : s.nome,
          custo,
          receita,
          lucro,
          roi: Number(roi.toFixed(1)),
        };
      });
  }, [safrasEncerradas, aggPorSafra]);

  return (
    <div>
      <PageHeader
        titulo="Fechamento de Safra"
        subtitulo="Apure custos, receitas e gere relatorios consolidados"
        icone="📈"
      />

      {/* Abas */}
      <div className="flex flex-wrap gap-1 mb-6 border-b" style={{ borderColor: "var(--brd)" }}>
        {ABAS.map((t) => {
          const ativa = aba === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setAba(t.id)}
              className="px-4 py-2 rounded-t-ja text-sm font-semibold transition-colors"
              style={{
                background: ativa ? "var(--green)" : "transparent",
                color: ativa ? "#fff" : "var(--muted)",
                borderBottom: ativa ? "none" : "2px solid transparent",
              }}
            >
              <span className="mr-1">{t.icone}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      {carregando ? (
        <div className="card text-center py-10" style={{ color: "var(--muted)" }}>
          Carregando...
        </div>
      ) : (
        <>
          {aba === "visao" && (
            <VisaoGeral
              kpis={kpisVisao}
              safrasAbertas={safrasAbertas}
              aggPorSafra={aggPorSafra}
              onIrPraNovo={(id) => {
                setForm({ safra_id: id, producao_sc: "", receita_total: "", observacoes: "" });
                setAba("novo");
              }}
            />
          )}

          {aba === "lista" && (
            <ListaFechamentos
              safrasEncerradas={safrasEncerradas}
              aggPorSafra={aggPorSafra}
              gerarPDF={gerarPDF}
            />
          )}

          {aba === "comp" && <Comparativo dados={dadosComparativo} />}

          {aba === "novo" && (
            <NovoFechamento
              form={form}
              setForm={setForm}
              safrasAbertas={safrasAbertas}
              safraSelecionada={safraSelecionada}
              aggSafra={aggSafraSelecionada}
              calculo={calculoFechamento}
              onEncerrar={pedirEncerrar}
              salvando={salvando}
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmEncerrar}
        titulo="Encerrar safra"
        mensagem={`Confirma o encerramento da safra "${safraSelecionada?.nome ?? ""}"? Esta acao marca a safra como encerrada e atualiza producao, produtividade, custo e receita.`}
        textoConfirmar={salvando ? "Encerrando..." : "Encerrar Safra"}
        onConfirmar={encerrarSafra}
        onCancelar={() => setConfirmEncerrar(false)}
      />
    </div>
  );
}

// ------------------------ Subcomponentes ------------------------

function VisaoGeral({
  kpis,
  safrasAbertas,
  aggPorSafra,
  onIrPraNovo,
}: {
  kpis: {
    qtdEncerradas: number;
    qtdAbertas: number;
    despesas: number;
    receitas: number;
    lucro: number;
    roi: number;
    area: number;
    producao: number;
  };
  safrasAbertas: SafraComFazenda[];
  aggPorSafra: Map<string, AggSafra>;
  onIrPraNovo: (id: string) => void;
}) {
  return (
    <>
      <div className="grid-cards mb-6">
        <KpiCard rotulo="Encerradas" valor={fmtInt(kpis.qtdEncerradas)} icone="✅" accent="green" />
        <KpiCard rotulo="Abertas" valor={fmtInt(kpis.qtdAbertas)} icone="🌱" accent="orange" />
        <KpiCard rotulo="Custo Total" valor={fmtBRLShort(kpis.despesas)} icone="💸" accent="red" />
        <KpiCard rotulo="Receita Total" valor={fmtBRLShort(kpis.receitas)} icone="💵" accent="green" />
        <KpiCard
          rotulo="Lucro / ROI"
          valor={`${fmtBRLShort(kpis.lucro)} (${fmtPct(kpis.roi, 1)})`}
          icone="📈"
          accent={kpis.lucro >= 0 ? "green" : "red"}
        />
        <KpiCard rotulo="Area apurada" valor={`${fmtInt(kpis.area)} ha`} icone="📐" accent="blue" />
      </div>

      <h3 className="mb-3">Safras prontas para encerrar</h3>
      {safrasAbertas.length === 0 ? (
        <EmptyState
          icone="🌾"
          titulo="Nenhuma safra aberta"
          descricao="Quando houver safras com status aberta ou em planejamento, elas aparecerao aqui."
        />
      ) : (
        <div className="grid-cards-lg">
          {safrasAbertas.map((s) => {
            const agg = aggPorSafra.get(s.id);
            const lucroEstimado = (agg?.receitas || 0) - (agg?.despesas || 0);
            return (
              <div key={s.id} className="card">
                <div className="font-display font-semibold text-base mb-1">{s.nome}</div>
                <div className="text-xs mb-3" style={{ color: "var(--muted)" }}>
                  {s.fazendas?.nome} · {s.cultura} · {s.ano_agricola || "—"}
                </div>
                <div
                  className="grid gap-2 text-xs mb-3"
                  style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}
                >
                  <Info rotulo="📐 Area" valor={`${fmtInt(s.area_ha)} ha`} />
                  <Info rotulo="💸 Custo" valor={fmtBRLShort(agg?.despesas || 0)} />
                  <Info rotulo="💵 Receita" valor={fmtBRLShort(agg?.receitas || 0)} />
                  <Info
                    rotulo="📈 Lucro estimado"
                    valor={
                      <span style={{ color: lucroEstimado >= 0 ? "var(--success)" : "var(--danger)" }}>
                        {fmtBRLShort(lucroEstimado)}
                      </span>
                    }
                  />
                </div>
                <button type="button" className="btn-primary" onClick={() => onIrPraNovo(s.id)}>
                  Encerrar safra
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function ListaFechamentos({
  safrasEncerradas,
  aggPorSafra,
  gerarPDF,
}: {
  safrasEncerradas: SafraComFazenda[];
  aggPorSafra: Map<string, AggSafra>;
  gerarPDF: (id: string) => void;
}) {
  if (safrasEncerradas.length === 0) {
    return (
      <EmptyState
        icone="📋"
        titulo="Nenhum fechamento ainda"
        descricao="Encerre uma safra na aba Novo Fechamento para gerar o primeiro relatorio."
      />
    );
  }
  return (
    <div className="card overflow-x-auto" style={{ padding: 0 }}>
      <table className="tbl">
        <thead>
          <tr>
            <th>Safra</th>
            <th>Fazenda</th>
            <th>Cultura</th>
            <th>Colheita</th>
            <th style={{ textAlign: "right" }}>Area</th>
            <th style={{ textAlign: "right" }}>Producao</th>
            <th style={{ textAlign: "right" }}>Prod.</th>
            <th style={{ textAlign: "right" }}>Custo</th>
            <th style={{ textAlign: "right" }}>Receita</th>
            <th style={{ textAlign: "right" }}>Lucro</th>
            <th style={{ textAlign: "right" }}>ROI</th>
            <th style={{ textAlign: "center" }}>Acoes</th>
          </tr>
        </thead>
        <tbody>
          {safrasEncerradas.map((s) => {
            const agg = aggPorSafra.get(s.id);
            const custo = Number(s.custo_total || agg?.despesas || 0);
            const receita = Number(s.receita_total || agg?.receitas || 0);
            const lucro = receita - custo;
            const roi = custo > 0 ? (lucro / custo) * 100 : 0;
            return (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.nome}</td>
                <td>{s.fazendas?.nome || "—"}</td>
                <td>{s.cultura || "—"}</td>
                <td>{fmtData(s.data_colheita)}</td>
                <td style={{ textAlign: "right" }}>{fmtInt(s.area_ha)} ha</td>
                <td style={{ textAlign: "right" }}>{fmtInt(s.producao_sc)} sc</td>
                <td style={{ textAlign: "right" }}>{fmtInt(s.produtividade_sc_ha)} sc/ha</td>
                <td style={{ textAlign: "right", color: "var(--danger)" }}>{fmtBRLShort(custo)}</td>
                <td style={{ textAlign: "right", color: "var(--success)" }}>{fmtBRLShort(receita)}</td>
                <td
                  style={{
                    textAlign: "right",
                    fontWeight: 700,
                    color: lucro >= 0 ? "var(--success)" : "var(--danger)",
                  }}
                >
                  {fmtBRLShort(lucro)}
                </td>
                <td style={{ textAlign: "right", fontWeight: 700 }}>{fmtPct(roi, 1)}</td>
                <td style={{ textAlign: "center" }}>
                  <button type="button" className="btn-secondary" onClick={() => gerarPDF(s.id)}>
                    Ver PDF
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Comparativo({ dados }: { dados: { nome: string; custo: number; receita: number; lucro: number; roi: number }[] }) {
  if (dados.length === 0) {
    return (
      <EmptyState
        icone="📈"
        titulo="Nada para comparar ainda"
        descricao="Encerre safras para que apareçam neste grafico comparativo."
      />
    );
  }
  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}>
      <div className="card">
        <h3 className="mb-3">Custo vs Receita por Safra</h3>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={dados}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dde8da" />
              <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => fmtBRLShort(v)} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
              <Legend />
              <Bar dataKey="custo" fill="#e53935" name="Custo" />
              <Bar dataKey="receita" fill="#7CB342" name="Receita" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-3">ROI por Safra (%)</h3>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={dados}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dde8da" />
              <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
              <Line type="monotone" dataKey="roi" stroke="#6a1b9a" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ gridColumn: "1 / -1" }}>
        <h3 className="mb-3">Lucro por Safra</h3>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={dados}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dde8da" />
              <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => fmtBRLShort(v)} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
              <Bar dataKey="lucro" name="Lucro" fill="#1565c0" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function NovoFechamento({
  form,
  setForm,
  safrasAbertas,
  safraSelecionada,
  aggSafra,
  calculo,
  onEncerrar,
  salvando,
}: {
  form: FechamentoForm;
  setForm: (f: FechamentoForm) => void;
  safrasAbertas: SafraComFazenda[];
  safraSelecionada: SafraComFazenda | null;
  aggSafra: AggSafra | null;
  calculo: { producao: number; produtividade: number; custo: number; receita: number; lucro: number; roi: number } | null;
  onEncerrar: () => void;
  salvando: boolean;
}) {
  const despesasCat = aggSafra?.porCategoria.filter((c) => c.tipo === "despesa") || [];
  const totalDesp = despesasCat.reduce((a, c) => a + c.valor, 0);

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
      <div className="card">
        <h3 className="mb-4">Dados do Fechamento</h3>
        <div className="grid gap-3">
          <div>
            <label className="label">Safra a encerrar *</label>
            <select
              className="input"
              value={form.safra_id}
              onChange={(e) => {
                const novoId = e.target.value;
                const s = safrasAbertas.find((x) => x.id === novoId);
                // Autopreenche producao_sc / receita_total com os valores ja
                // registrados na safra (se houver). Nao sobrescreve se user ja
                // digitou algo no campo.
                setForm({
                  ...form,
                  safra_id: novoId,
                  producao_sc:
                    form.producao_sc ||
                    (s?.producao_sc && Number(s.producao_sc) > 0 ? String(s.producao_sc) : ""),
                  receita_total:
                    form.receita_total ||
                    (s?.receita_total && Number(s.receita_total) > 0 ? String(s.receita_total) : ""),
                });
              }}
            >
              <option value="">-- Selecione uma safra aberta --</option>
              {safrasAbertas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome} — {s.fazendas?.nome || "—"} ({s.cultura})
                </option>
              ))}
            </select>
          </div>

          {safraSelecionada && (
            <div
              className="text-xs"
              style={{
                background: "var(--green-bg)",
                padding: "10px 12px",
                borderRadius: "var(--r)",
                color: "var(--muted)",
              }}
            >
              <div>
                <strong>Area:</strong> {fmtInt(safraSelecionada.area_ha)} ha
              </div>
              <div>
                <strong>Plantio:</strong> {fmtData(safraSelecionada.data_plantio)} ·{" "}
                <strong>Colheita prevista:</strong> {fmtData(safraSelecionada.data_colheita)}
              </div>
            </div>
          )}

          <div>
            <label className="label">Producao total (sc) *</label>
            <input
              className="input"
              type="number"
              step="0.1"
              min="0"
              placeholder="0"
              value={form.producao_sc}
              onChange={(e) => setForm({ ...form, producao_sc: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Receita total (R$)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              placeholder={`Soma de receitas lancadas: ${fmtBRL(aggSafra?.receitas || 0)}`}
              value={form.receita_total}
              onChange={(e) => setForm({ ...form, receita_total: e.target.value })}
            />
            <div className="text-xs mt-1" style={{ color: "var(--dim)" }}>
              Deixe vazio para usar a soma dos lancamentos de receita ({fmtBRL(aggSafra?.receitas || 0)}).
            </div>
          </div>
          <div>
            <label className="label">Observacoes</label>
            <textarea
              className="input"
              rows={3}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>

          <button
            type="button"
            className="btn-primary mt-2"
            onClick={onEncerrar}
            disabled={!safraSelecionada || salvando}
          >
            {salvando ? "Encerrando..." : "Encerrar Safra"}
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4">Calculo do Fechamento</h3>
        {!calculo || !safraSelecionada ? (
          <div className="text-sm" style={{ color: "var(--muted)" }}>
            Selecione uma safra para visualizar o calculo.
          </div>
        ) : (
          <>
            <div
              className="grid gap-2 mb-4"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}
            >
              <Info rotulo="Producao" valor={`${fmtInt(calculo.producao)} sc`} />
              <Info rotulo="Produtividade" valor={`${fmtInt(calculo.produtividade)} sc/ha`} />
              <Info rotulo="Custo" valor={fmtBRLShort(calculo.custo)} />
              <Info rotulo="Receita" valor={fmtBRLShort(calculo.receita)} />
              <Info
                rotulo="Lucro Liquido"
                valor={
                  <span style={{ color: calculo.lucro >= 0 ? "var(--success)" : "var(--danger)" }}>
                    {fmtBRLShort(calculo.lucro)}
                  </span>
                }
              />
              <Info rotulo="ROI" valor={fmtPct(calculo.roi, 1)} />
            </div>

            <h3 className="mb-2 text-sm font-display" style={{ color: "var(--muted)" }}>
              Composicao de custos
            </h3>
            {despesasCat.length === 0 ? (
              <div className="text-sm" style={{ color: "var(--dim)" }}>
                Sem lancamentos de despesa vinculados a essa safra.
              </div>
            ) : (
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={despesasCat}
                      dataKey="valor"
                      nameKey="categoria"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(d: any) => `${((d.value / totalDesp) * 100).toFixed(0)}%`}
                    >
                      {despesasCat.map((_, i) => (
                        <Cell key={i} fill={CORES_PIZZA[i % CORES_PIZZA.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div>
      <div style={{ color: "var(--dim)", fontSize: 11 }}>{rotulo}</div>
      <div style={{ fontWeight: 600, color: "var(--text)" }}>{valor}</div>
    </div>
  );
}
