-- ============================================================
-- 0011_maquinas_depreciacao.sql
--
-- Adiciona colunas pra calcular depreciacao linha-reta no
-- fechamento de safra. lib/types.ts ja previa essas colunas
-- desde a v2.0.0, mas o schema base (0001) nunca as criou.
--
-- Modelo:
--   depreciacao_anual = (valor_aquisicao - valor_residual) / vida_util_anos
--   depreciacao_safra = depreciacao_anual * (meses_safra / 12)
--
-- valor_residual default 0 = depreciacao total ao fim da vida util
-- custo_hora opcional pra rateio futuro por apontamento de uso
-- ============================================================

ALTER TABLE maquinas
  ADD COLUMN IF NOT EXISTS valor_aquisicao  NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS ano_aquisicao    INTEGER,
  ADD COLUMN IF NOT EXISTS vida_util_anos   INTEGER,
  ADD COLUMN IF NOT EXISTS valor_residual   NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_hora       NUMERIC(10,2);

-- Verificacao pos-execucao (rode no SQL Editor):
--
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'maquinas'
--   AND column_name IN ('valor_aquisicao','ano_aquisicao','vida_util_anos','valor_residual','custo_hora');
--
-- Esperado: 5 rows.
