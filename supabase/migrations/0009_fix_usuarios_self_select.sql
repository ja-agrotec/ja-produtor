-- ============================================================
-- 0009_fix_usuarios_self_select.sql
-- BUG: a policy "Usuario ve proprio perfil" do schema 0001 compara
--   auth.uid() = usuarios.id
-- Mas auth.uid() retorna o ID da auth.users (que e o auth_id em
-- public.usuarios), nao o usuarios.id (que e PK gerada pelo banco).
-- Resultado: usuario logado NUNCA conseguia ler proprio perfil,
-- entao redirect por role falhava (sempre fallback /home), entao
-- /operador era inacessivel na pratica.
--
-- FIX: trocar comparacao pra auth_id.
-- ============================================================

DROP POLICY IF EXISTS "Usuario ve proprio perfil" ON usuarios;
CREATE POLICY "Usuario ve proprio perfil" ON usuarios
  FOR SELECT USING (auth.uid() = auth_id);

-- Verificacao pos-execucao (rode no SQL Editor):
--
-- SELECT policyname, qual FROM pg_policies WHERE tablename = 'usuarios';
--
-- A row com policyname='Usuario ve proprio perfil' deve ter
-- qual = '(auth.uid() = auth_id)'.
