-- ============================================================
-- 0015_aceite_termos.sql
--
-- Registra o aceite dos Termos de Uso + Politica de Privacidade
-- no primeiro acesso. Necessario pra rastreabilidade LGPD: se
-- houver disputa, mostramos quando o cliente aceitou e qual a
-- versao do documento.
--
-- Modelo simples: 1 timestamp em usuarios. Versao do documento
-- fica implicita pela data (compara contra data ATUALIZACAO em
-- /termos e /privacidade).
-- ============================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS termos_aceitos_em TIMESTAMPTZ;

-- Backfill: superadmin e admins existentes ja "concordaram" implicitamente
-- ao usar o sistema antes da feature existir. Marca como aceito agora pra
-- nao bloquear o uso deles.
UPDATE usuarios
SET termos_aceitos_em = NOW()
WHERE termos_aceitos_em IS NULL
  AND role IN ('superadmin', 'admin');

-- Verificacao pos-execucao:
-- SELECT email, role, termos_aceitos_em FROM usuarios ORDER BY criado_em DESC;
