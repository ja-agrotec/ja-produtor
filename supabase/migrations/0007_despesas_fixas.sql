-- ============================================================
-- Despesas Fixas
-- Tabela usada por app/(app)/despesas-fixas/page.tsx
-- ============================================================

CREATE TABLE IF NOT EXISTS despesas_fixas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fazenda_id    UUID REFERENCES fazendas(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  valor         NUMERIC(12,2) NOT NULL DEFAULT 0,
  periodicidade TEXT NOT NULL DEFAULT 'mensal'
    CHECK (periodicidade IN ('mensal','bimestral','trimestral','semestral','anual')),
  data_inicio   DATE,
  data_fim      DATE,
  categoria     TEXT,
  observacoes   TEXT,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_despesas_fixas_fazenda ON despesas_fixas(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_despesas_fixas_ativo   ON despesas_fixas(ativo);

ALTER TABLE despesas_fixas ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "despesas_fixas_acesso_fazenda" ON despesas_fixas
  FOR ALL USING (
    get_user_role() = 'admin'
    OR fazenda_id = get_user_fazenda()
  );

CREATE OR REPLACE TRIGGER trg_despesas_fixas_updated
  BEFORE UPDATE ON despesas_fixas
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
