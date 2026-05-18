# 06 — Dashboards, Semáforos e Geointeligência

> A camada visual da inteligência. Tudo que o gerente da cooperativa precisa ver em **até 3 cliques**.

## 1. Dashboard Executivo (home)

### 1.1 Estrutura visual

```
+---------------------------------------------------------------+
| Header: "Bom dia, [Nome]" + clima + cotações + alerta IA top |
+---------------------------------------------------------------+
| Linha 1: KPIs cards (12 cards horizontais)                    |
|   total coop | ativos | integrados | simplificados |          |
|   area | producao est | producao entreg | qualidade |         |
|   ATR | produtividade | ticket médio | conformidade           |
+---------------------------------------------------------------+
| Linha 2: Semáforos (grid 2x6)                                 |
|   qualidade | producao | certificacao | auditoria | doc | ent |
|   produtiv  | inadimp  | sem lanc.    | clima     | não-conf|
+---------------------------------------------------------------+
| Linha 3: Mapa + Feed IA lado a lado                           |
|   [Mapa cooperados c/ heatmap risco]   [Feed IA priorizado]   |
+---------------------------------------------------------------+
| Linha 4: Rankings (3 tabelas)                                 |
|   Top produtividade | Top qualidade | Top evolução            |
+---------------------------------------------------------------+
```

### 1.2 KPIs (cards superiores)

| KPI | Fórmula | Realtime? |
|---|---|---|
| Total cooperados | `count(*)` em cooperados ativos | sim |
| Ativos | cooperados com lançamento <30d | sim |
| Integrados | tipo=integrado | sim |
| Simplificados | tipo=simplificado | sim |
| Área monitorada | sum(area_total_ha) | sim |
| Produção estimada | sum(safras.producao_estimada_t) safra atual | 5min |
| Produção entregue | sum(entregas.peso_liquido_kg) | sim |
| Qualidade média | avg(score_qualidade) | 5min |
| ATR médio | avg(laudos.atr) ano corrente | 5min |
| Produtividade média | avg(safras.produtividade_kg_ha) | 5min |
| Ticket médio coop. | sum(vendas)/count(coop ativos) | 5min |
| Score conformidade | avg(score_conformidade) | 5min |

## 2. Semáforos Inteligentes

### 2.1 Lista completa

| Semáforo | Verde | Amarelo | Vermelho |
|---|---|---|---|
| Qualidade | score >= 0.85 | 0.65-0.84 | < 0.65 |
| Produção | realizado vs estimado >= 95% | 85-94% | < 85% |
| Certificação | todas válidas | vencendo <60d | vencida ou sem |
| Auditoria | em dia | atrasada <30d | atrasada >30d |
| Documentação | 100% | 80-99% | < 80% |
| Entregas | realizado >= contratado | 80-99% | < 80% |
| Produtividade | >= regional | -10 a 0% | > 10% abaixo |
| Inadimplência op. | 0 | 1-2 itens | 3+ itens |
| Ausência lanç. | <15d | 15-30d | >30d |
| Risco climático | sem alerta | alerta amarelo INMET | alerta vermelho |
| Não-conformidades | 0 abertas | 1-2 | 3+ |

### 2.2 Estado computado

```sql
CREATE MATERIALIZED VIEW mv_semaforos AS
SELECT
  c.id AS cooperado_id,
  CASE WHEN c.score_qualidade >= 0.85 THEN 'verde'
       WHEN c.score_qualidade >= 0.65 THEN 'amarelo'
       ELSE 'vermelho' END AS semaforo_qualidade,
  -- ... demais semáforos
FROM cooperados c;
```

## 3. Mapa e Geointeligência

### 3.1 Camadas disponíveis

| Camada | Fonte | Toggle |
|---|---|---|
| Cooperados (pin) | `cooperados.geom` | sim |
| Fazendas (poligono) | `fazendas.geom` | sim |
| Talhões | `talhoes.geom` | sim |
| NDVI tile | Sentinel-2 mais recente | sim |
| Heatmap produtividade | grid hex H3 | sim |
| Heatmap risco | computed by Agente RISCO | sim |
| Certificações | overlay por programa | sim |
| Entregas (rota) | linhas talhão -> recepção | sim |
| Risco climático INMET | tile externo | sim |

### 3.2 Interações

- Hover em cooperado: mini-card com nome, score, alertas.
- Click: abre Visão 360° do cooperado em side-panel.
- Seleção múltipla com lasso (Shift+drag): ações em lote (designar técnico, enviar mensagem).
- Filtros rápidos: cultura, status, certificação, semáforo.

## 4. Feed IA priorizado

### 4.1 Estrutura do card

```
+---------------------------------------------------+
| ?? CRÍTICO  -  Cooperado João Silva                |
| NDVI caindo 22% em 14 dias no talhão T-03         |
| Sugestão: visita técnica nas próximas 72h         |
| Evidência: [ver gráfico] [ver imagem satélite]    |
| [Aceitar] [Adiar 7d] [Rejeitar]   IA Risco v3.2  |
+---------------------------------------------------+
```

### 4.2 Ordenação

1. Prioridade (crítica > alta > media > baixa).
2. Idade (mais novo primeiro dentro da mesma prio).
3. Score de impacto (cooperado classe A primeiro).

## 5. Rankings

### 5.1 Visões padrão

- Top 10 produtividade (kg/ha)
- Top 10 qualidade (score)
- Top 10 evolução (delta YoY)
- Top 10 fidelização (% volume entregue do contratado)
- Top 10 conformidade

### 5.2 Cell rendering

- Sparkline de 12 meses ao lado do nome.
- Setas ▲/▼ com variação vs trimestre anterior.
- Badge de certificação ativa.

## 6. Drill-down

Toda KPI/semáforo é clicável:

1. Click no KPI “Qualidade média” -> lista de cooperados ordenados por qualidade.
2. Click num cooperado -> Visão 360°.
3. Click em ATR -> histórico de laudos da safra atual.

## 7. Performance

- Todos os widgets puxam de **materialized views** (pg_cron refresh 5min).
- Realtime via Supabase Channels nos eventos críticos (recomendação nova, alerta crítico).
- Bundle inicial < 200KB. Componentes pesados lazy-load.

---

_Próximo: `07-modulos-funcionais.md`._
