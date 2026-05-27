import PageHeader from "@/components/ui/PageHeader";

export const metadata = {
  title: "Sobre o JA Agrotec",
};

export default function SobrePage() {
  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Sobre o JA Agrotec"
        icone="🌾"
        subtitulo="Visão geral do ecossistema e do Módulo Produtor"
      />

      <div className="card space-y-4" style={{ maxWidth: 980, margin: "0 auto" }}>
        <div>
          <h1>JA Agrotec · Módulo Produtor</h1>
          <p style={{ color: "var(--muted)" }}>
            Versão 1.1.0 · Maio 2026
          </p>
        </div>

        <section>
          <h2>O que é o JA Agrotec?</h2>
          <p style={{ lineHeight: 1.7, marginTop: 8 }}>
            O <b>JA Agrotec</b> é um <b>ecossistema digital integrado</b> para
            o agronegócio, composto por três aplicações que se conectam entre
            si para cobrir toda a cadeia produtiva rural:
          </p>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="card" style={{ margin: 0 }}>
            <div style={{ fontSize: 32 }}>🌾</div>
            <h3 style={{ marginTop: 8 }}>Módulo Produtor</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
              Você está aqui. Gestão completa da propriedade rural: safras,
              talhões, lançamentos, estoque, vendas, qualidade e certificações.
            </p>
          </div>
          <div className="card" style={{ margin: 0 }}>
            <div style={{ fontSize: 32 }}>🏛️</div>
            <h3 style={{ marginTop: 8 }}>Módulo Cooperativa</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
              Gestão cooperativista: recebimento de produção, classificação,
              comercialização agregada e prestação de contas.
            </p>
          </div>
          <div className="card" style={{ margin: 0 }}>
            <div style={{ fontSize: 32 }}>📅</div>
            <h3 style={{ marginTop: 8 }}>Módulo Agenda</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
              Programação operacional integrada: agenda de campo, manutenções,
              logística, calendário fitossanitário.
            </p>
          </div>
        </div>

        <section>
          <h2>Sobre o Módulo Produtor</h2>
          <p style={{ lineHeight: 1.7, marginTop: 8 }}>
            Este módulo foi desenhado para <b>pequenos e médios produtores</b>{" "}
            gerenciarem a operação de forma simples, com foco em decisões
            baseadas em dados.
          </p>
          <ul
            style={{
              margin: "12px 0 0 24px",
              lineHeight: 1.9,
              listStyle: "disc",
            }}
          >
            <li>
              Cadastro de fazendas, talhões e safras com cálculo automático de
              área
            </li>
            <li>
              Lançamento de atividades (mão-de-obra, insumos, máquinas) por
              hora / hectare / diária
            </li>
            <li>
              Estoque de insumos com movimentação automática a partir das
              aplicações
            </li>
            <li>
              Vendas de grãos com controle de contratos, entregas e saldo
            </li>
            <li>Qualidade de lotes (umidade, impureza, ardidos)</li>
            <li>Certificações e documentos digitais</li>
            <li>Modo offline para uso no campo sem internet</li>
          </ul>
        </section>

        <section>
          <h2>Integrações</h2>
          <p style={{ lineHeight: 1.7, marginTop: 8 }}>
            Cada módulo do ecossistema usa seu próprio projeto Supabase
            (Postgres + Auth + Storage), com integrações entre eles via APIs e
            tabelas de sincronização específicas.
          </p>
        </section>

        <section>
          <h2>Tecnologia</h2>
          <p style={{ lineHeight: 1.7, marginTop: 8 }}>
            Next.js 14 + TypeScript + Tailwind CSS + Supabase. PWA com modo
            offline.
          </p>
        </section>

        <div
          style={{
            marginTop: 8,
            padding: 16,
            background: "var(--green-bg, #e8f5e9)",
            borderLeft: "4px solid #22c55e",
            borderRadius: 8,
          }}
        >
          <b>💡 Dica:</b> Use o menu lateral <b>Sobre</b> para acessar Ajuda,
          História, Troubleshooting, Ecossistema e Changelog.
        </div>
      </div>
    </div>
  );
}
