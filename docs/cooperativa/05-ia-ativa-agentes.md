# 05 — IA Ativa e Agentes

> A IA aqui não é chatbot. É um time de **agentes autônomos** rodando 24/7, cada um com prompt versionado, tools tipadas e logs auditveis.

## 1. Filosofia

1. **A IA chega antes do humano**: agentes monitoram dados continuamente e geram recomendações priorizadas.
2. **IA não decide sozinha**: ela sugere, humano aprova/rejeita. Cada decisao da IA é auditável.
3. **Cada agente é um serviço**: Edge Function isolada, com seu próprio prompt versionado e suíte de evals.
4. **Ground truth são os dados**: agente le SQL/views. Ninguém fica adivinhando.

## 2. Arquitetura de agentes

```
                 +-------------------+
                 |   Orquestrador    |
                 |   (pg_cron + pgmq)|
                 +---------+---------+
                           |
    +------------+---------+---------+------------+
    |            |                   |            |
    v            v                   v            v
+---------+ +---------+         +---------+ +---------+
| Agente  | | Agente  |   ...   | Agente  | | Agente  |
| Risco   | | Quali   |         | Cert    | | Comerc  |
+----+----+ +----+----+         +----+----+ +----+----+
     |           |                   |           |
     +-----------+--------+----------+-----------+
                          v
              +-----------------------+
              |   ai.recomendacoes    |
              |   ai.runs             |
              +-----------+-----------+
                          v
              +-----------------------+
              |    UI: Feed IA        |
              |    Notificações      |
              +-----------------------+
```

## 3. Catálogo de Agentes

### 3.1 Agente RISCO

- **Roda**: a cada 1h.
- **Olha**: lançamentos, visitas, NDVI, clima, certificações.
- **Detecta**:
  - Coop. sem lançamento há >30 dias.
  - NDVI caindo >15% em 2 leituras.
  - Certificação vencendo em <60 dias sem auditoria agendada.
  - Risco climático (alerta INMET) em talhão.
- **Tools**:
  - `db.query_cooperado_inativo(dias)`
  - `db.query_ndvi_trend(talhao_id)`
  - `db.query_certificacoes_vencendo(dias)`
  - `clima.alertas(geom)`

### 3.2 Agente QUALIDADE

- **Roda**: após cada novo laudo (event-driven).
- **Detecta**:
  - Tendência de queda em umidade/impureza/proteina.
  - Lote fora do padrão do cooperado.
  - Anomalias estatísticas vs histórico regional.
- **Tools**:
  - `db.historico_qualidade(cooperado_id)`
  - `db.benchmark_regional(cultura, geom)`
  - `vision.analisar_foto_amostra(url)`

### 3.3 Agente CERTIFICAÇÃO

- **Roda**: diário (0h).
- **Detecta**:
  - Documentação faltante para auditoria.
  - Não-conformidade sem plano de ação.
  - Risco de perda de certificação.
- **Output**: dossiê de preparação para auditoria.

### 3.4 Agente COMERCIAL

- **Roda**: semanal.
- **Detecta**:
  - Coop. com volume contratado < produção estimada (oportunidade).
  - Coop. não entregando volume contratado (risco evasão).
  - Preço de mercado vs contratado (timing).

### 3.5 Agente ATÉCNICA

- **Roda**: diário.
- **Detecta**:
  - Coop. sem visita há >90 dias.
  - Recomendações pendentes vencidas.
  - Cluster geográfico para roteirização de visitas.
- **Output**: agenda sugerida da semana para cada técnico.

### 3.6 Agente RASTREABILIDADE

- **Roda**: por demanda (auditor solicita).
- **Output**: dossiê verificável (PDF) com cadeia de custódia completa de um lote.

### 3.7 Agente CHAT (Dossiê Q&A)

- Interface conversacional sobre dados do cooperado/lote.
- **RAG** sobre `documentos.embedding` e `visitas_tecnicas.embedding`.
- Cita fontes ("laudo XYZ de 2025-08-12").
- Não tem acesso a `service_role`.

## 4. Tools tipadas (function calling)

Todas as tools são:

- Declaradas em JSON Schema.
- Implementadas em Edge Function própria.
- Read-only ou write com whitelist.
- Loggadas em `ai.runs.tools_chamadas`.

Exemplo de definição:

```ts
export const tools = {
  "db.query_cooperado_inativo": {
    schema: z.object({ dias: z.number().min(1).max(365) }),
    handler: async ({ dias }) => {
      return supabase.rpc("cooperados_sem_lancamento", { dias });
    },
    readonly: true,
  }
};
```

## 5. Embeddings e Busca Semântica

### 5.1 Coluna `embedding vector(1536)` em:

- `documentos` (texto extraido via OCR/LLM)
- `visitas_tecnicas` (checklist + recomendações)
- `laudos_qualidade` (texto do laudo)

### 5.2 Indexação

```sql
CREATE INDEX docs_embedding_idx ON documentos
  USING hnsw (embedding vector_cosine_ops);
```

### 5.3 Reindex

- `pg_cron` job toda madrugada para reembedar registros com `embedding IS NULL`.
- Edge Function `reembedder` chama OpenAI em lote.

## 6. Eval Suite

Cada agente tem em `tests/agents/<nome>/cases.jsonl`:

```json
{"input":{"cooperado_id":"abc","as_of":"2025-11-01"},"expect":{"prioridade":"alta","categoria":"qualidade_tendencia_queda"}}
```

- `pg_cron` roda evals diários.
- Pass rate <90% dispara alerta no Sentry.

## 7. Custos e orçamento

- Cada `ai.run` registra `custo_usd`.
- Dashboard de custos por agente e por cooperativa.
- Soft-limit por mês (alerta) e hard-limit (suspende agente).

## 8. Anti-padrões já cancelados

- ? "Pergunte ao Chat" generico no topo da página. Substituído por agentes contextuais.
- ? IA gerando SQL livremente em prod. Apenas tools whitelisted.
- ? Recomendacoes sem evidência: toda recomendação tem `dados_evidencia jsonb`.

---

_Próximo: `06-dashboards-semaforos.md`._
