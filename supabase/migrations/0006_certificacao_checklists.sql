-- ============================================================
-- Certificação — checklists por tipo (orgânico, GlobalGAP, Rainforest)
-- Tabela usada por app/(app)/certificacao/page.tsx
-- ============================================================

CREATE TABLE IF NOT EXISTS certificacao_checklists (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fazenda_id    UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL CHECK (tipo IN ('organico','globalgap','rainforest')),
  itens         JSONB NOT NULL DEFAULT '[]',
  aprovado_em   TIMESTAMPTZ,
  observacoes   TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificacao_checklists_fazenda ON certificacao_checklists(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_certificacao_checklists_tipo    ON certificacao_checklists(tipo);

ALTER TABLE certificacao_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cert_checklists_acesso_fazenda" ON certificacao_checklists;
CREATE POLICY "cert_checklists_acesso_fazenda" ON certificacao_checklists
  FOR ALL USING (
    get_user_role() = 'admin'
    OR fazenda_id = get_user_fazenda()
  );

CREATE OR REPLACE TRIGGER trg_cert_checklists_updated
  BEFORE UPDATE ON certificacao_checklists
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
