-- ============================================================
-- 0019_indices_rls_performance.sql
--
-- Audit de performance revelou: policies inline (migration 0018)
-- fazem subselect WHERE criado_por = get_user_id() em fazendas
-- pra todo SELECT em tabelas filhas. Sem indice em criado_por,
-- e full table scan a cada query. Com escalar de clientes vira
-- bottleneck exponencial.
--
-- Esta migration cria os indices essenciais que faltavam.
-- ============================================================

-- 1. INDICE CRITICO: fazendas.criado_por
-- Usado em TODAS as policies RLS das tabelas filhas.
CREATE INDEX IF NOT EXISTS idx_fazendas_criado_por
  ON fazendas(criado_por)
  WHERE ativo = TRUE;

-- 2. fazendas.ativo - filtro comum
CREATE INDEX IF NOT EXISTS idx_fazendas_ativo
  ON fazendas(ativo);

-- 3. usuarios.auth_id - usado em get_user_role/get_user_id (toda query autenticada)
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_id
  ON usuarios(auth_id);

-- 4. usuarios.plano_id - join em /admin distribuicao por plano
CREATE INDEX IF NOT EXISTS idx_usuarios_plano_id
  ON usuarios(plano_id);

-- 5. lancamentos.safra_id - filtro em /fechamento-safra e /dashboard
CREATE INDEX IF NOT EXISTS idx_lancamentos_safra
  ON lancamentos(safra_id);

-- 6. lancamentos.data_lancamento - filtro temporal em /dashboard e /ia-operacional
CREATE INDEX IF NOT EXISTS idx_lancamentos_data
  ON lancamentos(data_lancamento DESC);

-- 7. lancamentos.tipo - filtro em todos os agregados
CREATE INDEX IF NOT EXISTS idx_lancamentos_tipo
  ON lancamentos(tipo);

-- 8. lancamentos.status - quase toda query filtra status='confirmado'
CREATE INDEX IF NOT EXISTS idx_lancamentos_status
  ON lancamentos(status);

-- 9. vendas_graos.fazenda_id - RLS + filtros de tela
CREATE INDEX IF NOT EXISTS idx_vendas_graos_fazenda
  ON vendas_graos(fazenda_id);

-- 10. safras.status - filtro 'aberta' em quase tudo
CREATE INDEX IF NOT EXISTS idx_safras_status
  ON safras(status);

-- 11. talhoes.ativo + fazenda_id (composto)
CREATE INDEX IF NOT EXISTS idx_talhoes_ativo_fazenda
  ON talhoes(fazenda_id, ativo);

-- 12. insumos.fazenda_id + ativo (composto)
CREATE INDEX IF NOT EXISTS idx_insumos_fazenda_ativo
  ON insumos(fazenda_id, ativo);

-- Verificacao pos-execucao:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'fazendas';
-- SELECT indexname FROM pg_indexes WHERE tablename = 'lancamentos';
