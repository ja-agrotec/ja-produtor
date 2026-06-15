-- ============================================================
-- 0016_trigger_criado_por.sql
--
-- BUG: cliente novo no onboarding recebia
-- "new row violates row-level security policy for table fazendas"
-- ao tentar criar a primeira fazenda.
--
-- Causa: a policy fazendas_insert do 0014 exige
--   criado_por = get_user_id()
-- O client do /onboarding tenta buscar usuarios.id via select
-- e setar no payload, mas a query pode falhar silenciosamente
-- (RLS, race com sessao recem-criada, etc) e mandar criado_por
-- NULL. Aí a check falha (NULL != uuid).
--
-- FIX: trigger BEFORE INSERT no banco SEMPRE preenche criado_por
-- com get_user_id() do usuario logado. Mais robusto: nao depende
-- do client, e admins so podem inserir fazendas como eles
-- mesmos (impossivel burlar mandando outro UUID).
--
-- Superadmin: trigger nao sobrescreve se vier um criado_por explicito,
-- pra manter possibilidade de admin do sistema reatribuir fazenda.
-- ============================================================

-- 1. Function que preenche criado_por
CREATE OR REPLACE FUNCTION set_fazenda_criado_por()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_user UUID;
BEGIN
  v_role := get_user_role();
  v_user := get_user_id();

  -- Admin SEMPRE vai ser dono das proprias fazendas (ignora o que client mandou)
  IF v_role = 'admin' THEN
    NEW.criado_por := v_user;
  -- Superadmin: respeita o que veio; se NULL, usa o proprio id
  ELSIF v_role = 'superadmin' AND NEW.criado_por IS NULL THEN
    NEW.criado_por := v_user;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger
DROP TRIGGER IF EXISTS trg_fazenda_criado_por ON fazendas;
CREATE TRIGGER trg_fazenda_criado_por
  BEFORE INSERT ON fazendas
  FOR EACH ROW
  EXECUTE FUNCTION set_fazenda_criado_por();

-- 3. Simplifica policy fazendas_insert (agora confia no trigger)
DROP POLICY IF EXISTS "fazendas_insert" ON fazendas;
CREATE POLICY "fazendas_insert" ON fazendas FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() IN ('superadmin', 'admin')
  );

-- Verificacao pos-execucao:
-- Logado como cliente (role=admin):
--   INSERT INTO fazendas (nome, ativo) VALUES ('Test', true) RETURNING criado_por;
--   -- criado_por deve sair preenchido com o id do usuario, NUNCA NULL
