-- ============================================================
-- RLS FIX — fecha vazamento publico em 5 tabelas
-- ============================================================
-- Migrations historicas (0003_vendas_exportacao, e schemas iniciais
-- de despesas_fixas/analise_solo) criaram policies com USING (true),
-- expondo dados pra qualquer chamada com a anon key (que esta publica
-- no bundle JS do front).
--
-- Esta migration troca por USING (auth.role() = 'authenticated'),
-- exigindo login pra qualquer operacao nessas tabelas.
--
-- Padrao adotado pra MVP. Pode evoluir depois pra modelo por fazenda
-- (USING (get_user_role()='admin' OR fazenda_id = get_user_fazenda()))
-- quando todos os usuarios tiverem registro completo em public.usuarios.
-- ============================================================

-- vendas_graos
ALTER TABLE vendas_graos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vendas_graos_select" ON vendas_graos;
DROP POLICY IF EXISTS "vendas_graos_insert" ON vendas_graos;
DROP POLICY IF EXISTS "vendas_graos_update" ON vendas_graos;
DROP POLICY IF EXISTS "vendas_graos_delete" ON vendas_graos;
DROP POLICY IF EXISTS "vendas_graos_auth_all" ON vendas_graos;
CREATE POLICY "vendas_graos_auth_all" ON vendas_graos
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- entregas_graos
ALTER TABLE entregas_graos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "entregas_graos_select" ON entregas_graos;
DROP POLICY IF EXISTS "entregas_graos_insert" ON entregas_graos;
DROP POLICY IF EXISTS "entregas_graos_update" ON entregas_graos;
DROP POLICY IF EXISTS "entregas_graos_delete" ON entregas_graos;
DROP POLICY IF EXISTS "entregas_graos_auth_all" ON entregas_graos;
CREATE POLICY "entregas_graos_auth_all" ON entregas_graos
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- qualidade_registro
ALTER TABLE qualidade_registro ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "qualidade_registro_select" ON qualidade_registro;
DROP POLICY IF EXISTS "qualidade_registro_insert" ON qualidade_registro;
DROP POLICY IF EXISTS "qualidade_registro_update" ON qualidade_registro;
DROP POLICY IF EXISTS "qualidade_registro_delete" ON qualidade_registro;
DROP POLICY IF EXISTS "qualidade_registro_auth_all" ON qualidade_registro;
CREATE POLICY "qualidade_registro_auth_all" ON qualidade_registro
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- despesas_fixas
ALTER TABLE despesas_fixas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "despesas_fixas_select" ON despesas_fixas;
DROP POLICY IF EXISTS "despesas_fixas_acesso_fazenda" ON despesas_fixas;
DROP POLICY IF EXISTS "despesas_fixas_auth_all" ON despesas_fixas;
CREATE POLICY "despesas_fixas_auth_all" ON despesas_fixas
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- analise_solo
ALTER TABLE analise_solo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "analise_solo_select" ON analise_solo;
DROP POLICY IF EXISTS "analise_solo_acesso_fazenda" ON analise_solo;
DROP POLICY IF EXISTS "analise_solo_auth_all" ON analise_solo;
CREATE POLICY "analise_solo_auth_all" ON analise_solo
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Verificacao manual pos-execucao (rode no SQL Editor):
--
-- SELECT tablename, policyname, roles, qual
-- FROM pg_policies
-- WHERE tablename IN ('vendas_graos','entregas_graos','qualidade_registro','despesas_fixas','analise_solo')
-- ORDER BY tablename, policyname;
--
-- Esperado: 1 policy por tabela, roles={authenticated}, qual='true'.
-- ============================================================
