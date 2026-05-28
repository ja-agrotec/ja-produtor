-- ============================================================
-- 0008_cotacoes_diarias.sql
-- Tabela de cotações diárias por cultura (CEPEA ou similar).
-- Populada por cron /api/cotacoes/sync que chama uma API externa
-- (Cotação do Agro, Notamercantil, etc.).
-- Home consome o último registro por cultura.
-- ============================================================

CREATE TABLE IF NOT EXISTS cotacoes_diarias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cultura     TEXT NOT NULL,              -- ex: SOJA, MILHO, CAFÉ ARÁBICA
  preco_saca  NUMERIC(10,2) NOT NULL,     -- R$/saca
  data        DATE NOT NULL,              -- data da cotação
  praca       TEXT,                        -- ex: PARANÁ, MOGIANA, etc.
  fonte       TEXT NOT NULL,               -- ex: CEPEA, COTACAO_DO_AGRO, B3
  variacao_pct NUMERIC(6,2),               -- % vs ontem (opcional)
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cultura, data, praca, fonte)
);

CREATE INDEX IF NOT EXISTS idx_cotacoes_cultura_data
  ON cotacoes_diarias (cultura, data DESC);
CREATE INDEX IF NOT EXISTS idx_cotacoes_data
  ON cotacoes_diarias (data DESC);

ALTER TABLE cotacoes_diarias ENABLE ROW LEVEL SECURITY;

-- SELECT publico: cotacao nao eh sensivel, pode ser lida sem login
-- (mas RLS impede INSERT/UPDATE/DELETE de qualquer um).
DROP POLICY IF EXISTS cotacoes_select_publico ON cotacoes_diarias;
CREATE POLICY cotacoes_select_publico ON cotacoes_diarias
  FOR SELECT
  USING (true);

-- Insert/update/delete: somente service_role (a Edge Function de sync).
-- Authenticated common nao pode escrever; cotacao deve vir do cron.
DROP POLICY IF EXISTS cotacoes_admin_only ON cotacoes_diarias;
CREATE POLICY cotacoes_admin_only ON cotacoes_diarias
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.role = 'admin'
    )
  );

-- View: última cotação por cultura (usada pela home)
CREATE OR REPLACE VIEW v_cotacoes_ultimas AS
SELECT DISTINCT ON (cultura)
  cultura,
  preco_saca,
  data,
  praca,
  fonte,
  variacao_pct,
  criado_em
FROM cotacoes_diarias
ORDER BY cultura, data DESC, criado_em DESC;
