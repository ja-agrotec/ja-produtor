"use client";

// Wizard de primeiro acesso. Conduz o usuario novo pelos 3 cadastros
// minimos pra ter o sistema usavel: 1 fazenda, 1 talhao, 1 safra.
// Detectado pelo layout via contagem de fazendas == 0.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { CULTURAS_PADRAO, ESTADOS_BR, setFazendaSelecionada } from "@/lib/utils";

type Passo = "boas-vindas" | "fazenda" | "talhao" | "safra" | "fim";

const ORDEM: Passo[] = ["boas-vindas", "fazenda", "talhao", "safra", "fim"];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [passo, setPasso] = useState<Passo>("boas-vindas");
  const [salvando, setSalvando] = useState(false);
  const [aceiteTermos, setAceiteTermos] = useState(false);

  // IDs criados a cada passo (precisamos pra criar o filho)
  const [fazendaId, setFazendaId] = useState<string>("");
  const [talhaoId, setTalhaoId] = useState<string>("");

  // Form fazenda
  const [fazNome, setFazNome] = useState("");
  const [fazCidade, setFazCidade] = useState("");
  const [fazEstado, setFazEstado] = useState("MG");
  const [fazArea, setFazArea] = useState("");

  // Form talhao
  const [talNome, setTalNome] = useState("Talhao 1");
  const [talArea, setTalArea] = useState("");
  const [talCultura, setTalCultura] = useState("CAFÉ");

  // Form safra
  const [safNome, setSafNome] = useState("");
  const [safCultura, setSafCultura] = useState("CAFÉ");
  const [safAno, setSafAno] = useState(String(new Date().getFullYear()));
  const [safDataPlantio, setSafDataPlantio] = useState(
    new Date().toISOString().substring(0, 10),
  );

  // Redireciona se nao logado
  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  // Detecta se ja tem fazenda (caso user esteja avancando passo a passo)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const sb = getSupabase();
      const r = await sb.from("fazendas").select("id, nome").limit(1);
      if (r.data && r.data.length > 0) {
        // Ja tem fazenda; pula direto pra home (caso user navegue manualmente)
        router.push("/home");
      }
    })();
  }, [user, router]);

  const idxAtual = ORDEM.indexOf(passo);
  const progresso = (idxAtual / (ORDEM.length - 1)) * 100;

  function podeAvancar(): boolean {
    if (passo === "boas-vindas") return aceiteTermos;
    if (passo === "fazenda") return fazNome.trim().length > 0;
    if (passo === "talhao") return talNome.trim().length > 0 && !!talArea && Number(talArea) > 0;
    if (passo === "safra") return safNome.trim().length > 0 && !!safCultura;
    return true;
  }

  async function avancar() {
    if (passo === "boas-vindas") {
      if (!aceiteTermos) return;
      // Registra aceite no banco
      const sb = getSupabase();
      if (user) {
        await sb
          .from("usuarios")
          .update({ termos_aceitos_em: new Date().toISOString() })
          .eq("auth_id", user.id);
      }
      setPasso("fazenda");
      return;
    }
    if (passo === "fazenda") {
      setSalvando(true);
      const sb = getSupabase();
      // Pega usuarios.id pra criado_por
      let criadoPor: string | null = null;
      if (user) {
        const rU = await sb.from("usuarios").select("id").eq("auth_id", user.id).maybeSingle();
        criadoPor = rU.data?.id || null;
      }
      const r = await sb
        .from("fazendas")
        .insert({
          nome: fazNome.trim(),
          cidade: fazCidade.trim() || null,
          estado: fazEstado || null,
          area_total_ha: fazArea ? Number(fazArea) : null,
          ativo: true,
          criado_por: criadoPor,
        })
        .select("id")
        .single();
      setSalvando(false);
      if (r.error || !r.data) {
        toast.error("Erro ao criar fazenda: " + (r.error?.message || ""));
        return;
      }
      setFazendaId(r.data.id);
      setFazendaSelecionada(r.data.id);
      setSafNome(`Safra ${safCultura} ${safAno}`);
      setPasso("talhao");
      return;
    }
    if (passo === "talhao") {
      setSalvando(true);
      const sb = getSupabase();
      const r = await sb
        .from("talhoes")
        .insert({
          fazenda_id: fazendaId,
          nome: talNome.trim(),
          area_ha: Number(talArea),
          cultura_atual: talCultura || null,
          ativo: true,
        })
        .select("id")
        .single();
      setSalvando(false);
      if (r.error || !r.data) {
        toast.error("Erro ao criar talhao: " + (r.error?.message || ""));
        return;
      }
      setTalhaoId(r.data.id);
      if (!safCultura) setSafCultura(talCultura);
      setSafNome(`Safra ${talCultura} ${safAno}`);
      setPasso("safra");
      return;
    }
    if (passo === "safra") {
      setSalvando(true);
      const sb = getSupabase();
      const r = await sb.from("safras").insert({
        fazenda_id: fazendaId,
        nome: safNome.trim(),
        cultura: safCultura,
        ano_agricola: safAno,
        data_plantio: safDataPlantio || null,
        area_ha: talArea ? Number(talArea) : null,
        status: "aberta",
      });
      setSalvando(false);
      if (r.error) {
        toast.error("Erro ao criar safra: " + r.error.message);
        return;
      }
      setPasso("fim");
      return;
    }
    if (passo === "fim") {
      try {
        localStorage.setItem("ja_onboarding_concluido", "1");
      } catch {
        /* ignore */
      }
      router.push("/home");
    }
  }

  function pular() {
    try {
      localStorage.setItem("ja_onboarding_pulado", "1");
    } catch {
      /* ignore */
    }
    router.push("/home");
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: "var(--muted)" }}>
        Carregando...
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg,#f7faf3 0%,#e8f0e0 100%)" }}
    >
      <div className="w-full max-w-2xl">
        {/* Barra de progresso */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
              Passo {Math.min(idxAtual + 1, ORDEM.length)} de {ORDEM.length}
            </span>
            <button
              type="button"
              onClick={pular}
              className="text-xs"
              style={{ color: "var(--dim)", textDecoration: "underline" }}
            >
              Pular onboarding
            </button>
          </div>
          <div className="w-full h-2 rounded-full" style={{ background: "var(--brd)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progresso}%`, background: "var(--green)" }}
            />
          </div>
        </div>

        <div className="card">
          {passo === "boas-vindas" && (
            <PassoBoasVindas
              aceiteTermos={aceiteTermos}
              setAceiteTermos={setAceiteTermos}
            />
          )}

          {passo === "fazenda" && (
            <PassoFazenda
              nome={fazNome} setNome={setFazNome}
              cidade={fazCidade} setCidade={setFazCidade}
              estado={fazEstado} setEstado={setFazEstado}
              area={fazArea} setArea={setFazArea}
            />
          )}

          {passo === "talhao" && (
            <PassoTalhao
              nome={talNome} setNome={setTalNome}
              area={talArea} setArea={setTalArea}
              cultura={talCultura} setCultura={setTalCultura}
            />
          )}

          {passo === "safra" && (
            <PassoSafra
              nome={safNome} setNome={setSafNome}
              cultura={safCultura} setCultura={setSafCultura}
              ano={safAno} setAno={setSafAno}
              dataPlantio={safDataPlantio} setDataPlantio={setSafDataPlantio}
            />
          )}

          {passo === "fim" && <PassoFim />}

          <div className="flex justify-end gap-2 mt-6 pt-4" style={{ borderTop: "1px solid var(--brd)" }}>
            {passo !== "boas-vindas" && passo !== "fim" && (
              <button
                type="button"
                className="btn-ghost"
                disabled={salvando}
                onClick={() => {
                  const i = ORDEM.indexOf(passo);
                  if (i > 0) setPasso(ORDEM[i - 1]);
                }}
              >
                Voltar
              </button>
            )}
            <button
              type="button"
              className="btn-primary"
              onClick={avancar}
              disabled={salvando || !podeAvancar()}
            >
              {salvando
                ? "Salvando..."
                : passo === "boas-vindas"
                  ? "Comecar"
                  : passo === "fim"
                    ? "Ir pra home"
                    : "Avancar"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--dim)" }}>
          <Link href="/termos">Termos</Link> · <Link href="/privacidade">Privacidade</Link>
        </p>
      </div>
    </div>
  );
}

function PassoBoasVindas({
  aceiteTermos,
  setAceiteTermos,
}: {
  aceiteTermos: boolean;
  setAceiteTermos: (v: boolean) => void;
}) {
  return (
    <div>
      <div className="text-center mb-4">
        <div style={{ fontSize: 64 }}>🌾</div>
        <h1 className="font-display text-2xl mt-2" style={{ color: "var(--dark)" }}>
          Bem-vindo ao JA Agrotec
        </h1>
        <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
          Sua plataforma de gestao agropecuaria pronta pra usar.
        </p>
      </div>

      <div
        className="rounded-ja p-4 mb-4"
        style={{ background: "var(--green-bg)" }}
      >
        <div className="font-semibold mb-2" style={{ color: "var(--dark)" }}>
          📌 Como o sistema funciona
        </div>
        <ul className="text-sm space-y-1.5" style={{ color: "var(--muted)" }}>
          <li>🏞️ <b>Fazenda</b> e sua propriedade rural cadastrada</li>
          <li>📐 <b>Talhoes</b> sao as areas de plantio dentro da fazenda</li>
          <li>🌱 <b>Safra</b> agrupa lancamentos, custos e receitas do mesmo ciclo</li>
          <li>📋 <b>Lancamentos</b> registram cada despesa (insumo, mao-de-obra) e receita</li>
          <li>💵 <b>Vendas</b> controlam contratos de graos e entregas</li>
          <li>📈 <b>Fechamento</b> apura ROI, custo/ha e gera PDF da safra</li>
        </ul>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 rounded" style={{ background: "var(--green-bg)" }}>
          <div style={{ fontSize: 28 }}>🤖</div>
          <div className="text-xs font-semibold mt-1">IA Operacional</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>Recomendacoes automaticas</div>
        </div>
        <div className="text-center p-2 rounded" style={{ background: "var(--green-bg)" }}>
          <div style={{ fontSize: 28 }}>💹</div>
          <div className="text-xs font-semibold mt-1">Cotacoes</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>CBOT/B3 em tempo real</div>
        </div>
        <div className="text-center p-2 rounded" style={{ background: "var(--green-bg)" }}>
          <div style={{ fontSize: 28 }}>📱</div>
          <div className="text-xs font-semibold mt-1">Offline</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>App de campo sincroniza</div>
        </div>
      </div>

      <div
        className="rounded-ja p-3 text-xs"
        style={{ background: "#fff8e1", border: "1px solid #ffe082", color: "#5d4037" }}
      >
        Nos proximos 3 passos voce cria sua primeira fazenda, talhao e safra.
        Leva 1 minuto. Depois disso, todas as funcionalidades estao liberadas.
      </div>

      <label
        className="flex items-start gap-2 mt-4 p-3 rounded cursor-pointer"
        style={{
          background: aceiteTermos ? "var(--green-bg)" : "#fafafa",
          border: `1px solid ${aceiteTermos ? "var(--green)" : "var(--brd)"}`,
        }}
      >
        <input
          type="checkbox"
          checked={aceiteTermos}
          onChange={(e) => setAceiteTermos(e.target.checked)}
          style={{ marginTop: 3, accentColor: "var(--green)" }}
        />
        <span className="text-sm" style={{ color: "var(--text)" }}>
          Li e aceito os{" "}
          <Link href="/termos" target="_blank" style={{ color: "var(--green)", textDecoration: "underline" }}>
            Termos de Uso
          </Link>
          {" "}e a{" "}
          <Link href="/privacidade" target="_blank" style={{ color: "var(--green)", textDecoration: "underline" }}>
            Politica de Privacidade
          </Link>
          {" "}(LGPD).
        </span>
      </label>
    </div>
  );
}

function PassoFazenda({
  nome, setNome, cidade, setCidade, estado, setEstado, area, setArea,
}: {
  nome: string; setNome: (v: string) => void;
  cidade: string; setCidade: (v: string) => void;
  estado: string; setEstado: (v: string) => void;
  area: string; setArea: (v: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span style={{ fontSize: 28 }}>🏞️</span>
        <h2 className="font-display text-xl" style={{ color: "var(--dark)" }}>
          Sua primeira fazenda
        </h2>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
        Os outros dados (proprietario, CNPJ, certificacoes) voce pode preencher
        depois em <code>Fazendas</code>.
      </p>
      <div className="grid gap-3">
        <div>
          <label className="label">Nome da fazenda *</label>
          <input
            className="input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Fazenda Sao Joao"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Cidade</label>
            <input
              className="input"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="Ex: Patrocinio"
            />
          </div>
          <div>
            <label className="label">Estado</label>
            <select
              className="input"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
            >
              {ESTADOS_BR.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Area total (ha)</label>
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );
}

function PassoTalhao({
  nome, setNome, area, setArea, cultura, setCultura,
}: {
  nome: string; setNome: (v: string) => void;
  area: string; setArea: (v: string) => void;
  cultura: string; setCultura: (v: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span style={{ fontSize: 28 }}>📐</span>
        <h2 className="font-display text-xl" style={{ color: "var(--dark)" }}>
          Seu primeiro talhao
        </h2>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
        Talhao e cada area de plantio dentro da fazenda. Voce pode adicionar
        mais depois em <code>Talhoes</code>.
      </p>
      <div className="grid gap-3">
        <div>
          <label className="label">Nome / identificacao *</label>
          <input
            className="input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Talhao Norte"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Area (ha) *</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="label">Cultura atual</label>
            <select
              className="input"
              value={cultura}
              onChange={(e) => setCultura(e.target.value)}
            >
              {CULTURAS_PADRAO.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function PassoSafra({
  nome, setNome, cultura, setCultura, ano, setAno, dataPlantio, setDataPlantio,
}: {
  nome: string; setNome: (v: string) => void;
  cultura: string; setCultura: (v: string) => void;
  ano: string; setAno: (v: string) => void;
  dataPlantio: string; setDataPlantio: (v: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span style={{ fontSize: 28 }}>🌱</span>
        <h2 className="font-display text-xl" style={{ color: "var(--dark)" }}>
          Sua primeira safra
        </h2>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
        A safra agrupa lancamentos, vendas e custos do mesmo ciclo. Voce pode
        criar mais em <code>Safras</code>.
      </p>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Cultura *</label>
            <select
              className="input"
              value={cultura}
              onChange={(e) => {
                setCultura(e.target.value);
                setNome(`Safra ${e.target.value} ${ano}`);
              }}
            >
              {CULTURAS_PADRAO.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Ano agricola</label>
            <input
              className="input"
              value={ano}
              onChange={(e) => {
                setAno(e.target.value);
                setNome(`Safra ${cultura} ${e.target.value}`);
              }}
              placeholder="2026"
            />
          </div>
        </div>
        <div>
          <label className="label">Nome da safra *</label>
          <input
            className="input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Safra Cafe 2026"
          />
        </div>
        <div>
          <label className="label">Data de plantio</label>
          <input
            className="input"
            type="date"
            value={dataPlantio}
            onChange={(e) => setDataPlantio(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function PassoFim() {
  return (
    <div className="text-center py-4">
      <div style={{ fontSize: 72 }}>🎉</div>
      <h2 className="font-display text-2xl mt-2" style={{ color: "var(--dark)" }}>
        Tudo pronto!
      </h2>
      <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
        Sua fazenda, talhao e safra estao cadastrados. Agora voce pode comecar
        a lancar despesas, vender, registrar qualidade e acompanhar pelo dashboard.
      </p>
      <div className="mt-6 grid grid-cols-3 gap-2 text-xs" style={{ color: "var(--muted)" }}>
        <div>
          <div style={{ fontSize: 28 }}>📝</div>
          <div className="mt-1">Lance despesas</div>
        </div>
        <div>
          <div style={{ fontSize: 28 }}>💵</div>
          <div className="mt-1">Registre vendas</div>
        </div>
        <div>
          <div style={{ fontSize: 28 }}>📊</div>
          <div className="mt-1">Veja o dashboard</div>
        </div>
      </div>
    </div>
  );
}
