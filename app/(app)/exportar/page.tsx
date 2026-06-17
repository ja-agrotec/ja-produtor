"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Fazenda } from "@/lib/types";
import { hoje, fmtData } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import KpiCard from "@/components/ui/KpiCard";

type Relatorio = "lancamentos" | "safras" | "insumos" | "executivo";

const TODOS: { id: Relatorio; titulo: string; descricao: string; icone: string }[] = [
  {
    id: "lancamentos",
    titulo: "Lançamentos",
    descricao: "Receitas e despesas no período",
    icone: "📋",
  },
  {
    id: "safras",
    titulo: "Safras",
    descricao: "Custos, receitas e produtividade por safra",
    icone: "🌾",
  },
  {
    id: "insumos",
    titulo: "Insumos",
    descricao: "Estoque atual com alertas de mínimo",
    icone: "🧪",
  },
  {
    id: "executivo",
    titulo: "Relatório Executivo",
    descricao: "Consolidado por fazenda (KPIs)",
    icone: "📊",
  },
];

export default function ExportarPage() {
  const [fazendas, setFazendas] = useState<Pick<Fazenda, "id" | "nome">[]>([]);
  const [selecionados, setSelecionados] = useState<Record<Relatorio, boolean>>({
    lancamentos: true,
    safras: true,
    insumos: true,
    executivo: true,
  });
  const [fazendaId, setFazendaId] = useState("");
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date(new Date().getFullYear(), 0, 1);
    return d.toISOString().slice(0, 10);
  });
  const [dataFim, setDataFim] = useState(hoje());
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = getSupabase();
      const r = await sb
        .from("fazendas")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (!r.error) setFazendas(r.data || []);
    })();
  }, []);

  function toggle(id: Relatorio) {
    setSelecionados((s) => ({ ...s, [id]: !s[id] }));
  }

  async function gerar() {
    const escolhidos = (Object.keys(selecionados) as Relatorio[]).filter(
      (k) => selecionados[k],
    );
    if (!escolhidos.length) {
      toast.error("Escolha pelo menos 1 relatório");
      return;
    }

    setGerando(true);
    // Dynamic import: XLSX (~96kB) so carrega quando o user clica em Exportar
    const XLSX = await import("xlsx");
    const sb = getSupabase();
    const wb = XLSX.utils.book_new();

    try {
      for (const rel of escolhidos) {
        if (rel === "lancamentos") {
          let q = sb
            .from("lancamentos")
            .select(
              "data_lancamento, fazendas(nome), safras(nome), talhoes(nome), categorias(nome), tipo, descricao, quantidade, unidade, custo_unitario, custo_total, nota_fiscal, operadores(nome), maquinas(nome), status",
            )
            .neq("status", "cancelado")
            .order("data_lancamento");
          if (fazendaId) q = q.eq("fazenda_id", fazendaId);
          if (dataInicio) q = q.gte("data_lancamento", dataInicio);
          if (dataFim) q = q.lte("data_lancamento", dataFim);
          const { data, error } = await q;
          if (error) throw error;
          const rows = (data || []).map((l: any) => ({
            Data: fmtData(l.data_lancamento),
            Fazenda: l.fazendas?.nome || "",
            Safra: l.safras?.nome || "",
            Talhao: l.talhoes?.nome || "",
            Categoria: l.categorias?.nome || "",
            Tipo: l.tipo,
            Descricao: l.descricao || "",
            Quantidade: l.quantidade ?? "",
            Unidade: l.unidade || "",
            "Custo Unitario": l.custo_unitario ?? "",
            "Custo Total": l.custo_total ?? "",
            "Nota Fiscal": l.nota_fiscal || "",
            Operador: l.operadores?.nome || "",
            Maquina: l.maquinas?.nome || "",
            Status: l.status,
          }));
          const ws = XLSX.utils.json_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, "Lancamentos");
        }

        if (rel === "safras") {
          let q = sb
            .from("safras")
            .select(
              "nome, fazendas(nome), cultura, ano_agricola, data_plantio, data_colheita, area_ha, producao_sc, produtividade_sc_ha, custo_total, receita_total, status",
            )
            .order("nome");
          if (fazendaId) q = q.eq("fazenda_id", fazendaId);
          const { data, error } = await q;
          if (error) throw error;
          const rows = (data || []).map((s: any) => ({
            Safra: s.nome,
            Fazenda: s.fazendas?.nome || "",
            Cultura: s.cultura,
            "Ano Agricola": s.ano_agricola || "",
            Plantio: fmtData(s.data_plantio),
            Colheita: fmtData(s.data_colheita),
            "Area (ha)": s.area_ha ?? "",
            "Producao (sc)": s.producao_sc ?? "",
            "Produtividade (sc/ha)": s.produtividade_sc_ha ?? "",
            "Custo Total": s.custo_total ?? 0,
            "Receita Total": s.receita_total ?? 0,
            Resultado: (s.receita_total || 0) - (s.custo_total || 0),
            Status: s.status,
          }));
          const ws = XLSX.utils.json_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, "Safras");
        }

        if (rel === "insumos") {
          let q = sb
            .from("insumos")
            .select(
              "nome, fazendas(nome), categoria, unidade, principio_ativo, fabricante, estoque_atual, estoque_minimo, preco_unitario",
            )
            .eq("ativo", true)
            .order("nome");
          if (fazendaId) q = q.eq("fazenda_id", fazendaId);
          const { data, error } = await q;
          if (error) throw error;
          const rows = (data || []).map((i: any) => {
            const baixo = (i.estoque_atual || 0) <= (i.estoque_minimo || 0);
            return {
              Insumo: i.nome,
              Fazenda: i.fazendas?.nome || "",
              Categoria: i.categoria || "",
              Unidade: i.unidade,
              "Principio Ativo": i.principio_ativo || "",
              Fabricante: i.fabricante || "",
              "Estoque Atual": i.estoque_atual ?? 0,
              "Estoque Minimo": i.estoque_minimo ?? 0,
              "Preco Unit.": i.preco_unitario ?? 0,
              "Valor Total":
                (i.estoque_atual || 0) * (i.preco_unitario || 0),
              "Status Estoque": baixo ? "CRITICO" : "OK",
            };
          });
          const ws = XLSX.utils.json_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, "Insumos");
        }

        if (rel === "executivo") {
          // Tenta vw_dashboard; se não existir, monta consolidação manual
          let rows: any[] = [];
          const v = await sb.from("vw_dashboard").select("*");
          if (!v.error && v.data) {
            rows = (v.data || []).map((f: any) => ({
              Fazenda: f.fazenda_nome,
              "Talhoes Ativos": f.total_talhoes || 0,
              "Safras Abertas": f.safras_abertas || 0,
              "Total Lancamentos": f.total_lancamentos || 0,
              "Total Despesas": f.total_despesas || 0,
              "Total Receitas": f.total_receitas || 0,
              Resultado: (f.total_receitas || 0) - (f.total_despesas || 0),
              "Insumos Criticos": f.insumos_baixo_estoque || 0,
              "Maquinas Ativas": f.maquinas_ativas || 0,
            }));
          } else {
            // Fallback simples — só lista fazendas
            const fz = await sb
              .from("fazendas")
              .select("nome, area_total_ha, cidade, estado")
              .eq("ativo", true)
              .order("nome");
            rows = (fz.data || []).map((f: any) => ({
              Fazenda: f.nome,
              "Area (ha)": f.area_total_ha ?? "",
              Cidade: f.cidade || "",
              UF: f.estado || "",
            }));
          }
          const ws = XLSX.utils.json_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, "Executivo");
        }
      }

      const nomeArq = `ja-agrotec_export_${hoje()}.xlsx`;
      XLSX.writeFile(wb, nomeArq);
      toast.success(`Arquivo "${nomeArq}" gerado!`);
    } catch (e: any) {
      toast.error("Erro ao gerar: " + (e.message || String(e)));
    } finally {
      setGerando(false);
    }
  }

  const totalSelecionados = (Object.values(selecionados) as boolean[]).filter(
    Boolean,
  ).length;

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Exportar Dados"
        icone="📤"
        subtitulo="Gere planilhas Excel com os relatórios da operação"
        acoes={
          <button
            className="btn-primary"
            onClick={gerar}
            disabled={gerando || totalSelecionados === 0}
          >
            {gerando ? "Gerando..." : `⬇ Exportar (${totalSelecionados})`}
          </button>
        }
      />

      <div className="grid-cards">
        <KpiCard
          rotulo="Relatórios selecionados"
          valor={totalSelecionados}
          icone="✅"
          accent="green"
        />
        <KpiCard
          rotulo="Formato"
          valor=".xlsx"
          icone="📊"
          accent="blue"
          hint="Excel / Google Sheets"
        />
        <KpiCard
          rotulo="Saída"
          valor="1 arquivo"
          icone="📦"
          accent="purple"
          hint="1 aba por relatório"
        />
      </div>

      <div className="card space-y-4">
        <h3>Filtros</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Fazenda</label>
            <select
              className="input"
              value={fazendaId}
              onChange={(e) => setFazendaId(e.target.value)}
            >
              <option value="">Todas</option>
              {fazendas.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">De</label>
            <input
              className="input"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Até</label>
            <input
              className="input"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)" }}>
          Filtros de data se aplicam apenas a <b>Lançamentos</b>. Fazenda filtra
          Lançamentos, Safras e Insumos.
        </p>
      </div>

      <div className="card">
        <h3 className="mb-3">Selecione os relatórios</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TODOS.map((r) => {
            const ativo = selecionados[r.id];
            return (
              <label
                key={r.id}
                className="card"
                style={{
                  cursor: "pointer",
                  borderColor: ativo ? "#22c55e" : "var(--brd)",
                  borderWidth: 2,
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  margin: 0,
                  background: ativo ? "var(--green-bg, #e8f5e9)" : "#fff",
                }}
              >
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={() => toggle(r.id)}
                  style={{ marginTop: 4 }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{ fontSize: 24, marginBottom: 4 }}
                  >
                    {r.icone}
                  </div>
                  <strong>{r.titulo}</strong>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--muted)",
                      marginTop: 4,
                    }}
                  >
                    {r.descricao}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
