-- ============================================================
-- 0014_isolamento_por_cliente.sql
--
-- BUG CRITICO: cliente novo logando estava vendo dados de TODAS
-- as fazendas do sistema (de outros clientes). Causa: a policy
-- "Admin gerencia todas as fazendas" libera get_user_role() IN
-- ('admin','superadmin'), mas o admin de fazenda nao deveria ver
-- fazendas de outros clientes - so as proprias.
--
-- Outras 5 tabelas (vendas_graos, entregas_graos, qualidade_registro,
-- despesas_fixas, analise_solo) estao com policy USING (true) desde
-- a migration 0007 (fix emergencial pos-vazamento publico). Tambem
-- precisam isolamento por fazenda.
--
-- MODELO:
--   superadmin -> ve TUDO (admin do sistema)
--   admin      -> ve fazendas onde criado_por = ele + tudo das suas fazendas
--   gerente/operador/visualizador -> ve so a fazenda associada (usuarios.fazenda_id)
-- ============================================================

-- 1. Helper: ID do usuario atual em public.usuarios
CREATE OR REPLACE FUNCTION get_user_id() RETURNS UUID AS $$
  SELECT id FROM public.usuarios WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 2. Helper: retorna IDs das fazendas visiveis pro user atual
CREATE OR REPLACE FUNCTION fazendas_visiveis() RETURNS SETOF UUID AS $$
  SELECT id FROM public.fazendas
  WHERE
    get_user_role() = 'superadmin'
    OR (get_user_role() = 'admin' AND criado_por = get_user_id())
    OR (get_user_role() IN ('gerente','operador','visualizador') AND id = get_user_fazenda());
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 3. fazendas: policies por escopo
DROP POLICY IF EXISTS "Admin gerencia todas as fazendas" ON fazendas;
DROP POLICY IF EXISTS "Admins e gerentes veem todas" ON fazendas;
DROP POLICY IF EXISTS "Apenas admin insere fazenda" ON fazendas;
DROP POLICY IF EXISTS "Apenas admin atualiza fazenda" ON fazendas;
DROP POLICY IF EXISTS "fazendas_select" ON fazendas;
DROP POLICY IF EXISTS "fazendas_insert" ON fazendas;
DROP POLICY IF EXISTS "fazendas_update" ON fazendas;
DROP POLICY IF EXISTS "fazendas_delete" ON fazendas;

CREATE POLICY "fazendas_select" ON fazendas FOR SELECT TO authenticated
  USING (id IN (SELECT fazendas_visiveis()));
CREATE POLICY "fazendas_insert" ON fazendas FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = 'superadmin'
    OR (get_user_role() = 'admin' AND criado_por = get_user_id())
  );
CREATE POLICY "fazendas_update" ON fazendas FOR UPDATE TO authenticated
  USING (id IN (SELECT fazendas_visiveis()));
CREATE POLICY "fazendas_delete" ON fazendas FOR DELETE TO authenticated
  USING (id IN (SELECT fazendas_visiveis()));

-- 4. usuarios: admin so ve membros DA fazenda dele + proprio perfil
DROP POLICY IF EXISTS "Admin gerencia usuarios" ON usuarios;
DROP POLICY IF EXISTS "Admins veem todos usuarios" ON usuarios;
DROP POLICY IF EXISTS "Apenas admin gerencia usuarios" ON usuarios;
DROP POLICY IF EXISTS "usuarios_select_admin_membros" ON usuarios;
DROP POLICY IF EXISTS "usuarios_insert_admin" ON usuarios;
DROP POLICY IF EXISTS "usuarios_update_admin" ON usuarios;
DROP POLICY IF EXISTS "usuarios_delete_admin" ON usuarios;
-- "Usuario ve proprio perfil" do 0009 ja cobre o self-select

CREATE POLICY "usuarios_select_membros" ON usuarios FOR SELECT TO authenticated
  USING (
    get_user_role() = 'superadmin'
    OR (get_user_role() = 'admin' AND fazenda_id IN (SELECT fazendas_visiveis()))
  );
CREATE POLICY "usuarios_insert" ON usuarios FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('superadmin','admin'));
CREATE POLICY "usuarios_update" ON usuarios FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'superadmin'
    OR (get_user_role() = 'admin' AND fazenda_id IN (SELECT fazendas_visiveis()))
    OR auth.uid() = auth_id
  );
CREATE POLICY "usuarios_delete" ON usuarios FOR DELETE TO authenticated
  USING (get_user_role() = 'superadmin');

-- 5. Tabelas com fazenda_id direto - mesmo padrao pra todas
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
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    -- Confere se tabela existe (algumas como certificacao/documentos podem nao existir em ambientes antigos)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      RAISE NOTICE 'tabela % nao existe, pulando', t;
      CONTINUE;
    END IF;

    -- Garante RLS habilitado
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Drop TODAS as policies existentes
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    -- Cria policy nova baseada em fazendas_visiveis()
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (fazenda_id IN (SELECT fazendas_visiveis())) WITH CHECK (fazenda_id IN (SELECT fazendas_visiveis()))',
      t || '_acesso',
      t
    );
    RAISE NOTICE 'policy %_acesso criada em %', t, t;
  END LOOP;
END $$;

-- 6. manutencoes: nao tem fazenda_id direto, vai via maquina_id
DROP POLICY IF EXISTS "Acesso manutencoes" ON manutencoes;
DROP POLICY IF EXISTS "manutencoes_acesso" ON manutencoes;
CREATE POLICY "manutencoes_acesso" ON manutencoes FOR ALL TO authenticated
  USING ((SELECT fazenda_id FROM maquinas WHERE id = maquina_id) IN (SELECT fazendas_visiveis()))
  WITH CHECK ((SELECT fazenda_id FROM maquinas WHERE id = maquina_id) IN (SELECT fazendas_visiveis()));

-- 7. planos: leitura publica pra logados (todo mundo precisa ler pra mostrar opcoes)
ALTER TABLE planos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "planos_select" ON planos;
DROP POLICY IF EXISTS "planos_admin" ON planos;
CREATE POLICY "planos_select" ON planos FOR SELECT TO authenticated USING (true);
CREATE POLICY "planos_admin" ON planos FOR ALL TO authenticated USING (get_user_role() = 'superadmin') WITH CHECK (get_user_role() = 'superadmin');

-- Verificacao pos-execucao (rode no SQL Editor):
--
-- SELECT tablename, policyname, qual FROM pg_policies
-- WHERE tablename IN ('fazendas','usuarios','talhoes','safras','lancamentos','insumos','vendas_graos','despesas_fixas')
-- ORDER BY tablename, policyname;
--
-- Logado como cliente novo SEM fazenda:
-- SELECT count(*) FROM fazendas; -- esperado: 0
-- SELECT count(*) FROM talhoes;  -- esperado: 0
--
-- Logado como superadmin:
-- SELECT count(*) FROM fazendas; -- esperado: TODAS
