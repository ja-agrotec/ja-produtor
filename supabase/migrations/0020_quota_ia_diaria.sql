-- ============================================================
-- 0020_quota_ia_diaria.sql
--
-- Rate limit in-memory da /api/ia-operacional nao funciona em
-- Vercel serverless: cada cold start zera o Map, atacante consegue
-- drenar a chave Claude. Auth Bearer ajuda mas user logado com
-- 1000 chamadas em loop ainda custa.
--
-- FIX: quota persistente no Postgres. Tabela rastreia (user_id, dia)
-- com count e limite. RPC atomica consumir_quota_ia retorna OK/NAO.
--
-- Default: 100 chamadas/dia/user. Suficiente pra produtor real
-- (1-2x ver IA por dia); freia bot a partir do 101o uso.
-- ============================================================

CREATE TABLE IF NOT EXISTS quota_ia (
  usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  dia         DATE NOT NULL,
  count       INT  NOT NULL DEFAULT 0,
  atualizado  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, dia)
);

CREATE INDEX IF NOT EXISTS idx_quota_ia_dia
  ON quota_ia(dia);

-- RLS: usuario so le proprio uso; superadmin le tudo. Insert/update
-- so via RPC (SECURITY DEFINER) que rodara como owner.
ALTER TABLE quota_ia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quota_ia_select" ON quota_ia;
CREATE POLICY "quota_ia_select" ON quota_ia FOR SELECT TO authenticated
  USING (
    usuario_id = get_user_id()
    OR get_user_role() = 'superadmin'
  );

-- RPC atomica - incrementa contagem e devolve estado.
-- Idempotente por dia (UPSERT). Bloqueia se exceder limite.
CREATE OR REPLACE FUNCTION consumir_quota_ia(p_limite_diario INT DEFAULT 100)
RETURNS TABLE(ok BOOLEAN, usado INT, limite INT) AS $$
DECLARE
  v_user UUID;
  v_count INT;
BEGIN
  v_user := get_user_id();
  IF v_user IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, p_limite_diario;
    RETURN;
  END IF;

  -- Superadmin nao tem quota (operacao interna)
  IF get_user_role() = 'superadmin' THEN
    RETURN QUERY SELECT TRUE, 0, -1;
    RETURN;
  END IF;

  -- UPSERT atomico: se nao existe, cria com count=1.
  -- Se existe, incrementa.
  INSERT INTO quota_ia (usuario_id, dia, count, atualizado)
  VALUES (v_user, CURRENT_DATE, 1, NOW())
  ON CONFLICT (usuario_id, dia) DO UPDATE
  SET count = quota_ia.count + 1, atualizado = NOW()
  RETURNING count INTO v_count;

  IF v_count > p_limite_diario THEN
    RETURN QUERY SELECT FALSE, v_count, p_limite_diario;
  ELSE
    RETURN QUERY SELECT TRUE, v_count, p_limite_diario;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificacao pos-execucao:
-- SELECT usuario_id, dia, count FROM quota_ia ORDER BY atualizado DESC LIMIT 5;
-- Como superadmin: SELECT * FROM consumir_quota_ia(100); -- deve ok=true limite=-1
-- Como cliente: SELECT * FROM consumir_quota_ia(5); -- 6a chamada retorna ok=false
