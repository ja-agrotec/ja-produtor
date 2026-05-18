# Módulo COOPERATIVA — Índice da Especificação

> Especificação completa do módulo **JA Agrotec · Cooperativa**.
> Repositório alvo (a criar): \`ja-agrotec-cooperativa\`.
> Supabase alvo (a criar): projeto Supabase dedicado.
> Esta documentação vive no repo do **Produtor** para manter a visão do ecossistema centralizada.

## Posicionamento estratégico

Não estamos construindo "mais um ERP cooperativo". Estamos construindo a **primeira plataforma cooperativa nativamente AI-first, event-driven e geo-temporal do mercado agrícola brasileiro**, com rastreabilidade verificável ponta-a-ponta e federação real com o sistema do produtor.

## Diferenciais que ninguém oferece junto

1. **AI Agents operacionais** (não chatbot) — agentes autônomos com ferramentas próprias monitorando cada cooperado 24/7.
2. **Federação real** com o módulo Produtor via Postgres FDW + Outbox + SSO unificado.
3. **Rastreabilidade ancorada** (hash chain opcional em blockchain pública) — prova criptográfica para auditorias internacionais.
4. **Geointeligência ativa** com PostGIS + tiles vetoriais + integração Sentinel-2/NDVI.
5. **Busca semântica** sobre documentos, laudos e visitas técnicas via pgvector + embeddings.
6. **Realtime first** — dashboards reagindo em <500ms a eventos do campo.
7. **Offline-first** com CRDT para visitas técnicas em zona sem sinal.
8. **LGPD-by-design** com consentimento granular por dado.

## Índice dos documentos

| # | Arquivo | Conteúdo |
|---|---|---|
| 01 | [\`01-visao-arquitetura.md\`](./01-visao-arquitetura.md) | Visão de negócio, públicos, modelo operacional (simplificado vs integrado), diagramas C4. |
| 02 | [\`02-stack-tecnologica.md\`](./02-stack-tecnologica.md) | Stack 2026: PostgreSQL 16, pgvector, PostGIS, Edge Functions, Hono, HTMX/Alpine, WebTransport, etc. |
| 03 | [\`03-modelo-dados.md\`](./03-modelo-dados.md) | Schema SQL completo (30+ tabelas), enums, RLS, triggers, views materializadas. |
| 04 | [\`04-federacao-sso.md\`](./04-federacao-sso.md) | SSO unificado JWT + Foreign Data Wrappers + Outbox pattern + Event bus. |
| 05 | [\`05-ia-ativa-agentes.md\`](./05-ia-ativa-agentes.md) | AI Agents operacionais, ferramentas, prompts, embeddings, busca semântica, RAG. |
| 06 | [\`06-dashboards-semaforos.md\`](./06-dashboards-semaforos.md) | Dashboard Executivo, semáforos inteligentes, KPIs, mapas, geointeligência. |
| 07 | [\`07-modulos-funcionais.md\`](./07-modulos-funcionais.md) | Cooperados, Produção, Entregas, Comercial, Qualidade, Certificações, Auditorias, ATR. |
| 08 | [\`08-rastreabilidade-blockchain.md\`](./08-rastreabilidade-blockchain.md) | Cadeia de custódia hash-chain, ancoragem opcional em blockchain pública, dossiê verificável. |
| 09 | [\`09-ux-design.md\`](./09-ux-design.md) | UX enterprise, command palette, visão 360° cooperado, padrões de interação. |
| 10 | [\`10-roadmap-mvp.md\`](./10-roadmap-mvp.md) | Roadmap em 4 fases, MVP em 90 dias, métricas de sucesso, riscos. |

## Como usar esta spec

1. Leia primeiro o `01` (visão) para entender o porquê.
2. Depois `02` (stack) para entender o como.
3. `03` (dados) é o coração: tudo é derivado dele.
4. `04-08` são aprofundamentos por domínio.
5. `09-10` são execução e UX.

## Decisões já tomadas (binding)

- ? Arquitetura: **Opcão C** — repositório e Supabase separados + federação real.
- ? Identidade visual: herda 100% do [`DESIGN-SYSTEM.md`](../DESIGN-SYSTEM.md).
- ? Stack base: HTML + Vanilla JS + Supabase (mesma do Produtor), evoluções localizadas onde justificável.
- ? Brasil-first, PT-BR, depois multi-idioma.
- ? AI Agents são **first-class citizens**, não feature lateral.

---

_Última atualização: 18/05/2026 — versão inicial da spec._
