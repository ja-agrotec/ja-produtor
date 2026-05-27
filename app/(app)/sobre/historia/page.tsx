import PageHeader from "@/components/ui/PageHeader";

export const metadata = {
  title: "História — JA Agrotec",
};

type Marco = {
  ano: string;
  titulo: string;
  descricao: string;
};

const TIMELINE: Marco[] = [
  {
    ano: "2020",
    titulo: "A semente",
    descricao:
      "Primeiros estudos sobre gestão rural digital. Observação de campo: pequenos e médios produtores precisam de ferramentas em português, simples, com modo offline.",
  },
  {
    ano: "2021",
    titulo: "Pesquisa de campo",
    descricao:
      "Entrevistas com produtores em diferentes regiões. Mapeamento de fluxos: lançamentos, estoque, vendas, certificações. Definição de personas (Produtor, Gerente, Operador).",
  },
  {
    ano: "2022",
    titulo: "Protótipos",
    descricao:
      "Primeiros mock-ups e validações com produtores reais. Decisão por arquitetura web + PWA em vez de app nativo. Testes em telas pequenas no campo.",
  },
  {
    ano: "2023",
    titulo: "MVP interno",
    descricao:
      "Construção da primeira versão funcional para uso interno em propriedades parceiras. Integração inicial com Supabase. Foco em lançamentos e safras.",
  },
  {
    ano: "Abril 2026",
    titulo: "JA Agro Intelligence v1.0",
    descricao:
      "Primeira versão pública, com 22 módulos operacionais cobrindo cadastro de fazendas, safras, lançamentos, estoque, vendas, qualidade, certificação e mais.",
  },
  {
    ano: "Maio 2026",
    titulo: "JA Agrotec — Módulo Produtor v1.1",
    descricao:
      "Renomeação para integrar o ecossistema JA Agrotec (Produtor + Cooperativa + Agenda). 15 bugs corrigidos via QA estruturado. Arquitetura preparada para integrações entre módulos.",
  },
];

export default function HistoriaPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        titulo="História do JA Agrotec"
        icone="📖"
        subtitulo="A trajetória de uma plataforma feita por e para produtores"
      />

      <div className="card" style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ position: "relative", paddingLeft: 32 }}>
          <div
            style={{
              position: "absolute",
              left: 12,
              top: 8,
              bottom: 8,
              width: 2,
              background: "var(--brd, #e5e7eb)",
            }}
          />
          {TIMELINE.map((m, i) => (
            <div key={i} style={{ position: "relative", paddingBottom: 28 }}>
              <div
                style={{
                  position: "absolute",
                  left: -25,
                  top: 4,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#22c55e",
                  border: "3px solid #fff",
                  boxShadow: "0 0 0 2px #22c55e",
                }}
              />
              <div className="font-display" style={{ fontSize: 12, color: "var(--muted)" }}>
                {m.ano}
              </div>
              <h3 style={{ marginTop: 2 }}>{m.titulo}</h3>
              <p style={{ marginTop: 6, lineHeight: 1.7 }}>{m.descricao}</p>
            </div>
          ))}
        </div>

        <section style={{ marginTop: 16 }}>
          <h2>Próximos passos</h2>
          <ul style={{ margin: "12px 0 0 24px", lineHeight: 1.9, listStyle: "disc" }}>
            <li>
              <b>Módulo Cooperativa</b> — recebimento, classificação e
              comercialização agregada
            </li>
            <li>
              <b>Módulo Agenda</b> — calendário operacional integrado
            </li>
            <li>
              <b>Integrações Produtor ↔ Cooperativa</b> (entregas, contratos)
            </li>
            <li>App mobile dedicado para apontamentos de campo</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
