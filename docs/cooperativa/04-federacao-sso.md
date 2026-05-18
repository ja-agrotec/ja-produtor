# 04 — Federação e SSO

> Como o Cooperativa conversa com o Produtor (e futuramente com o Agenda) sem virar um monolito.

## 1. Três dimensões de federação

1. **Identidade** — SSO unificado JA Agrotec.
2. **Dados** — leitura compartilhada via Foreign Data Wrappers.
3. **Eventos** — escrita propaga via outbox pattern + webhooks.

## 2. SSO unificado

### 2.1 Opção escolhida: **JWT shared secret + claim de módulos**

- Cada Supabase é um projeto separado, mas todos validam o mesmo JWT.
- Usuário loga em `auth.jaagrotec.com.br` (Auth Hub) -> recebe JWT com claims:

```json
{
  "sub": "<auth_user_id>",
  "email": "user@coop.com.br",
  "modulos": {
    "produtor":     {"cooperado_id": "...", "papel": "admin"},
    "cooperativa": {"cooperativa_id": "...", "papel": "gerente"},
    "agenda":      null
  },
  "exp": 1716000000
}
```

- Cada Supabase configura `JWT_SECRET` igual ou usa **assimetria** (RS256) com chave pública compartilhada — preferível.
- Token válido por 1h, refresh por 30 dias.

### 2.2 Switch de módulo

- Header da UI tem dropdown "JA AGROTEC" -> Produtor / Cooperativa / Agenda.
- Trocar = mudar de subdomain (`produtor.jaagrotec.com.br` -> `cooperativa.jaagrotec.com.br`) carregando mesmo JWT.
- Cookie de sessão no domínio raiz `.jaagrotec.com.br`.

### 2.3 Provisionamento automático

Quando um produtor (cooperado integrado) vira cooperado de uma cooperativa:

1. Convite enviado por email.
2. Produtor aceita -> Edge Function chama:
   - INSERT em `cooperados` (cooperativa)
   - INSERT em `consentimentos` (produtor)
   - Atualiza JWT claim `modulos.cooperativa`.

## 3. Federação de dados (FDW)

### 3.1 Arquitetura

```
  [Supabase Cooperativa]      <----- read-only ----->     [Supabase Produtor]
      schema federation                                       schema public
         |                                                       |
         | postgres_fdw via PgBouncer                            |
         |                                                       |
         +---> SELECT * FROM federation.fazendas WHERE ...      |
```

### 3.2 Tabelas espelhadas (somente-leitura)

| Tabela remota (Produtor) | Local FDW (Cooperativa) | Uso |
|---|---|---|
| `fazendas` | `federation.fazendas` | Mapa de cooperados |
| `talhoes` | `federation.talhoes` | Geo + NDVI |
| `safras` | `federation.safras` | Previsão produção |
| `lancamentos` | `federation.lancamentos` | Lançamentos op |
| `vendas_graos` | `federation.vendas_graos` | Comercial |
| `qualidade_registro` | `federation.qualidade_registro` | Qualidade |
| `documentos` | `federation.documentos` | Anexos |

### 3.3 RLS sobre FDW

- Cooperativa só vê linhas onde:
  - `cooperado.produtor_id_externo = federation.fazendas.cooperado_id` **E**
  - `consentimentos_cooperado.<flag> = true` para aquele tipo de dado.

- Implementado via views materializadas filtradas:

```sql
CREATE MATERIALIZED VIEW mv_dados_compartilhados AS
SELECT f.* FROM federation.fazendas f
JOIN cooperados c ON c.produtor_id_externo = f.cooperado_id
JOIN federation.consentimentos cs ON cs.cooperado_id = c.produtor_id_externo
WHERE cs.area_e_talhoes = true;

REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dados_compartilhados;  -- via pg_cron
```

## 4. Outbox Pattern (eventos críticos)

### 4.1 Modelo

No Produtor:

```sql
CREATE TABLE outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento text NOT NULL,
  payload jsonb NOT NULL,
  destino text NOT NULL,    -- cooperativa, agenda
  enviado_em timestamptz,
  tentativas int DEFAULT 0,
  criado_em timestamptz DEFAULT now()
);

-- trigger após INSERT em qualidade_registro:
INSERT INTO outbox (evento, payload, destino) VALUES
  ('qualidade.criada', row_to_json(NEW)::jsonb, 'cooperativa');
```

Worker Edge Function (Produtor) consome outbox e POSTa webhook na Cooperativa:

```
POST https://coop.supabase.co/functions/v1/inbound
X-JA-Signature: <hmac-sha256>
Body: { "evento": "qualidade.criada", "payload": {...} }
```

Cooperativa recebe, valida assinatura, escreve em `inbox` e processa.

### 4.2 Eventos catalogados

| Evento (Produtor -> Coop) | Quando | Aciona na Coop |
|---|---|---|
| `cooperado.atualizado` | mudança no perfil do produtor | atualiza cache local |
| `qualidade.criada` | novo laudo | reavalia score qualidade |
| `entrega.realizada` | nova entrega | atualiza contrato |
| `talhao.geom_atualizada` | mudou geometria | refresh mapa |
| `safra.fechada` | safra encerrada | gera dossiê |
| `consentimento.revogado` | produtor revogou flag | sync RLS imediato |

## 5. Segurança

- **Webhook signing**: HMAC-SHA256 com secret rotacionado a cada 90 dias.
- **mTLS** entre Edge Functions quando disponível.
- **FDW user** somente-leitura, mapeado para role `fdw_reader` no Produtor.
- **Network**: PgBouncer + IP allowlist (apenas Supabase regions).
- **Audit**: cada chamada FDW é logada em `audit.fdw_calls`.

## 6. Resiliência

- Se Produtor cair, Cooperativa continua operando com cache local (MVs).
- Outbox tem retry exponencial (max 24h).
- Healthcheck em `/healthz` em cada Edge Function.
- Dashboard de federação no admin: "Último evento recebido há X min".

---

_Próximo: `05-ia-ativa-agentes.md`._
