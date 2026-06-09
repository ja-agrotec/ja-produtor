-- ============================================================
-- 0010_fix_rls_functions_auth_id.sql
-- Sequela do bug que a 0009 fixou parcialmente.
--
-- As funções get_user_role() e get_user_fazenda() do schema 0001
-- também comparam auth.uid() = usuarios.id em vez de auth_id.
-- Por isso ambas retornam NULL pra qualquer user, exceto admin legacy
-- (alanjader) cujo usuarios.id por coincidência == auth.users.id e
-- cujo auth_id está NULL.
--
-- Consequências quando o operador teste tenta criar lançamento:
--   - get_user_role() = NULL  -> policy "admin OR fazenda matching" falha
--   - get_user_fazenda() = NULL -> idem
--   - INSERT em lancamentos retorna 403 row-level security
--
-- Fix em 2 passos:
-- 1) Atualizar registros legacy onde usuarios.id == auth.users.id pra
--    setar auth_id = id (caso do admin alanjader)
-- 2) Recriar as 2 funções comparando auth_id em vez de id
-- ============================================================

-- 1. Backfill admin/legacy users cujo usuarios.id casualmente bate com auth.users.id
UPDATE public.usuarios u
SET auth_id = u.id
WHERE u.auth_id IS NULL
  AND EXISTS (SELECT 1 FROM auth.users a WHERE a.id = u.id);

-- 2. Recria funções usando auth_id
CREATE OR REPLACE FUNCTION get_user_role() RETURNS TEXT AS $$
  SELECT role FROM public.usuarios WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_fazenda() RETURNS UUID AS $$
  SELECT fazenda_id FROM public.usuarios WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Verificacao pos-execucao (rode no SQL Editor):
--
-- SELECT u.email, u.role, u.auth_id, u.fazenda_id
-- FROM public.usuarios u
-- WHERE u.role = 'admin' OR u.role = 'operador';
--
-- Esperado: todos com auth_id preenchido.
--
-- Depois, logado como qualquer user, a funcao deve responder
-- corretamente:
--   SELECT get_user_role();      -- retorna 'admin' / 'operador' / etc.
--   SELECT get_user_fazenda();   -- retorna UUID da fazenda (ou NULL pra admin)
