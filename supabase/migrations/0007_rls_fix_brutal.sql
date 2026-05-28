-- ============================================================
-- 0007_rls_fix_brutal.sql
-- A migration 0006 deixou policies antigas residuais em 5 tabelas
-- (nomes diferentes do esperado), entao o vazamento publico continuou.
-- Esta migration faz limpeza dinamica: lista todas as policies
-- existentes nessas tabelas e dropa todas, depois cria UMA unica
-- policy 'authenticated only' por tabela.
-- ============================================================

DO $$
DECLARE
  pol  record;
  t    text;
  tbls text[] := ARRAY[
    'vendas_graos',
    'entregas_graos',
    'qualidade_registro',
    'despesas_fixas',
    'analise_solo'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    -- 1. Garante RLS habilitado
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- 2. Drop TODAS as policies existentes nessa tabela
    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
      RAISE NOTICE 'dropped policy % on %', pol.policyname, t;
    END LOOP;

    -- 3. Cria a unica policy nova: somente autenticados, full access
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t || '_auth_all',
      t
    );
    RAISE NOTICE 'created policy %_auth_all on %', t, t;
  END LOOP;
END $$;

-- Verificacao (rode no SQL Editor pra confirmar):
--
-- SELECT tablename, policyname, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('vendas_graos','entregas_graos','qualidade_registro','despesas_fixas','analise_solo')
-- ORDER BY tablename;
--
-- Esperado: EXATAMENTE 1 row por tabela, roles={authenticated}, qual='true'.
