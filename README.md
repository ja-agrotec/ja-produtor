# JA Agrotec · Módulo Produtor

> Sistema de gestão da propriedade rural, parte do **ecossistema JA Agrotec**.

[![Versão](https://img.shields.io/badge/versão-2.0.0-7CB342)]() [![Stack](https://img.shields.io/badge/stack-Next.js%2014%20%2B%20TypeScript%20%2B%20Supabase-1A2E1A)]()

## Sobre

**Módulo Produtor** do ecossistema **JA Agrotec** — gestão completa da propriedade rural (safras, talhões, atividades, estoque, vendas, qualidade, certificação, fechamento de safra).

| Módulo | Status | Descrição |
|---|---|---|
| Produtor | ✅ Em produção (este repo) | Safras, talhões, lançamentos, estoque, vendas |
| Cooperativa | 🚧 Em desenvolvimento | Recebimento, classificação, comercialização |
| Agenda | 🚧 Em desenvolvimento | Calendário, manutenções, logística |

## Stack

- **Front:** Next.js 14 (App Router) + TypeScript 5.6 + Tailwind 3.4
- **Backend:** Supabase (Postgres + Auth + Storage)
- **UI:** sonner (toast), recharts (charts), lucide-react (ícones)
- **Export:** xlsx (planilhas), jspdf + jspdf-autotable (PDF)
- **Deploy:** Vercel

## Estrutura

```
app/
├── (auth)/login          # Tela de login
├── (app)/                # Rotas autenticadas com layout admin
│   ├── home              # Dashboard executivo do produtor
│   ├── dashboard         # Painel analítico (gráficos)
│   ├── safras            # Ciclos de produção
│   ├── fechamento-safra  # Encerramento + análise de rentabilidade
│   ├── talhoes           # Glebas / áreas
│   ├── lancamentos       # Atividades financeiras (com fila offline)
│   ├── insumos           # Estoque de insumos
│   ├── maquinas          # Frota
│   ├── operadores        # Mão de obra
│   ├── fazendas          # Propriedades
│   ├── vendas-graos      # Contratos & entregas
│   ├── despesas-fixas    # Custos recorrentes
│   ├── certificacao      # Orgânico / GlobalGAP / Rainforest
│   ├── analise-solo      # Laudos agronômicos
│   ├── documentos        # Repositório central
│   ├── alertas           # Insumos críticos, máquinas, safras vencidas
│   ├── resumo-fazendas   # Ranking comparativo por ROI
│   ├── ia-operacional    # Recomendações baseadas em regras
│   ├── qualidade         # Visão por cultura (read-only)
│   ├── qualidade-lotes   # CRUD de laudos por lote
│   ├── usuarios          # Gestão de usuários (Edge Function)
│   ├── exportar          # Geração de planilhas
│   ├── offline           # Fila de sincronização
│   └── sobre/            # História, ajuda, troubleshooting, ecossistema, changelog
components/
├── AppSidebar.tsx        # Menu lateral (10 grupos, 28 itens)
└── ui/                   # Modal, ConfirmDialog, PageHeader, EmptyState, KpiCard, FazendaSelector
lib/
├── supabase.ts           # Client (browser, anon key)
├── supabase-admin.ts     # Client (server, service_role)
├── auth-context.tsx      # Provider + useAuth
├── types.ts              # Tipos do domínio (PT-BR)
├── format.ts             # fmt, fmtBRL, fmtData, fmtPct, ...
└── utils.ts              # cn, debounce, constantes, sessionStorage helpers
supabase/migrations/      # 7 migrations SQL numeradas
docs/                     # PROJECT-MEMORY, DESIGN-SYSTEM, ECOSSISTEMA, TEST-MEMORY, cooperativa/
```

## Setup local

```bash
npm install
cp .env.example .env.local   # preenche SUPABASE_*
npm run dev                  # http://localhost:3000
```

## Variáveis de ambiente

Veja [`.env.example`](.env.example). Resumo:
- `NEXT_PUBLIC_SUPABASE_URL` — URL do projeto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — chave anon (segura no browser)
- `SUPABASE_SERVICE_ROLE_KEY` — service_role (server-only, nunca exponha)

## Migrations

As migrations vivem em `supabase/migrations/`, numeradas sequencialmente. Aplicar no SQL Editor do Supabase ou via CLI (`supabase db push`). As 4 primeiras (`0001`–`0004`) já estão aplicadas no banco produtivo `gohoqgctcqltorfeohom` — as `0005`–`0007` (analise_solo, certificacao_checklists, despesas_fixas) precisam ser rodadas.

## Deploy

Vercel. Importe o repo, configure as 3 variáveis acima em **Settings → Environment Variables** e dispare o build. Sem `vercel.json` customizado — convenção padrão do Next.js basta.

## Design system

Verde-floresta + verde-limão (paleta agro-tech). Tokens em [`app/globals.css`](app/globals.css) (CSS variables) e [`tailwind.config.js`](tailwind.config.js) (utilitários). Detalhes em [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md).

## Versão

**v2.0.0** — Reescrita completa em Next.js 14 + TypeScript (era HTML + JS vanilla em v1.x).
- Mesma identidade visual e mesma base Supabase
- 29 rotas portadas (22 funcionais + 6 estáticas Sobre + login)
- Componentes UI reutilizáveis (Modal, ConfirmDialog, PageHeader, KpiCard, EmptyState, FazendaSelector)
- Toasts via sonner, gráficos via recharts, PDF via jspdf, planilhas via xlsx
- PWA via `app/manifest.ts`

## Licença

Proprietária. © 2026 JA Agrotec. Todos os direitos reservados.
