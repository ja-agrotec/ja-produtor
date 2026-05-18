# 10 — Roadmap e MVP

> Como sair do zero até a primeira cooperativa em produção, sem virar projeto eterno.

## 1. Filosofia de entrega

- **Vertical slices**: cada sprint entrega uma jornada end-to-end (mesmo que estreita), não uma camada.
- **Cooperativa piloto já na fase 1**: nada de construir 6 meses no escuro.
- **AI Agents** entram cedo, mas começam modestos (1 agente de risco no MVP).

## 2. Fase 1 — MVP (90 dias)

**Objetivo**: Cooperativa piloto operando 100 cooperados simplificados + 10 integrados.

### Sprint 1-2 (semanas 1-4): Fundação

- Repo `ja-agrotec-cooperativa` criado.
- Projeto Supabase configurado + extensões.
- Schema base (15 tabelas principais) + RLS + triggers.
- Auth SSO bridge com Produtor.
- Sidebar + topbar + tema (herdado do Design System).
- Cadastro de cooperativa + admin.

### Sprint 3-4 (semanas 5-8): Cooperados

- CRUD de cooperados (simplificado).
- Importação em massa (CSV).
- Visão 360° com 3 tabs (Resumo, Produção, Documentos).
- Mapa básico com pins.
- Convite + onboarding integrado (LGPD consent flow).

### Sprint 5-6 (semanas 9-12): Operacional + IA básica

- Visitas técnicas (PWA + offline).
- Dashboard executivo com 6 KPIs.
- Semáforos (qualidade, certificação, ausência lanç.).
- **Agente RISCO** (semão ou MVP simples).
- Feed IA com 1 agente.

### Saída do MVP

- Cooperativa piloto usando diário.
- 0 bugs críticos.
- NPS interno > 50.

## 3. Fase 2 — Conformidade (90-180 dias)

- Certificações (CRUD + checklist).
- Auditorias (planejamento + execução mobile).
- Não-conformidades (kanban).
- Documentos com embedding + busca semântica.
- Dossiê verificável (PDF + QR).
- **Agente CERTIFICAÇÃO**.
- **Agente QUALIDADE**.
- Hash chain interna em lotes/entregas/laudos.

## 4. Fase 3 — Comercial + Geo (180-270 dias)

- Contratos + previsão de volume.
- Entregas com balança integrada.
- Cadeia de custódia sankey.
- Mapa avançado: NDVI tile, heatmaps, lasso select.
- **Agente COMERCIAL**.
- **Agente ATECNICA** (roteirização).
- App mobile cooperado (PWA leve).

## 5. Fase 4 — Federação + Blockchain (270-365 dias)

- FDW com Supabase do Produtor.
- Outbox + webhooks bidirecionais.
- Consentimento granular do produtor refletindo em tempo real.
- Ancoragem em blockchain (Polygon ou OpenTimestamps).
- Verificador público.
- Chat Dossiê (RAG).
- Pergunte aos Dados (NL2SQL).

## 6. Métricas de sucesso

### 6.1 Produto

| Métrica | Meta MVP | Meta 12m |
|---|---|---|
| Cooperativas usando | 1 | 8 |
| Cooperados cadastrados | 100 | 5.000 |
| DAU/MAU | 30% | 50% |
| Visitas técnicas/mês | 200 | 10.000 |
| Recomendações IA aceitas | 40% | 60% |
| Tempo médio até ação (de alerta ação tomada) | <72h | <24h |

### 6.2 Técnico

| Métrica | Meta |
|---|---|
| P95 latency API | <300ms |
| Uptime | 99.5% |
| Bundle inicial | <250KB |
| Cobertura testes core | >70% |
| Erros não tratados (Sentry) | <10/dia |

### 6.3 Negócio

- Ticket médio: R$ 2 a R$ 8 / cooperado / mês (modelo SaaS).
- Custo de IA por cooperativa: <10% do ticket.
- Churn anual: <8%.

## 7. Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Cooperativa piloto desistir mid-MVP | Alto | Contrato com SLA explicito + checkpoints quinzenais |
| LGPD: produtor reclamar de dados expostos | Alto | Consentimento granular default-deny + audit log |
| Custo IA explodir | Médio | Hard limits por cooperativa + LLM rápido em alto volume |
| FDW latency travar UI | Médio | Materialized views + cache local |
| Mobile offline sync conflict | Médio | CRDT (Automerge) já resolve |
| Certificadora rejeitar dossiê | Alto | Engajar 1 certificadora desde fase 2 |

## 8. Próximos passos imediatos

1. Você (Alan) cria o repo `ja-agrotec-cooperativa` no GitHub.
2. Eu copio a estrutura de pastas do Produtor como ponto de partida.
3. Cria projeto Supabase `ja-agrotec-cooperativa`.
4. Rodamos os SQL de `03-modelo-dados.md` em migrations versionadas.
5. Setup do auth SSO bridge.
6. Identificação da cooperativa piloto.
7. Kick-off Sprint 1.

---

_Fim da especificação inicial. Próxima iteração desta spec deve aparecer após a Fase 1._
