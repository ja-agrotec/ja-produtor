"use client";

// ============================================================
// Tela principal do Operador.
// Foco: criar lancamento (offline-first) + ver o que ele lancou hoje.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase";
import { fmtBRL, fmtData, hoje } from "@/lib/format";
import { UNIDADES_PADRAO } from "@/lib/utils";
import { lerCache, type ReferenciasCache } from "@/lib/operador-cache";
import {
  enfileirar,
  emConexaoReal,
  tamanhoFila,
  EVT_QUEUE_CHANGED,
} from "@/lib/offline";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";

// Mapping reusado do /lancamentos do produtor — define quais
// categorias_lancamento esperam insumo e quais nao usam.
const CATEGORIAS_COM_INSUMO: Record<string, string[]> = {
  defensivos: ["defensivo", "herbicida", "fungicida", "inseticida", "acaricida", "nematicida", "bactericida", "agrotoxico"],
  fertilizantes: ["fertilizante", "adubo", "calcario", "corretivo", "macronutriente", "micronutriente", "foliar"],
  sementes: ["semente", "muda"],
};
function normCat(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}
function categoriaUsaInsumo(nome: string): string[] | null {
  return CATEGORIAS_COM_INSUMO[normCat(nome)] || null;
}
function insumoCompat(insCat: string | null | undefined, aceitas: string[]): boolean {
  if (!insCat) return true;
  const ic = normCat(insCat);
  return aceitas.some((a) => ic.includes(a) || a.includes(ic));
}

type FormState = {
  categoria_id: string;
  tipo: "despesa" | "receita";
  data_lancamento: string;
  descricao: string;
  insumo_id: string;
  quantidade: string;
  unidade: string;
  custo_unitario: string;
  custo_total: string;
  talhao_id: string;
  safra_id: string;
  operador_id: string;
  maquina_id: string;
  nota_fiscal: string;
  observacoes: string;
};

const VAZIO: FormState = {
  categoria_id: "",
  tipo: "despesa",
  data_lancamento: hoje(),
  descricao: "",
  insumo_id: "",
  quantidade: "",
  unidade: "",
  custo_unitario: "",
  custo_total: "",
  talhao_id: "",
  safra_id: "",
  operador_id: "",
  maquina_id: "",
  nota_fiscal: "",
  observacoes: "",
};

export default function OperadorHomePage() {
  const [cache, setCache] = useState<ReferenciasCache>(lerCache());
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<FormState>(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [filaCount, setFilaCount] = useState(0);
  const [meusLancHoje, setMeusLancHoje] = useState<any[]>([]);
  const [avisoCertificacao, setAvisoCertificacao] = useState<string | null>(null);

  useEffect(() => {
    setCache(lerCache());
    setFilaCount(tamanhoFila());
    void recarregarMeusLancHoje();
    const onQ = () => {
      setFilaCount(tamanhoFila());
      void recarregarMeusLancHoje();
    };
    window.addEventListener(EVT_QUEUE_CHANGED, onQ as any);
    return () => window.removeEventListener(EVT_QUEUE_CHANGED, onQ as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recarregarMeusLancHoje = useCallback(async () => {
    const c = lerCache();
    if (!c.perfil) return;
    if (!(await emConexaoReal())) return; // offline: nao tem como ler historico
    const sb = getSupabase();
    const r = await sb
      .from("lancamentos")
      .select("id, descricao, tipo, custo_total, data_lancamento, criado_em, categorias_lancamento:categoria_id(nome)")
      .eq("fazenda_id", c.perfil.fazenda_id)
      .gte("criado_em", hoje() + "T00:00:00")
      .order("criado_em", { ascending: false })
      .limit(20);
    if (!r.error) setMeusLancHoje(r.data || []);
  }, []);

  const categoriaSel = useMemo(
    () => cache.categorias.find((c) => c.id === form.categoria_id),
    [cache.categorias, form.categoria_id],
  );
  const categoriaPrecisaInsumo = useMemo(() => {
    if (!categoriaSel) return true;
    return categoriaUsaInsumo(categoriaSel.nome) !== null;
  }, [categoriaSel]);

  const insumosFiltrados = useMemo(() => {
    if (!categoriaSel) return cache.insumos;
    const aceitas = categoriaUsaInsumo(categoriaSel.nome);
    if (aceitas === null) return [];
    return cache.insumos.filter((i) => insumoCompat(i.categoria, aceitas));
  }, [cache.insumos, categoriaSel]);

  const talhoesDaSafra = useMemo(() => {
    if (!form.safra_id) return cache.talhoes;
    const naSafra = cache.talhoes.filter((t) => t.safra_id === form.safra_id);
    return naSafra.length > 0 ? naSafra : cache.talhoes;
  }, [cache.talhoes, form.safra_id]);

  // Filtra categorias compativeis com o tipo
  const categoriasForm = useMemo(
    () => cache.categorias.filter((c) => !c.tipo || c.tipo === form.tipo),
    [cache.categorias, form.tipo],
  );

  // Insumo selecionado (objeto completo do cache)
  const insumoSel = useMemo(
    () => cache.insumos.find((i) => i.id === form.insumo_id),
    [cache.insumos, form.insumo_id],
  );

  // Info de estoque ao escolher insumo + quantidade
  // Cache pode estar defasado (sync mais antiga), mas eh o melhor que tem offline.
  const estoqueInfo = useMemo(() => {
    if (!insumoSel || !form.quantidade) return null;
    const atual = Number(insumoSel.estoque_atual ?? 0);
    const qtd = Number(form.quantidade);
    if (isNaN(qtd) || qtd <= 0) return null;
    const apos = atual - qtd;
    return {
      atual,
      qtd,
      apos,
      suficiente: apos >= 0,
      proximoMin: insumoSel.estoque_minimo != null && apos <= Number(insumoSel.estoque_minimo),
    };
  }, [insumoSel, form.quantidade]);

  // Aviso de certificacao: paridade com /lancamentos do produtor
  useEffect(() => {
    if (!form.talhao_id || !form.insumo_id) {
      setAvisoCertificacao(null);
      return;
    }
    const tal = cache.talhoes.find((t) => t.id === form.talhao_id);
    const ins = cache.insumos.find((i) => i.id === form.insumo_id);
    if (!tal || !ins) {
      setAvisoCertificacao(null);
      return;
    }
    if (tal.segue_certificacao && ins.certificacao_permitida === false) {
      setAvisoCertificacao(
        `O talhão "${tal.nome}" segue regras de certificação e o insumo "${ins.nome}" NÃO é permitido. Você pode salvar mesmo assim, mas a operação será marcada como não conforme.`,
      );
    } else {
      setAvisoCertificacao(null);
    }
  }, [form.talhao_id, form.insumo_id, cache.talhoes, cache.insumos]);

  function abrirNovo() {
    setForm({
      ...VAZIO,
      operador_id: cache.perfil?.operador_id || "",
    });
    setModalAberto(true);
  }

  // Ao mudar tipo, mantem categoria so se for compativel
  function onChangeTipo(novoTipo: "despesa" | "receita") {
    let novaCat = form.categoria_id;
    if (novaCat) {
      const cat = cache.categorias.find((c) => c.id === novaCat);
      if (cat?.tipo && cat.tipo !== novoTipo) novaCat = "";
    }
    setForm((f) => ({ ...f, tipo: novoTipo, categoria_id: novaCat }));
  }

  function onChangeCategoria(catId: string) {
    const cat = cache.categorias.find((c) => c.id === catId);
    const novoTipo = (cat?.tipo as "despesa" | "receita") || form.tipo;
    let novoInsumo = form.insumo_id;
    if (catId && cat) {
      const aceitas = categoriaUsaInsumo(cat.nome);
      if (aceitas === null) novoInsumo = "";
      else if (novoInsumo) {
        const ins = cache.insumos.find((i) => i.id === novoInsumo);
        if (!insumoCompat(ins?.categoria, aceitas)) novoInsumo = "";
      }
    }
    setForm((f) => ({ ...f, categoria_id: catId, tipo: novoTipo, insumo_id: novoInsumo }));
  }

  function onChangeInsumo(insId: string) {
    const ins = cache.insumos.find((i) => i.id === insId);
    setForm((f) => {
      const novoCustoUnit = ins?.preco_unitario != null ? String(ins.preco_unitario) : f.custo_unitario;
      const q = Number(f.quantidade);
      const u = Number(novoCustoUnit);
      const novoTotal = !isNaN(q) && !isNaN(u) && q > 0 && u > 0 ? (q * u).toFixed(2) : f.custo_total;
      return {
        ...f,
        insumo_id: insId,
        unidade: ins?.unidade || f.unidade,
        custo_unitario: novoCustoUnit,
        custo_total: novoTotal,
        descricao: f.descricao || ins?.nome || "",
      };
    });
  }

  function recalc(qtd: string, custoUnit: string) {
    const q = Number(qtd);
    const u = Number(custoUnit);
    if (!isNaN(q) && !isNaN(u) && q > 0 && u > 0) {
      setForm((f) => ({ ...f, quantidade: qtd, custo_unitario: custoUnit, custo_total: (q * u).toFixed(2) }));
    } else {
      setForm((f) => ({ ...f, quantidade: qtd, custo_unitario: custoUnit }));
    }
  }

  async function salvar() {
    if (!cache.perfil) { toast.error("Sessao invalida"); return; }
    if (!form.categoria_id) { toast.error("Selecione a categoria"); return; }
    const total = Number(form.custo_total);
    if (!form.custo_total || isNaN(total) || total <= 0) { toast.error("Informe o custo total"); return; }

    setSalvando(true);
    try {
      const payload: any = {
        fazenda_id: cache.perfil.fazenda_id,
        safra_id: form.safra_id || null,
        talhao_id: form.talhao_id || null,
        categoria_id: form.categoria_id,
        tipo: form.tipo,
        data_lancamento: form.data_lancamento,
        descricao: form.descricao.trim() || null,
        insumo_id: form.insumo_id || null,
        quantidade: form.quantidade ? Number(form.quantidade) : null,
        unidade: form.unidade || null,
        custo_unitario: form.custo_unitario ? Number(form.custo_unitario) : null,
        custo_total: total,
        operador_id: form.operador_id || cache.perfil.operador_id || null,
        maquina_id: form.maquina_id || null,
        nota_fiscal: form.nota_fiscal.trim() || null,
        observacoes: form.observacoes.trim() || null,
        usuario_id: cache.perfil.usuario_id,
      };

      const ok = await emConexaoReal(3000);
      if (!ok) {
        enfileirar({
          tabela: "lancamentos",
          payload,
          modulo: "operador",
          tipo: form.tipo,
          descricao: form.descricao || categoriaSel?.nome,
          valor: total,
        });
        toast.info("Sem conexao — gravado offline. Sera enviado ao voltar.");
        setModalAberto(false);
        return;
      }
      const sb = getSupabase();
      const r = await sb.from("lancamentos").insert(payload);
      if (r.error) {
        const msg = String(r.error.message || "").toLowerCase();
        if (msg.includes("fetch") || msg.includes("network")) {
          enfileirar({ tabela: "lancamentos", payload, modulo: "operador", tipo: form.tipo, descricao: form.descricao, valor: total });
          toast.warning("Conexao instavel — gravado offline");
        } else {
          toast.error("Erro: " + r.error.message);
          return;
        }
      } else {
        toast.success("Lançamento registrado");
      }
      setModalAberto(false);
      void recarregarMeusLancHoje();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Bem-vindo + botao gigante */}
      <div className="card">
        <h1 className="mb-2">Olá, {cache.perfil?.nome.split(" ")[0] || "operador"}</h1>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
          {filaCount > 0
            ? `📤 ${filaCount} lançamento(s) aguardando envio`
            : "Tudo sincronizado"}
        </p>
        <button
          className="btn-primary w-full"
          style={{ padding: "16px 20px", fontSize: 18 }}
          onClick={abrirNovo}
        >
          ➕ Novo Lançamento
        </button>
      </div>

      {/* Lista de hoje */}
      <div className="card">
        <h3 className="mb-3">Lançamentos de hoje</h3>
        {meusLancHoje.length === 0 ? (
          <EmptyState
            icone="📋"
            titulo="Nada hoje ainda"
            descricao="Clique em + Novo Lançamento pra registrar a primeira atividade do dia."
          />
        ) : (
          <ul className="space-y-2">
            {meusLancHoje.map((l) => (
              <li
                key={l.id}
                className="flex justify-between items-center py-2"
                style={{ borderBottom: "1px solid var(--brd)" }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {l.descricao || l.categorias_lancamento?.nome || "—"}
                  </div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>
                    {l.categorias_lancamento?.nome} · {fmtData(l.data_lancamento)}
                  </div>
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    color: l.tipo === "despesa" ? "var(--danger)" : "var(--success)",
                  }}
                >
                  {fmtBRL(l.custo_total)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        titulo="Novo Lançamento"
        larguraMax={520}
        rodape={
          <>
            <button className="btn-ghost" onClick={() => setModalAberto(false)}>Cancelar</button>
            <button className="btn-primary" onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo</label>
              <select
                className="input"
                value={form.tipo}
                onChange={(e) => onChangeTipo(e.target.value as "despesa" | "receita")}
              >
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
              </select>
            </div>
            <div>
              <label className="label">Data *</label>
              <input
                type="date"
                className="input"
                value={form.data_lancamento}
                onChange={(e) => setForm({ ...form, data_lancamento: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">Categoria *</label>
            <select className="input" value={form.categoria_id} onChange={(e) => onChangeCategoria(e.target.value)}>
              <option value="">-- Selecione --</option>
              {categoriasForm.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          {categoriaPrecisaInsumo && (
            <div>
              <label className="label">
                Insumo
                {form.categoria_id && (
                  <span style={{ color: "var(--dim)", fontWeight: 400, marginLeft: 6 }}>
                    (compatíveis com a categoria)
                  </span>
                )}
              </label>
              <select className="input" value={form.insumo_id} onChange={(e) => onChangeInsumo(e.target.value)}>
                <option value="">Nenhum</option>
                {insumosFiltrados.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nome}{i.categoria ? ` — ${i.categoria}` : ""}
                  </option>
                ))}
              </select>
              {form.categoria_id && insumosFiltrados.length === 0 && (
                <div className="text-xs mt-1" style={{ color: "var(--warn)" }}>
                  Nenhum insumo desta categoria no cache. Pode salvar sem insumo.
                </div>
              )}
              {/* Indicador de estoque ao escolher insumo + quantidade */}
              {estoqueInfo && (
                <div
                  className="text-xs mt-1.5 p-2 rounded-ja"
                  style={{
                    background: estoqueInfo.suficiente
                      ? (estoqueInfo.proximoMin ? "var(--warn-lt)" : "var(--green-bg)")
                      : "var(--danger-lt)",
                    color: estoqueInfo.suficiente
                      ? (estoqueInfo.proximoMin ? "var(--warn)" : "var(--success)")
                      : "var(--danger)",
                    fontWeight: 600,
                  }}
                >
                  Estoque atual: {estoqueInfo.atual} {insumoSel?.unidade || ""} ·
                  {" "}Após este lançamento: {estoqueInfo.apos.toFixed(2)} {insumoSel?.unidade || ""}
                  {!estoqueInfo.suficiente && " ⚠️ estoque ficará negativo"}
                  {estoqueInfo.suficiente && estoqueInfo.proximoMin && " ⚠️ abaixo do mínimo"}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Safra</label>
              <select
                className="input"
                value={form.safra_id}
                onChange={(e) => setForm({ ...form, safra_id: e.target.value, talhao_id: "" })}
              >
                <option value="">—</option>
                {cache.safras.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Talhão</label>
              <select
                className="input"
                value={form.talhao_id}
                onChange={(e) => setForm({ ...form, talhao_id: e.target.value })}
              >
                <option value="">—</option>
                {talhoesDaSafra.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label">Qtd</label>
              <input
                type="number" step="0.01" min="0" className="input"
                value={form.quantidade}
                onChange={(e) => recalc(e.target.value, form.custo_unitario)}
              />
            </div>
            <div>
              <label className="label">Un.</label>
              <select className="input" value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })}>
                <option value="">--</option>
                {UNIDADES_PADRAO.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="label">R$ Unit</label>
              <input
                type="number" step="0.01" min="0" className="input"
                value={form.custo_unitario}
                onChange={(e) => recalc(form.quantidade, e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Custo Total (R$) *</label>
            <input
              type="number" step="0.01" min="0" className="input"
              value={form.custo_total}
              onChange={(e) => setForm({ ...form, custo_total: e.target.value })}
              style={{ fontSize: 18, fontWeight: 600 }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Máquina</label>
              <select
                className="input"
                value={form.maquina_id}
                onChange={(e) => setForm({ ...form, maquina_id: e.target.value })}
              >
                <option value="">—</option>
                {cache.maquinas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Operador</label>
              <select
                className="input"
                value={form.operador_id}
                onChange={(e) => setForm({ ...form, operador_id: e.target.value })}
              >
                <option value="">—</option>
                {cache.operadores.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Descrição</label>
              <input
                className="input"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex: Aplicação de calcário no talhão Norte"
              />
            </div>
            <div className="col-span-2">
              <label className="label">Nota Fiscal</label>
              <input
                className="input"
                value={form.nota_fiscal}
                onChange={(e) => setForm({ ...form, nota_fiscal: e.target.value })}
                placeholder="Número da NF (opcional)"
              />
            </div>
          </div>

          <div>
            <label className="label">Observações</label>
            <textarea
              className="input"
              rows={2}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>

          {/* Aviso de certificacao (warn-only, nao bloqueia) */}
          {avisoCertificacao && (
            <div
              className="p-3 rounded-ja text-sm"
              style={{
                background: "var(--warn-lt)",
                border: "1px solid var(--warn)",
                color: "var(--warn)",
              }}
            >
              ⚠️ {avisoCertificacao}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
