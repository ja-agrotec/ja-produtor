-- ============================================================
-- JA AGRO INTELLIGENCE — Schema Completo do Banco de Dados
-- Supabase (PostgreSQL)
-- Versão: 2.0.0
-- ============================================================
-- Execute este script no SQL Editor do Supabase
-- Ordem: extensões → tabelas → índices → RLS → funções → triggers
-- ============================================================

-- ── EXTENSÕES ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- busca textual eficiente

-- ============================================================
-- TABELA: fazendas
-- ============================================================
CREATE TABLE IF NOT EXISTS fazendas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome          TEXT NOT NULL,
  cidade        TEXT,
  estado        CHAR(2),
  area_total_ha NUMERIC(10,2),
  proprietario  TEXT,
  cnpj_cpf      TEXT,
  telefone      TEXT,
  email         TEXT,
  observacoes   TEXT,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: usuarios
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id       UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  nome          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  role          TEXT NOT NULL DEFAULT 'operador'
                  CHECK (role IN ('admin','gerente','operador','visualizador')),
  fazenda_id    UUID REFERENCES fazendas(id) ON DELETE SET NULL,
  telefone      TEXT,
  cargo         TEXT,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_acesso TIMESTAMPTZ,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: talhoes
-- ============================================================
CREATE TABLE IF NOT EXISTS talhoes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fazenda_id    UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  area_ha       NUMERIC(10,2),
  cultura_atual TEXT,
  solo          TEXT,
  irrigado      BOOLEAN DEFAULT FALSE,
  coordenadas   TEXT,
  observacoes   TEXT,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: safras
-- ============================================================
CREATE TABLE IF NOT EXISTS safras (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fazenda_id    UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  cultura       TEXT NOT NULL,
  ano_agricola  TEXT,
  data_plantio  DATE,
  data_colheita DATE,
  area_ha       NUMERIC(10,2),
  producao_sc   NUMERIC(12,2),
  produtividade_sc_ha NUMERIC(8,2),
  custo_total   NUMERIC(14,2) DEFAULT 0,
  receita_total NUMERIC(14,2) DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'planejamento'
                  CHECK (status IN ('planejamento','aberta','encerrada','cancelada')),
  observacoes   TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: categorias_lancamento
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias_lancamento (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome      TEXT NOT NULL UNIQUE,
  tipo      TEXT NOT NULL DEFAULT 'despesa'
              CHECK (tipo IN ('despesa','receita')),
  cor       TEXT DEFAULT '#4CAF50',
  icone     TEXT DEFAULT '📋',
  ativo     BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categorias padrão
INSERT INTO categorias_lancamento (nome, tipo, icone) VALUES
  ('Sementes',        'despesa', '🌱'),
  ('Fertilizantes',   'despesa', '🧪'),
  ('Defensivos',      'despesa', '💊'),
  ('Combustível',     'despesa', '⛽'),
  ('Mão de Obra',     'despesa', '👷'),
  ('Manutenção',      'despesa', '🔧'),
  ('Irrigação',       'despesa', '💧'),
  ('Transporte',      'despesa', '🚚'),
  ('Arrendamento',    'despesa', '📋'),
  ('Outros Custos',   'despesa', '📦'),
  ('Venda de Grãos',  'receita', '💰'),
  ('Venda de Outros', 'receita', '💵'),
  ('Subsídios',       'receita', '🏛️')
ON CONFLICT (nome) DO NOTHING;

-- ============================================================
-- TABELA: insumos
-- ============================================================
CREATE TABLE IF NOT EXISTS insumos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome              TEXT NOT NULL,
  categoria         TEXT,
  unidade           TEXT NOT NULL DEFAULT 'KG',
  principio_ativo   TEXT,
  fabricante        TEXT,
  registro_mapa     TEXT,
  estoque_atual     NUMERIC(12,3) DEFAULT 0,
  estoque_minimo    NUMERIC(12,3) DEFAULT 0,
  preco_unitario    NUMERIC(12,4),
  fazenda_id        UUID REFERENCES fazendas(id) ON DELETE CASCADE,
  ativo             BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: maquinas
-- ============================================================
CREATE TABLE IF NOT EXISTS maquinas (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fazenda_id       UUID REFERENCES fazendas(id) ON DELETE CASCADE,
  nome             TEXT NOT NULL,
  tipo             TEXT,
  marca            TEXT,
  modelo           TEXT,
  ano              INT,
  placa            TEXT,
  numero_serie     TEXT,
  horimetro_atual  NUMERIC(10,1) DEFAULT 0,
  km_atual         NUMERIC(10,1) DEFAULT 0,
  proxima_manutencao_h NUMERIC(10,1),
  status           TEXT NOT NULL DEFAULT 'ativo'
                     CHECK (status IN ('ativo','manutencao','inativo')),
  observacoes      TEXT,
  ativo            BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: operadores
-- ============================================================
CREATE TABLE IF NOT EXISTS operadores (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fazenda_id    UUID REFERENCES fazendas(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  cpf           TEXT,
  telefone      TEXT,
  cnh           TEXT,
  categoria_cnh TEXT,
  funcao        TEXT,
  salario       NUMERIC(10,2),
  data_admissao DATE,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: lancamentos
-- ============================================================
CREATE TABLE IF NOT EXISTS lancamentos (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fazenda_id            UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  safra_id              UUID REFERENCES safras(id) ON DELETE SET NULL,
  talhao_id             UUID REFERENCES talhoes(id) ON DELETE SET NULL,
  categoria_id          UUID NOT NULL REFERENCES categorias_lancamento(id),
  maquina_id            UUID REFERENCES maquinas(id) ON DELETE SET NULL,
  operador_id           UUID REFERENCES operadores(id) ON DELETE SET NULL,
  usuario_id            UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo                  TEXT NOT NULL DEFAULT 'despesa'
                          CHECK (tipo IN ('despesa','receita')),
  data_lancamento       DATE NOT NULL DEFAULT CURRENT_DATE,
  descricao             TEXT,
  insumo_id             UUID REFERENCES insumos(id) ON DELETE SET NULL,
  quantidade            NUMERIC(12,3),
  unidade               TEXT,
  custo_unitario        NUMERIC(12,4),
  custo_total           NUMERIC(14,2),
  nota_fiscal           TEXT,
  comprovante_url       TEXT,
  observacoes           TEXT,
  status                TEXT NOT NULL DEFAULT 'confirmado'
                          CHECK (status IN ('rascunho','confirmado','cancelado')),
  offline_id            TEXT UNIQUE,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: lancamentos_offline (fila de sincronização)
-- ============================================================
CREATE TABLE IF NOT EXISTS lancamentos_offline (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id  UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  payload     JSONB NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pendente'
                CHECK (status IN ('pendente','sincronizado','erro')),
  tentativas  INT DEFAULT 0,
  erro_msg    TEXT,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sincronizado_em TIMESTAMPTZ
);

-- ============================================================
-- TABELA: manutencoes (histórico de manutenção de máquinas)
-- ============================================================
CREATE TABLE IF NOT EXISTS manutencoes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  maquina_id      UUID NOT NULL REFERENCES maquinas(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('preventiva','corretiva','revisao')),
  data            DATE NOT NULL DEFAULT CURRENT_DATE,
  horimetro       NUMERIC(10,1),
  km              NUMERIC(10,1),
  descricao       TEXT NOT NULL,
  custo           NUMERIC(12,2),
  oficina         TEXT,
  proximo_h       NUMERIC(10,1),
  proximo_km      NUMERIC(10,1),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES (performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_talhoes_fazenda   ON talhoes(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_talhoes_ativo      ON talhoes(ativo);
CREATE INDEX IF NOT EXISTS idx_safras_fazenda      ON safras(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_safras_status       ON safras(status);
CREATE INDEX IF NOT EXISTS idx_lancamentos_fazenda ON lancamentos(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_safra   ON lancamentos(safra_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_talhao  ON lancamentos(talhao_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data    ON lancamentos(data_lancamento DESC);
CREATE INDEX IF NOT EXISTS idx_lancamentos_tipo    ON lancamentos(tipo);
CREATE INDEX IF NOT EXISTS idx_insumos_fazenda     ON insumos(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_maquinas_fazenda    ON maquinas(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_operadores_fazenda  ON operadores(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_fazenda    ON usuarios(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_auth       ON usuarios(auth_id);
CREATE INDEX IF NOT EXISTS idx_offline_status      ON lancamentos_offline(status);
CREATE INDEX IF NOT EXISTS idx_manutencoes_maquina ON manutencoes(maquina_id);

-- Índice trigram para busca textual
CREATE INDEX IF NOT EXISTS idx_fazendas_nome_trgm   ON fazendas USING GIN (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_insumos_nome_trgm     ON insumos USING GIN (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_lancamentos_desc_trgm ON lancamentos USING GIN (descricao gin_trgm_ops);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE fazendas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios              ENABLE ROW LEVEL SECURITY;
ALTER TABLE talhoes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE safras                ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_lancamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE maquinas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE operadores            ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos_offline   ENABLE ROW LEVEL SECURITY;
ALTER TABLE manutencoes           ENABLE ROW LEVEL SECURITY;

-- Função auxiliar: retorna role do usuário logado
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM usuarios WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Função auxiliar: retorna fazenda_id do usuário logado
CREATE OR REPLACE FUNCTION get_user_fazenda()
RETURNS UUID AS $$
  SELECT fazenda_id FROM usuarios WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ── POLICIES: fazendas ──
DROP POLICY IF EXISTS "Admins e gerentes veem todas" ON fazendas;
CREATE POLICY "Admins e gerentes veem todas" ON fazendas
  FOR SELECT USING (
    get_user_role() IN ('admin','gerente')
    OR id = get_user_fazenda()
  );
CREATE POLICY "Apenas admin insere fazenda" ON fazendas
  FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "Apenas admin atualiza fazenda" ON fazendas
  FOR UPDATE USING (get_user_role() = 'admin');

-- ── POLICIES: usuarios ──
CREATE POLICY "Admins veem todos usuarios" ON usuarios
  FOR SELECT USING (get_user_role() IN ('admin','gerente'));
CREATE POLICY "Apenas admin gerencia usuarios" ON usuarios
  FOR ALL USING (get_user_role() = 'admin');

-- ── POLICIES: talhoes, safras, lancamentos ──
CREATE POLICY "Acesso por fazenda" ON talhoes
  FOR ALL USING (
    get_user_role() = 'admin'
    OR fazenda_id = get_user_fazenda()
  );
CREATE POLICY "Acesso por fazenda" ON safras
  FOR ALL USING (
    get_user_role() = 'admin'
    OR fazenda_id = get_user_fazenda()
  );
CREATE POLICY "Acesso por fazenda" ON lancamentos
  FOR ALL USING (
    get_user_role() = 'admin'
    OR fazenda_id = get_user_fazenda()
  );
CREATE POLICY "Acesso por fazenda" ON insumos
  FOR ALL USING (
    get_user_role() = 'admin'
    OR fazenda_id = get_user_fazenda()
  );
CREATE POLICY "Acesso por fazenda" ON maquinas
  FOR ALL USING (
    get_user_role() = 'admin'
    OR fazenda_id = get_user_fazenda()
  );
CREATE POLICY "Acesso por fazenda" ON operadores
  FOR ALL USING (
    get_user_role() = 'admin'
    OR fazenda_id = get_user_fazenda()
  );
CREATE POLICY "Todos veem categorias" ON categorias_lancamento
  FOR SELECT USING (TRUE);
CREATE POLICY "Admin gerencia categorias" ON categorias_lancamento
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Usuario ve proprio offline" ON lancamentos_offline
  FOR ALL USING (
    usuario_id = (SELECT id FROM usuarios WHERE auth_id = auth.uid())
    OR get_user_role() = 'admin'
  );
CREATE POLICY "Acesso manutencoes" ON manutencoes
  FOR ALL USING (
    get_user_role() = 'admin'
    OR (SELECT fazenda_id FROM maquinas WHERE id = maquina_id) = get_user_fazenda()
  );

-- ============================================================
-- TRIGGER: atualiza atualizado_em automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_fazendas_updated
  BEFORE UPDATE ON fazendas
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE OR REPLACE TRIGGER trg_usuarios_updated
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE OR REPLACE TRIGGER trg_talhoes_updated
  BEFORE UPDATE ON talhoes
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE OR REPLACE TRIGGER trg_safras_updated
  BEFORE UPDATE ON safras
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE OR REPLACE TRIGGER trg_lancamentos_updated
  BEFORE UPDATE ON lancamentos
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE OR REPLACE TRIGGER trg_insumos_updated
  BEFORE UPDATE ON insumos
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE OR REPLACE TRIGGER trg_maquinas_updated
  BEFORE UPDATE ON maquinas
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE OR REPLACE TRIGGER trg_operadores_updated
  BEFORE UPDATE ON operadores
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- ============================================================
-- TRIGGER: custo_total automático (quantidade × custo_unitario)
-- ============================================================
CREATE OR REPLACE FUNCTION calc_custo_total()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantidade IS NOT NULL AND NEW.custo_unitario IS NOT NULL THEN
    NEW.custo_total = ROUND(NEW.quantidade * NEW.custo_unitario, 2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_lancamentos_custo
  BEFORE INSERT OR UPDATE ON lancamentos
  FOR EACH ROW EXECUTE FUNCTION calc_custo_total();

-- ============================================================
-- TRIGGER: atualiza custo_total da safra ao inserir lançamento
-- ============================================================
CREATE OR REPLACE FUNCTION update_safra_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.safra_id IS NOT NULL THEN
    UPDATE safras SET
      custo_total = (
        SELECT COALESCE(SUM(custo_total),0) FROM lancamentos
        WHERE safra_id = NEW.safra_id AND tipo = 'despesa' AND status != 'cancelado'
      ),
      receita_total = (
        SELECT COALESCE(SUM(custo_total),0) FROM lancamentos
        WHERE safra_id = NEW.safra_id AND tipo = 'receita' AND status != 'cancelado'
      ),
      atualizado_em = NOW()
    WHERE id = NEW.safra_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_lancamento_safra_totals
  AFTER INSERT OR UPDATE OR DELETE ON lancamentos
  FOR EACH ROW EXECUTE FUNCTION update_safra_totals();

-- ============================================================
-- TRIGGER: atualiza estoque de insumos ao lançar uso
-- ============================================================
CREATE OR REPLACE FUNCTION update_estoque_insumo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.insumo_id IS NOT NULL AND NEW.quantidade IS NOT NULL AND NEW.tipo = 'despesa' THEN
    UPDATE insumos SET
      estoque_atual = GREATEST(0, estoque_atual - NEW.quantidade),
      atualizado_em = NOW()
    WHERE id = NEW.insumo_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_lancamento_estoque
  AFTER INSERT ON lancamentos
  FOR EACH ROW EXECUTE FUNCTION update_estoque_insumo();

-- ============================================================
-- VIEW: dashboard_resumo — KPIs principais
-- ============================================================
CREATE OR REPLACE VIEW vw_dashboard AS
SELECT
  f.id          AS fazenda_id,
  f.nome        AS fazenda_nome,
  COUNT(DISTINCT t.id) FILTER (WHERE t.ativo)        AS total_talhoes,
  COUNT(DISTINCT s.id) FILTER (WHERE s.status='aberta') AS safras_abertas,
  COUNT(DISTINCT l.id)                                AS total_lancamentos,
  COALESCE(SUM(l.custo_total) FILTER (WHERE l.tipo='despesa' AND l.status='confirmado'), 0) AS total_despesas,
  COALESCE(SUM(l.custo_total) FILTER (WHERE l.tipo='receita' AND l.status='confirmado'), 0) AS total_receitas,
  COUNT(DISTINCT i.id) FILTER (WHERE i.ativo AND i.estoque_atual <= i.estoque_minimo) AS insumos_baixo_estoque,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status='ativo') AS maquinas_ativas
FROM fazendas f
LEFT JOIN talhoes  t ON t.fazenda_id = f.id
LEFT JOIN safras   s ON s.fazenda_id = f.id
LEFT JOIN lancamentos l ON l.fazenda_id = f.id
LEFT JOIN insumos  i ON i.fazenda_id = f.id
LEFT JOIN maquinas m ON m.fazenda_id = f.id
WHERE f.ativo
GROUP BY f.id, f.nome;

-- ============================================================
-- COMENTÁRIOS (documentação do schema)
-- ============================================================
COMMENT ON TABLE fazendas   IS 'Propriedades rurais cadastradas no sistema';
COMMENT ON TABLE usuarios   IS 'Usuários do sistema vinculados ao Supabase Auth';
COMMENT ON TABLE talhoes    IS 'Divisões de área dentro de uma fazenda';
COMMENT ON TABLE safras     IS 'Ciclos de produção por cultura e fazenda';
COMMENT ON TABLE lancamentos IS 'Movimentações financeiras (despesas e receitas)';
COMMENT ON TABLE insumos    IS 'Produtos agrícolas com controle de estoque';
COMMENT ON TABLE maquinas   IS 'Equipamentos e veículos das fazendas';
COMMENT ON TABLE operadores IS 'Funcionários e operadores de máquinas';
COMMENT ON TABLE manutencoes IS 'Histórico de manutenções de máquinas';
