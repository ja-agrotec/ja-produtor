-- ============================================================
-- 0013_superadmin_role.sql
--
-- Adiciona role 'superadmin' separando admin do sistema de
-- admin de fazenda.
--
-- Hoje:
--   admin -> acesso total ao banco (compartilhado entre dono do
--            sistema E donos das fazendas que ele cadastra). Bug:
--            qualquer dono de fazenda criado como admin via o
--            painel administrativo do sistema (/admin).
--
-- Depois desta migration:
--   superadmin -> dono do sistema. Ve /admin, gerencia planos,
--                 ve TODOS os users e fazendas. SO O CRIADOR
--                 ORIGINAL DA PLATAFORMA.
--   admin      -> admin de fazenda. Acesso total na propria
--                 fazenda, mas SEM /admin do sistema.
--   gerente, operador, visualizador -> sem mudanca.
--
-- RLS (get_user_role()) continua funcionando: as policies que
-- liberam pra 'admin' tambem precisam liberar pra 'superadmin'.
-- ============================================================

-- 1. Atualiza CHECK constraint pra aceitar 'superadmin'
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_role_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_role_check
  CHECK (role IN ('superadmin','admin','gerente','operador','visualizador'));

-- 2. Promove o criador original pra superadmin
-- ATENCAO: ajuste o email se nao for alanjader@gmail.com
UPDATE usuarios
SET role = 'superadmin'
WHERE email = 'alanjader@gmail.com';

-- 3. Atualiza policies que liberam admin pra liberar superadmin tambem.
-- A policy "Admin vê tudo" do schema 0001 ja seria suficiente, mas
-- nao queremos que admin de fazenda perca acesso. Solucao: liberar
-- tanto admin quanto superadmin nas policies existentes.
--
-- Aqui so refazemos as policies de fazendas/usuarios que ja existiam
-- com 'admin'. Outras tabelas com a mesma policy seguem.

-- Re-cria policy "Admin gerencia todas as fazendas"
DROP POLICY IF EXISTS "Admin gerencia todas as fazendas" ON fazendas;
CREATE POLICY "Admin gerencia todas as fazendas" ON fazendas
  FOR ALL USING (get_user_role() IN ('admin','superadmin'));

-- Re-cria policy "Admin gerencia usuarios"
DROP POLICY IF EXISTS "Admin gerencia usuarios" ON usuarios;
CREATE POLICY "Admin gerencia usuarios" ON usuarios
  FOR ALL USING (get_user_role() IN ('admin','superadmin'));

-- Verificacao pos-execucao (rode no SQL Editor):
--
-- SELECT email, role, plano_id FROM usuarios WHERE role IN ('admin','superadmin') ORDER BY criado_em;
--
-- Esperado: alanjader@gmail.com com role='superadmin'.
