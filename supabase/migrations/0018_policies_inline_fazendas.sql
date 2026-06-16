-- ============================================================
-- 0018_policies_inline_fazendas.sql
--
-- Bug encontrado via debug:
--   INSERT em fazendas SEM .select() funciona (passa WITH CHECK).
--   INSERT em fazendas COM .select() falha com RLS porque o
--   RETURNING faz um SELECT da row recem-inserida, e a policy
--   SELECT usa fazendas_visiveis() que e STABLE - aparentemente
--   essa funcao retorna o snapshot ANTES do insert, entao a row
--   nova nao aparece e o SELECT e bloqueado.
--
-- Como Supabase REST SEMPRE faz returning=representation, todo
-- insert no client falha. Isso era o "new row violates RLS"
-- recorrente.
--
-- FIX: substituir as policies de fazendas por versao INLINE
-- (sem indireção via fazendas_visiveis). A logica e identica,
-- mas avaliada por row na hora.
-- ============================================================

-- 1. Substitui fazendas_select pelo inline
DROP POLICY IF EXISTS "fazendas_select" ON fazendas;
CREATE POLICY "fazendas_select" ON fazendas FOR SELECT TO authenticated
  USING (
    get_user_role() = 'superadmin'
    OR (get_user_role() = 'admin' AND criado_por = get_user_id())
    OR (get_user_role() IN ('gerente','operador','visualizador') AND id = get_user_fazenda())
  );

-- 2. Substitui fazendas_update pelo inline (mesma logica em USING e WITH CHECK)
DROP POLICY IF EXISTS "fazendas_update" ON fazendas;
CREATE POLICY "fazendas_update" ON fazendas FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'superadmin'
    OR (get_user_role() = 'admin' AND criado_por = get_user_id())
    OR (get_user_role() IN ('gerente','operador','visualizador') AND id = get_user_fazenda())
  )
  WITH CHECK (
    get_user_role() = 'superadmin'
    OR (get_user_role() = 'admin' AND criado_por = get_user_id())
    OR (get_user_role() IN ('gerente','operador','visualizador') AND id = get_user_fazenda())
  );

-- 3. Substitui fazendas_delete pelo inline
DROP POLICY IF EXISTS "fazendas_delete" ON fazendas;
CREATE POLICY "fazendas_delete" ON fazendas FOR DELETE TO authenticated
  USING (
    get_user_role() = 'superadmin'
    OR (get_user_role() = 'admin' AND criado_por = get_user_id())
    OR (get_user_role() IN ('gerente','operador','visualizador') AND id = get_user_fazenda())
  );

-- fazendas_insert nao muda - WITH CHECK so depende de role, nao precisa
-- ver fazendas existentes.

-- 4. Aplica o mesmo padrao pras tabelas filhas: substituir
-- "fazenda_id IN (SELECT fazendas_visiveis())" por subquery direta.
DO $$
DECLARE
  pol record;
  t   text;
  tbls text[] := ARRAY[
    'talhoes', 'safras', 'lancamentos', 'insumos',
    'maquinas', 'operadores',
    'vendas_graos', 'entregas_graos', 'qualidade_registro',
    'despesas_fixas', 'analise_solo',
    'certificacao_checklists', 'documentos'
  ];
  v_check text;
BEGIN
  -- Logica replicada inline: vale pra superadmin sempre,
  -- pra admin quando fazenda.criado_por = ele,
  -- pra membros quando fazenda_id = sua fazenda.
  v_check := '(
    get_user_role() = ''superadmin''
    OR (get_user_role() = ''admin''
        AND fazenda_id IN (SELECT id FROM fazendas WHERE criado_por = get_user_id()))
    OR (get_user_role() IN (''gerente'',''operador'',''visualizador'')
        AND fazenda_id = get_user_fazenda())
  )';

  FOREACH t IN ARRAY tbls LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      CONTINUE;
    END IF;

    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (%s) WITH CHECK (%s)',
      t || '_acesso', t, v_check, v_check
    );
    RAISE NOTICE 'policy %_acesso recriada inline em %', t, t;
  END LOOP;
END $$;

-- 5. manutencoes: idem com join via maquinas
DROP POLICY IF EXISTS "manutencoes_acesso" ON manutencoes;
CREATE POLICY "manutencoes_acesso" ON manutencoes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM maquinas m WHERE m.id = manutencoes.maquina_id AND (
        get_user_role() = 'superadmin'
        OR (get_user_role() = 'admin' AND m.fazenda_id IN (SELECT id FROM fazendas WHERE criado_por = get_user_id()))
        OR (get_user_role() IN ('gerente','operador','visualizador') AND m.fazenda_id = get_user_fazenda())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM maquinas m WHERE m.id = manutencoes.maquina_id AND (
        get_user_role() = 'superadmin'
        OR (get_user_role() = 'admin' AND m.fazenda_id IN (SELECT id FROM fazendas WHERE criado_por = get_user_id()))
        OR (get_user_role() IN ('gerente','operador','visualizador') AND m.fazenda_id = get_user_fazenda())
      )
    )
  );

-- Verificacao pos-execucao:
-- SELECT * FROM debug_policies('fazendas');
-- SELECT * FROM debug_policies('talhoes');
