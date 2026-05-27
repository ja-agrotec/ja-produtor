-- ==========================================================
-- JA AGRO INTELLIGENCE -- Migração: tipo_cobranca
-- Adiciona campo tipo_cobranca e campos relacionados
-- nas tabelas: insumos, maquinas, categorias_lancamento
-- ==========================================================
-- Execute este SQL no Supabase SQL Editor:
-- Supabase Dashboard > SQL Editor > New Query

-- 1. Tabela: insumos
-- tipo_cobranca: como o insumo é cobrado no lançamento
ALTER TABLE insumos
  ADD COLUMN IF NOT EXISTS tipo_cobranca TEXT DEFAULT 'por_unidade'
    CHECK (tipo_cobranca IN ('por_unidade','por_ha','por_hora','por_dia','fixo','outro'));

COMMENT ON COLUMN insumos.tipo_cobranca IS
  'Tipo de cobrança do lançamento: por_unidade (padrão), por_ha, por_hora, por_dia, fixo';

-- 2. Tabela: maquinas
-- tipo_cobranca: como a máquina é cobrada (por_hora é padrão)
-- custo_ha: custo por hectare (para máquinas cobradas por área)
-- custo_dia: custo por dia (para máquinas/equipamentos cobrados por dia)
ALTER TABLE maquinas
  ADD COLUMN IF NOT EXISTS tipo_cobranca TEXT DEFAULT 'por_hora'
    CHECK (tipo_cobranca IN ('por_hora','por_ha','por_dia','fixo','outro')),
  ADD COLUMN IF NOT EXISTS custo_ha NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_dia NUMERIC(10,2) DEFAULT 0;

COMMENT ON COLUMN maquinas.tipo_cobranca IS
  'Tipo de cobrança: por_hora (padrão), por_ha (pulverizadores por área), por_dia';
COMMENT ON COLUMN maquinas.custo_ha IS
  'Custo por hectare — usado quando tipo_cobranca = por_ha';
COMMENT ON COLUMN maquinas.custo_dia IS
  'Custo por dia — usado quando tipo_cobranca = por_dia';

-- 3. Tabela: categorias_lancamento
-- tipo_cobranca: tipo padrão de cobrança para a categoria
ALTER TABLE categorias_lancamento
  ADD COLUMN IF NOT EXISTS tipo_cobranca TEXT DEFAULT 'por_unidade'
    CHECK (tipo_cobranca IN ('por_unidade','por_ha','por_hora','por_dia','fixo','outro'));

COMMENT ON COLUMN categorias_lancamento.tipo_cobranca IS
  'Tipo de cobrança padrão da categoria (inferido automaticamente se NULL)';

-- 4. Atualizar valores padrão por categoria (opcional - baseado nos nomes)
UPDATE categorias_lancamento SET tipo_cobranca = 'por_ha'
  WHERE nome ILIKE '%arrenda%' OR nome ILIKE '%irriga%' OR nome ILIKE '%correti%';

UPDATE categorias_lancamento SET tipo_cobranca = 'por_dia'
  WHERE nome ILIKE '%mao de obra%' OR nome ILIKE '%mão de obra%' OR nome ILIKE '%servico%' OR nome ILIKE '%serviço%';

-- 5. Tabela: lancamentos
-- custo_unitario: valor unitário registrado no momento do lançamento
ALTER TABLE lancamentos
  ADD COLUMN IF NOT EXISTS custo_unitario NUMERIC(10,2);

COMMENT ON COLUMN lancamentos.custo_unitario IS
  'Custo unitário no momento do lançamento (R$/ha, R$/hora, R$/dia, R$/unidade)';

-- ==========================================================
-- Tipos de cobrança disponíveis:
--   por_unidade  -> quantidade x preco_unitario = custo_total
--   por_hora     -> horas x custo_hora = custo_total (maquinas)
--   por_ha       -> area_ha x custo_ha = custo_total  
--   por_dia      -> dias x custo_dia = custo_total
--   fixo         -> valor fixo, sem cálculo automático
-- ==========================================================
