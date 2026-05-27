import PageHeader from "@/components/ui/PageHeader";

export const metadata = {
  title: "Ecossistema — JA Agrotec",
};

type Modulo = {
  icone: string;
  nome: string;
  status: "atual" | "dev";
  descricao: string;
  features: string[];
};

const MODULOS: Modulo[] = [
  {
    icone: "🌾",
    nome: "Produtor",
    status: "atual",
    descricao:
      "Gestão completa da propriedade rural. Safras, talhões, lançamentos, estoque, vendas, qualidade e certificações.",
    features: [
      "Cadastro de fazendas e talhões",
      "Safras e lançamentos por hora/ha/diária",
      "Estoque de insumos com alertas",
      "Vendas de grãos e contratos",
      "Qualidade de lotes",
      "Modo offline (PWA)",
    ],
  },
  {
    icone: "🏛️",
    nome: "Cooperativa",
    status: "dev",
    descricao:
      "Gestão cooperativista. Recebimento de produção, classificação, armazenagem, comercialização agregada e prestação de contas aos cooperados.",
    features: [
      "Recebimento de produção (romaneios)",
      "Classificação e descontos",
      "Armazenagem por silo/armazém",
      "Comercialização agregada",
      "Prestação de contas aos cooperados",
    ],
  },
  {
    icone: "📅",
    nome: "Agenda",
    status: "dev",
    descricao:
      "Programação operacional integrada. Agenda de campo, manutenções, logística e calendário fitossanitário com alertas inteligentes.",
    features: [
      "Agenda de campo por talhão",
      "Manutenções programadas de máquinas",
      "Logística (entregas, retiradas)",
      "Calendário fitossanitário",
      "Alertas baseados em clima e fenologia",
    ],
  },
];

export default function EcossistemaPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Ecossistema JA Agrotec"
        icone="🌐"
        subtitulo="Três módulos integrados para o agronegócio"
      />

      <div className="card" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {MODULOS.map((m) => {
            const aqui = m.status === "atual";
            return (
              <div
                key={m.nome}
                className="card"
                style={{
                  margin: 0,
                  border: aqui ? "2px solid #22c55e" : "1px solid var(--brd, #e5e7eb)",
                  background: aqui ? "var(--green-bg, #e8f5e9)" : "#fff",
                  position: "relative",
                }}
              >
                {aqui ? (
                  <span
                    className="badge badge-success"
                    style={{ position: "absolute", top: 12, right: 12 }}
                  >
                    Você está aqui
                  </span>
                ) : (
                  <span
                    className="badge badge-warn"
                    style={{ position: "absolute", top: 12, right: 12 }}
                  >
                    Em desenvolvimento
                  </span>
                )}
                <div style={{ fontSize: 40, marginBottom: 8 }}>{m.icone}</div>
                <h2>{m.nome}</h2>
                <p
                  style={{
                    marginTop: 8,
                    lineHeight: 1.6,
                    fontSize: 14,
                  }}
                >
                  {m.descricao}
                </p>
                <ul
                  style={{
                    marginTop: 12,
                    paddingLeft: 20,
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: "var(--muted)",
                    listStyle: "disc",
                  }}
                >
                  {m.features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <section style={{ marginTop: 32 }}>
          <h2>Arquitetura</h2>
          <p style={{ lineHeight: 1.7, marginTop: 8 }}>
            Cada módulo é uma aplicação <b>Next.js 14</b> independente com seu
            próprio projeto <b>Supabase</b> (Postgres + Auth + Storage). A
            integração entre módulos é feita via APIs e tabelas de
            sincronização específicas (ex: entregas Produtor → Cooperativa).
          </p>
        </section>

        <section style={{ marginTop: 24 }}>
          <h2>Tecnologias</h2>
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              "Next.js 14",
              "TypeScript",
              "Tailwind CSS",
              "Supabase",
              "Postgres",
              "PWA",
              "Vercel",
              "xlsx",
              "sonner",
            ].map((t) => (
              <span key={t} className="badge badge-info">
                {t}
              </span>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 24 }}>
          <h2>Repositórios</h2>
          <ul style={{ margin: "12px 0 0 24px", lineHeight: 1.9, listStyle: "disc" }}>
            <li>
              <b>Produtor:</b> github.com/alanjader/ja-produtor (atual)
            </li>
            <li>
              <b>Cooperativa:</b> a definir
            </li>
            <li>
              <b>Agenda:</b> github.com/alanjader/ja-agenda
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
