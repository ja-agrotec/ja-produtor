import PageHeader from "@/components/ui/PageHeader";

export const metadata = {
  title: "Changelog — JA Agrotec",
};

type Versao = {
  versao: string;
  data: string;
  titulo: string;
  itens: { tag: "feat" | "fix" | "chore" | "ui" | "perf"; texto: string }[];
};

const VERSOES: Versao[] = [
  {
    versao: "v1.1.0",
    data: "Maio 2026",
    titulo: "Rebranding + 15 bugs corrigidos",
    itens: [
      {
        tag: "feat",
        texto:
          "Rebrand: JA Agro Intelligence → JA Agrotec · Módulo Produtor",
      },
      {
        tag: "feat",
        texto:
          "Estrutura preparada para ecossistema (Produtor, Cooperativa, Agenda)",
      },
      {
        tag: "feat",
        texto:
          "Novo menu Sobre com Ajuda, História, Troubleshooting, Ecossistema",
      },
      {
        tag: "feat",
        texto: "PWA: adicionado manifest.json com tema visual",
      },
      {
        tag: "fix",
        texto: "Edição de Lançamentos pré-popula qtd e custo (#22)",
      },
      {
        tag: "fix",
        texto:
          "Edição de Despesas Fixas seleciona categoria salva (#23)",
      },
      { tag: "fix", texto: "KPIs de Vendas reagem aos filtros (#13)" },
      { tag: "fix", texto: 'KPI "Área Plantada" com subtítulo claro (#14)' },
      {
        tag: "fix",
        texto: "Contagem de Usuários consistente com Home (#15)",
      },
      { tag: "fix", texto: "Topbar limpa entre módulos (#21)" },
      { tag: "fix", texto: "Ícones UTF-8 em Certificação (#25)" },
    ],
  },
  {
    versao: "v1.0.0",
    data: "Abril 2026",
    titulo: "Lançamento inicial",
    itens: [
      {
        tag: "feat",
        texto: 'Primeira versão pública sob o nome "JA Agro Intelligence"',
      },
      {
        tag: "feat",
        texto:
          "22 módulos operacionais: Safras, Talhões, Lançamentos, Estoque, Vendas, Qualidade, Certificação e mais",
      },
      { tag: "feat", texto: "Modo offline com fila de sincronização" },
      {
        tag: "feat",
        texto: "Autenticação Supabase + perfis Admin/Operador",
      },
      { tag: "feat", texto: "Dashboard analítico com KPIs em tempo real" },
    ],
  },
];

function tagStyle(tag: "feat" | "fix" | "chore" | "ui" | "perf") {
  switch (tag) {
    case "feat":
      return "badge badge-success";
    case "fix":
      return "badge badge-warn";
    case "ui":
      return "badge badge-info";
    case "perf":
      return "badge badge-info";
    case "chore":
    default:
      return "badge badge-neutral";
  }
}

function tagLabel(tag: "feat" | "fix" | "chore" | "ui" | "perf") {
  return {
    feat: "feat",
    fix: "fix",
    chore: "chore",
    ui: "ui",
    perf: "perf",
  }[tag];
}

export default function ChangelogPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Changelog"
        icone="📝"
        subtitulo="Histórico de versões e atualizações"
      />

      <div
        className="card space-y-6"
        style={{ maxWidth: 980, margin: "0 auto" }}
      >
        {VERSOES.map((v) => (
          <section
            key={v.versao}
            style={{
              borderLeft: "4px solid #22c55e",
              paddingLeft: 16,
            }}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <h2 style={{ margin: 0 }}>{v.versao}</h2>
              <span
                className="font-display text-caps"
                style={{ fontSize: 12, color: "var(--muted)" }}
              >
                {v.data}
              </span>
            </div>
            <p
              style={{
                marginTop: 4,
                color: "var(--muted)",
                fontSize: 14,
              }}
            >
              <b>{v.titulo}</b>
            </p>
            <ul style={{ marginTop: 12, listStyle: "none", padding: 0 }}>
              {v.itens.map((it, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "6px 0",
                    lineHeight: 1.6,
                  }}
                >
                  <span
                    className={tagStyle(it.tag)}
                    style={{
                      marginTop: 2,
                      flexShrink: 0,
                      minWidth: 44,
                      textAlign: "center",
                    }}
                  >
                    {tagLabel(it.tag)}
                  </span>
                  <span style={{ flex: 1 }}>{it.texto}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
