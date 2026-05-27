-- Módulo Documentos / Anexos — JA Agro Intelligence v2.0
-- Schema para Supabase/PostgreSQL

CREATE TYPE tipo_documento_enum AS ENUM (
  'NOTA_FISCAL', 'CONTRATO', 'LAUDO_LABORATORIAL', 'FOTO_AMOSTRA',
  'FOTO_LOTE', 'FOTO_CARGA', 'RELATORIO_TECNICO', 'CERTIFICADO',
  'DOCUMENTO_TRANSPORTE', 'RASTREABILIDADE', 'ANALISE_SOLO', 'OUTROS'
);

CREATE TABLE documentos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nome_arquivo     TEXT NOT NULL,
  url_arquivo      TEXT,
  tamanho_bytes    BIGINT,
  mime_type        TEXT,
  tipo_documento   tipo_documento_enum NOT NULL DEFAULT 'OUTROS',
  descricao        TEXT,
  destaque         BOOLEAN NOT NULL DEFAULT FALSE,
  versao           INTEGER NOT NULL DEFAULT 1,
  modulo_origem    TEXT,
  entidade_id      UUID,
  entidade_descricao TEXT,
  usuario_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fazenda_id       UUID REFERENCES fazendas(id) ON DELETE SET NULL,
  safra_id         UUID REFERENCES safras(id) ON DELETE SET NULL,
  lote_id          UUID REFERENCES qualidade_lotes(analise_qualidade_id) ON DELETE SET NULL,
  venda_id         UUID REFERENCES vendas_graos(id) ON DELETE SET NULL
);

CREATE INDEX idx_doc_modulo ON documentos(modulo_origem);
CREATE INDEX idx_doc_tipo ON documentos(tipo_documento);
CREATE INDEX idx_doc_destaque ON documentos(destaque) WHERE destaque = TRUE;

ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY doc_sel ON documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY doc_ins ON documentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY doc_upd ON documentos FOR UPDATE TO authenticated USING (usuario_id = auth.uid());
CREATE POLICY doc_del ON documentos FOR DELETE TO authenticated USING (usuario_id = auth.uid());

CREATE OR REPLACE VIEW v_dossie_lote AS
SELECT d.*, f.nome AS fazenda_nome, s.cultura, s.ano_agricola
FROM documentos d
LEFT JOIN fazendas f ON f.id = d.fazenda_id
LEFT JOIN safras s ON s.id = d.safra_id
ORDER BY d.created_at DESC;
