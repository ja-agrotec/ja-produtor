-- ============================================================
-- MIGRATION: Vendas Exportacao + Qualidade + Certificacao
-- Execute no SQL Editor do Supabase
-- Data: 2026-05-08
-- ============================================================

-- 1. Adicionar colunas na tabela vendas_graos
ALTER TABLE vendas_graos 
  ADD COLUMN IF NOT EXISTS qualidade_registro_id UUID REFERENCES qualidade_registro(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS checklist_exportacao JSONB;

-- 2. Atualizar constraint de tipo_contrato para incluir exportacao
ALTER TABLE vendas_graos 
  DROP CONSTRAINT IF EXISTS vendas_graos_tipo_contrato_check;
  
ALTER TABLE vendas_graos 
  ADD CONSTRAINT vendas_graos_tipo_contrato_check 
  CHECK (tipo_contrato IN ('disponivel','forward','troca','fixacao','cbot','exportacao'));

-- 3. Adicionar colunas de certificacao em fazendas e talhoes (se nao existirem)
ALTER TABLE fazendas 
  ADD COLUMN IF NOT EXISTS certificada BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tipo_certificacao TEXT;

ALTER TABLE talhoes 
  ADD COLUMN IF NOT EXISTS segue_certificacao BOOLEAN DEFAULT TRUE;

ALTER TABLE insumos 
  ADD COLUMN IF NOT EXISTS certificacao_permitida BOOLEAN DEFAULT TRUE;

-- 4. Criar tabela qualidade_registro se nao existir
CREATE TABLE IF NOT EXISTS qualidade_registro (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fazenda_id       UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  safra_id         UUID REFERENCES safras(id) ON DELETE SET NULL,
  talhao_id        UUID REFERENCES talhoes(id) ON DELETE SET NULL,
  cultura          TEXT NOT NULL,
  data_registro    DATE NOT NULL DEFAULT CURRENT_DATE,
  dados_qualidade  JSONB NOT NULL DEFAULT '{}',
  observacoes      TEXT,
  responsavel      TEXT,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS para qualidade_registro
ALTER TABLE qualidade_registro ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "qualidade_registro_all" ON qualidade_registro FOR ALL USING (true);

-- 5. Criar tabela entregas_graos se nao existir
CREATE TABLE IF NOT EXISTS entregas_graos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venda_id      UUID NOT NULL REFERENCES vendas_graos(id) ON DELETE CASCADE,
  talhao_id     UUID REFERENCES talhoes(id) ON DELETE SET NULL,
  quantidade_sc NUMERIC(12,2) NOT NULL DEFAULT 0,
  data_entrega  DATE,
  nota_fiscal   TEXT,
  observacoes   TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS para entregas_graos
ALTER TABLE entregas_graos ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "entregas_graos_all" ON entregas_graos FOR ALL USING (true);

-- 6. Indices para performance
CREATE INDEX IF NOT EXISTS idx_vendas_qualidade ON vendas_graos(qualidade_registro_id);
CREATE INDEX IF NOT EXISTS idx_qualidade_fazenda ON qualidade_registro(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_qualidade_safra ON qualidade_registro(safra_id);
CREATE INDEX IF NOT EXISTS idx_entregas_venda ON entregas_graos(venda_id);
