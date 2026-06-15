-- ============================================================
-- 0017_recriar_policies_fazendas.sql
--
-- O debug E2E mostrou que mesmo apos a 0016, o INSERT em fazendas
-- como cliente novo continua falhando com RLS - tanto com criado_por
-- vazio (esperando o trigger) quanto explicito (com get_user_id()
-- correto).
--
-- Causa provavel: alguma policy residual de migrations antigas
-- (0001/0006/0007/0014/0016) ficou em vigor com check mais restrito.
-- Migrations sucessivas com IF EXISTS podem ter deixado lixo.
--
-- FIX: limpa TODAS as policies de fazendas dinamicamente e recria
-- do zero com o modelo correto (igual ao 0007 fez para outras
-- tabelas). Tambem recria o trigger pra garantir.
-- ============================================================

-- 1. Limpa todas as policies de fazendas
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fazendas'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.fazendas', pol.policyname);
    RAISE NOTICE 'dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- 2. Garante RLS habilitado
ALTER TABLE public.fazendas ENABLE ROW LEVEL SECURITY;

-- 3. Cria as 4 policies (SELECT, INSERT, UPDATE, DELETE) limpas
CREATE POLICY "fazendas_select" ON fazendas FOR SELECT TO authenticated
  USING (id IN (SELECT fazendas_visiveis()));

CREATE POLICY "fazendas_insert" ON fazendas FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() IN ('superadmin', 'admin')
  );

CREATE POLICY "fazendas_update" ON fazendas FOR UPDATE TO authenticated
  USING (id IN (SELECT fazendas_visiveis()))
  WITH CHECK (id IN (SELECT fazendas_visiveis()));

CREATE POLICY "fazendas_delete" ON fazendas FOR DELETE TO authenticated
  USING (id IN (SELECT fazendas_visiveis()));

-- 4. Garante trigger BEFORE INSERT que preenche criado_por
CREATE OR REPLACE FUNCTION set_fazenda_criado_por()
RETURNS TRIGGER AS $$
DECLARE
  v_user UUID;
BEGIN
  v_user := get_user_id();
  -- Sempre sobrescreve se admin (admin nao pode mentir sobre quem criou)
  IF get_user_role() = 'admin' THEN
    NEW.criado_por := v_user;
  -- Superadmin: respeita explicito, ou usa proprio se NULL
  ELSIF get_user_role() = 'superadmin' AND NEW.criado_por IS NULL THEN
    NEW.criado_por := v_user;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_fazenda_criado_por ON fazendas;
CREATE TRIGGER trg_fazenda_criado_por
  BEFORE INSERT ON fazendas
  FOR EACH ROW
  EXECUTE FUNCTION set_fazenda_criado_por();

-- 5. RPC pra debug futuro de policies (util pra E2E e troubleshooting)
CREATE OR REPLACE FUNCTION debug_policies(t TEXT)
RETURNS TABLE(policyname TEXT, cmd TEXT, qual TEXT, with_check TEXT) AS $$
  SELECT policyname::TEXT, cmd::TEXT, qual::TEXT, with_check::TEXT
  FROM pg_policies WHERE tablename = t AND schemaname = 'public';
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Verificacao pos-execucao (rode no SQL Editor):
-- SELECT * FROM debug_policies('fazendas');
-- Esperado: 4 rows (select, insert, update, delete) com check correto.
