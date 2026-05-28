-- ============================================================
-- Documentos / Anexos — tabela usada por app/(app)/documentos/page.tsx
-- Adaptado do 0002_documentos.sql historico para o schema atual do
-- banco compartilhado ja-prodcoop, sem o FK pra qualidade_lotes
-- (que tem schema desconhecido neste projeto).
-- ============================================================

DO $$ BEGIN
  CREATE TYPE tipo_documento_enum AS ENUM (
    'NOTA_FISCAL', 'CONTRATO', 'LAUDO_LABORATORIAL', 'FOTO_AMOSTRA',
    'FOTO_LOTE', 'FOTO_CARGA', 'RELATORIO_TECNICO', 'CERTIFICADO',
    'DOCUMENTO_TRANSPORTE', 'RASTREABILIDADE', 'ANALISE_SOLO', 'OUTROS'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS documentos (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nome_arquivo       TEXT NOT NULL,
  url_arquivo        TEXT,
  tamanho_bytes      BIGINT,
  mime_type          TEXT,
  tipo_documento     tipo_documento_enum NOT NULL DEFAULT 'OUTROS',
  descricao          TEXT,
  destaque           BOOLEAN NOT NULL DEFAULT FALSE,
  versao             INTEGER NOT NULL DEFAULT 1,
  modulo_origem      TEXT,
  entidade_id        UUID,
  entidade_descricao TEXT,
  usuario_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fazenda_id         UUID REFERENCES fazendas(id) ON DELETE SET NULL,
  safra_id           UUID REFERENCES safras(id) ON DELETE SET NULL,
  venda_id           UUID REFERENCES vendas_graos(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_doc_modulo    ON documentos(modulo_origem);
CREATE INDEX IF NOT EXISTS idx_doc_tipo      ON documentos(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_doc_destaque  ON documentos(destaque) WHERE destaque = TRUE;
CREATE INDEX IF NOT EXISTS idx_doc_fazenda   ON documentos(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_doc_entidade  ON documentos(entidade_descricao);

ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS doc_sel ON documentos;
DROP POLICY IF EXISTS doc_ins ON documentos;
DROP POLICY IF EXISTS doc_upd ON documentos;
DROP POLICY IF EXISTS doc_del ON documentos;

CREATE POLICY doc_sel ON documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY doc_ins ON documentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY doc_upd ON documentos FOR UPDATE TO authenticated USING (true);
CREATE POLICY doc_del ON documentos FOR DELETE TO authenticated USING (true);

-- Trigger pra manter updated_at
CREATE OR REPLACE FUNCTION set_documentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_documentos_updated ON documentos;
CREATE TRIGGER trg_documentos_updated
  BEFORE UPDATE ON documentos
  FOR EACH ROW EXECUTE FUNCTION set_documentos_updated_at();

-- View dossie do lote — agrupa docs por safra/fazenda
CREATE OR REPLACE VIEW v_dossie_lote AS
SELECT d.*, f.nome AS fazenda_nome, s.cultura, s.ano_agricola
FROM documentos d
LEFT JOIN fazendas f ON f.id = d.fazenda_id
LEFT JOIN safras   s ON s.id = d.safra_id
ORDER BY d.created_at DESC;
