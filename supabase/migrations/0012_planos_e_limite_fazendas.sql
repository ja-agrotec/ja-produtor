-- ============================================================
-- 0012_planos_e_limite_fazendas.sql
--
-- Implementa planos comerciais com limite de fazendas por usuario.
-- Sem esse limite, qualquer user free podia cadastrar dezenas de
-- fazendas e usar a infra sem pagar.
--
-- Modelo:
--   - tabela planos (codigo, nome, max_fazendas, ativo)
--     max_fazendas NULL = ilimitado
--   - usuarios.plano_id FK pra planos (default: Pequeno)
--   - fazendas.criado_por FK pra usuarios pra contar quem criou o que
--   - View planos com count atual usado pelo painel admin
--
-- Limite e validado no client (lib/limites.ts) + idealmente no
-- futuro tambem via RLS check; por agora confiamos no client +
-- monitoramento via painel admin.
-- ============================================================

-- 1. Tabela planos
CREATE TABLE IF NOT EXISTS planos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo          TEXT NOT NULL UNIQUE,
  nome            TEXT NOT NULL,
  descricao       TEXT,
  max_fazendas    INTEGER, -- NULL = ilimitado
  ordem           INTEGER NOT NULL DEFAULT 0,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Seed dos 4 planos
INSERT INTO planos (codigo, nome, descricao, max_fazendas, ordem)
VALUES
  ('pequeno',   'Pequeno',   'Pequeno produtor: 1 fazenda',           1,    1),
  ('medio',     'Medio',     'Medio produtor: ate 3 fazendas',        3,    2),
  ('grande',    'Grande',    'Grande produtor: ate 8 fazendas',       8,    3),
  ('ilimitado', 'Ilimitado', 'Grupos, integradores: sem limite',      NULL, 4)
ON CONFLICT (codigo) DO NOTHING;

-- 3. Coluna plano_id em usuarios, default = Pequeno
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS plano_id UUID REFERENCES planos(id);

-- Backfill: usuarios existentes sem plano viram Pequeno
UPDATE usuarios
SET plano_id = (SELECT id FROM planos WHERE codigo = 'pequeno' LIMIT 1)
WHERE plano_id IS NULL;

-- Admin do sistema (role='admin') ganha Ilimitado por padrao
UPDATE usuarios
SET plano_id = (SELECT id FROM planos WHERE codigo = 'ilimitado' LIMIT 1)
WHERE role = 'admin';

-- 4. Coluna criado_por em fazendas (quem da plataforma cadastrou)
ALTER TABLE fazendas
  ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES usuarios(id);

-- Backfill: fazendas sem criado_por viram do admin alanjader se houver
UPDATE fazendas f
SET criado_por = (
  SELECT u.id
  FROM usuarios u
  WHERE u.role = 'admin'
  ORDER BY u.criado_em
  LIMIT 1
)
WHERE f.criado_por IS NULL;

-- 5. View pro painel admin: cada plano com contagem de usuarios
CREATE OR REPLACE VIEW v_planos_uso AS
SELECT
  p.id,
  p.codigo,
  p.nome,
  p.max_fazendas,
  p.ordem,
  p.ativo,
  COUNT(u.id) FILTER (WHERE u.ativo) AS usuarios_no_plano
FROM planos p
LEFT JOIN usuarios u ON u.plano_id = p.id
GROUP BY p.id, p.codigo, p.nome, p.max_fazendas, p.ordem, p.ativo;

-- Verificacao pos-execucao (rode no SQL Editor):
--
-- SELECT codigo, nome, max_fazendas, usuarios_no_plano FROM v_planos_uso ORDER BY ordem;
-- SELECT u.email, p.nome AS plano FROM usuarios u LEFT JOIN planos p ON p.id = u.plano_id ORDER BY u.criado_em;
