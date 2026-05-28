-- ============================================================
-- Análise de Solo
-- Tabela usada por app/(app)/analise-solo/page.tsx
-- ============================================================

CREATE TABLE IF NOT EXISTS analise_solo (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fazenda_id        UUID REFERENCES fazendas(id) ON DELETE CASCADE,
  talhao_id         UUID REFERENCES talhoes(id) ON DELETE SET NULL,
  cultura           TEXT,
  data_analise      DATE NOT NULL DEFAULT CURRENT_DATE,
  dados_resultados  JSONB NOT NULL DEFAULT '{}',
  observacoes       TEXT,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analise_solo_fazenda ON analise_solo(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_analise_solo_talhao  ON analise_solo(talhao_id);
CREATE INDEX IF NOT EXISTS idx_analise_solo_data    ON analise_solo(data_analise DESC);

ALTER TABLE analise_solo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analise_solo_acesso_fazenda" ON analise_solo;
CREATE POLICY "analise_solo_acesso_fazenda" ON analise_solo
  FOR ALL USING (
    get_user_role() = 'admin'
    OR fazenda_id = get_user_fazenda()
  );

CREATE OR REPLACE TRIGGER trg_analise_solo_updated
  BEFORE UPDATE ON analise_solo
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
