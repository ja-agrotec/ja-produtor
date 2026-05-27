import PageHeader from "@/components/ui/PageHeader";

export const metadata = {
  title: "Ajuda — JA Agrotec",
};

type Faq = { p: string; r: string };

const PRIMEIROS_PASSOS: string[] = [
  "Cadastre suas fazendas em Cadastros → Fazendas (área total, localização).",
  "Crie os talhões em Produção → Campo → Talhões (subdivisão de cada fazenda).",
  "Abra uma safra em Produção → Safras (cultura, época, área plantada).",
  "Cadastre insumos em Estoque → Meus Insumos antes de registrar aplicações.",
  "Registre atividades em Produção → Atividades (mão-de-obra, máquinas, aplicações).",
  "Lance vendas em Vendas de Grãos → Novo contrato.",
];

const FAQS: Faq[] = [
  {
    p: "Como cadastrar uma nova fazenda?",
    r: "Vá em Cadastros → Fazendas → + Nova Fazenda. Informe nome (obrigatório), localização, área total e proprietário. Você pode cadastrar mais detalhes (CNPJ, telefone, e-mail) opcionalmente.",
  },
  {
    p: "Como funciona o modo offline?",
    r: "O sistema é um PWA: instale-o pelo botão do navegador. Lançamentos feitos sem internet ficam na Fila Offline (Configurações → Fila Offline) e podem ser sincronizados manualmente quando a conexão voltar.",
  },
  {
    p: "Quais tipos de lançamento posso fazer?",
    r: "Por hora (máquinas: custo/hora × horas), por hectare (aplicações e mão-de-obra: custo/ha × ha) e por diária (trabalho avulso: custo/dia × dias). Cada um tem campos específicos no formulário.",
  },
  {
    p: "Como adicionar usuários ao sistema?",
    r: "Apenas admins podem fazer isso. Vá em Administração → Usuários → + Novo Usuário. Defina nome, e-mail, papel (admin/gerente/operador/visualizador) e a fazenda principal. O sistema gera uma senha temporária.",
  },
  {
    p: "Como exportar relatórios?",
    r: "Vá em Administração → Exportar. Selecione os relatórios desejados (lançamentos, safras, insumos, executivo), aplique filtros e gere um único arquivo .xlsx com 1 aba por relatório.",
  },
  {
    p: "O que é o ecossistema JA Agrotec?",
    r: "É a integração entre três módulos: Produtor (este), Cooperativa e Agenda. Cada módulo cobre uma parte da cadeia e se comunicam entre si via APIs.",
  },
];

const ATALHOS: { icone: string; titulo: string; descricao: string }[] = [
  {
    icone: "🔍",
    titulo: "Busca de módulos",
    descricao: "Use a busca do menu lateral para encontrar qualquer módulo rapidamente.",
  },
  {
    icone: "📅",
    titulo: "Filtros persistentes",
    descricao: "Toda tela com filtro de data salva a última seleção.",
  },
  {
    icone: "🔄",
    titulo: "Fila Offline",
    descricao: "O ícone Fila Offline mostra quantos registros estão aguardando sincronização.",
  },
  {
    icone: "📊",
    titulo: "KPIs em destaque",
    descricao: "A Home traz indicadores rápidos da propriedade no topo.",
  },
];

export default function AjudaPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Ajuda — Guia rápido"
        icone="❓"
        subtitulo="Como usar o JA Agrotec · Módulo Produtor no dia-a-dia"
      />

      <div className="card" style={{ maxWidth: 980, margin: "0 auto" }}>
        <section>
          <h2>Primeiros passos</h2>
          <ol style={{ margin: "12px 0 0 24px", lineHeight: 1.9, listStyle: "decimal" }}>
            {PRIMEIROS_PASSOS.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
        </section>

        <section style={{ marginTop: 24 }}>
          <h2>Atalhos úteis</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {ATALHOS.map((a, i) => (
              <div key={i} className="card" style={{ margin: 0 }}>
                <div style={{ fontSize: 24 }}>{a.icone}</div>
                <strong style={{ display: "block", marginTop: 6 }}>{a.titulo}</strong>
                <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
                  {a.descricao}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 24 }}>
          <h2>Perguntas frequentes</h2>
          <div style={{ marginTop: 12 }}>
            {FAQS.map((f, i) => (
              <details
                key={i}
                style={{
                  border: "1px solid var(--brd, #e5e7eb)",
                  borderRadius: 8,
                  padding: "12px 16px",
                  marginBottom: 8,
                  background: "#fff",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    fontWeight: 600,
                    listStyle: "none",
                  }}
                >
                  ❓ {f.p}
                </summary>
                <p style={{ marginTop: 10, lineHeight: 1.7, color: "var(--text)" }}>
                  {f.r}
                </p>
              </details>
            ))}
          </div>
        </section>

        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: "var(--green-bg, #e8f5e9)",
            borderLeft: "4px solid #22c55e",
            borderRadius: 8,
          }}
        >
          <b>💡 Dica:</b> Não conseguiu resolver? Veja o submenu{" "}
          <b>Troubleshooting</b> para problemas comuns.
        </div>
      </div>
    </div>
  );
}
