-- ============================================
-- LK BARBEARIA — Schema do Banco de Dados
-- Alinhado com o front-end Stitch MCP
-- ============================================

-- Tabela de Barbeiros
CREATE TABLE IF NOT EXISTS barbeiros (
  id              SERIAL PRIMARY KEY,
  nome            VARCHAR(255) NOT NULL,
  comissao_padrao INTEGER NOT NULL DEFAULT 40,
  telefone        VARCHAR(20),
  senha_hash      VARCHAR(255) NOT NULL,
  foto_url        TEXT,
  ativo           BOOLEAN DEFAULT true,
  role            VARCHAR(20) DEFAULT 'barber',
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- Tabela de Movimentações (Fluxo de Caixa)
CREATE TABLE IF NOT EXISTS movimentacoes (
  id                SERIAL PRIMARY KEY,
  descricao         VARCHAR(255) NOT NULL,
  categoria         VARCHAR(20) NOT NULL CHECK (categoria IN ('servico', 'vale', 'produto', 'despesa')),
  tipo_servico      VARCHAR(100),
  barbeiro_id       INTEGER REFERENCES barbeiros(id) ON DELETE SET NULL,
  cliente_nome      VARCHAR(255),
  valor             DECIMAL(10,2) NOT NULL,
  comissao          DECIMAL(10,2),
  metodo_pagamento  VARCHAR(20) CHECK (metodo_pagamento IN ('pix', 'credito', 'debito', 'dinheiro')),
  status            VARCHAR(20) DEFAULT 'concluido' CHECK (status IN ('concluido', 'pago', 'pendente', 'cancelado')),
  data_hora         TIMESTAMP DEFAULT NOW(),
  created_at        TIMESTAMP DEFAULT NOW()
);

-- Tabela de Vales
CREATE TABLE IF NOT EXISTS vales (
  id              SERIAL PRIMARY KEY,
  barbeiro_id     INTEGER NOT NULL REFERENCES barbeiros(id) ON DELETE CASCADE,
  valor           DECIMAL(10,2) NOT NULL,
  descricao       TEXT,
  data            DATE NOT NULL,
  data_vencimento DATE,
  status          VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'pago', 'vencido', 'pendente_aprovacao')),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- Tabela de Fechamentos Semanais
CREATE TABLE IF NOT EXISTS fechamentos (
  id                      SERIAL PRIMARY KEY,
  barbeiro_id             INTEGER NOT NULL REFERENCES barbeiros(id) ON DELETE CASCADE,
  semana                  INTEGER NOT NULL,
  ano                     INTEGER NOT NULL,
  valor_bruto             DECIMAL(10,2) NOT NULL DEFAULT 0,
  valor_comissao          DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_vales_descontados DECIMAL(10,2) DEFAULT 0,
  liquido_a_receber       DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_cortes            INTEGER DEFAULT 0,
  created_at              TIMESTAMP DEFAULT NOW(),
  UNIQUE(barbeiro_id, semana, ano)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_movimentacoes_barbeiro ON movimentacoes(barbeiro_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON movimentacoes(data_hora);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_categoria ON movimentacoes(categoria);
CREATE INDEX IF NOT EXISTS idx_vales_barbeiro ON vales(barbeiro_id);
CREATE INDEX IF NOT EXISTS idx_vales_status ON vales(status);
CREATE INDEX IF NOT EXISTS idx_fechamentos_semana ON fechamentos(semana, ano);

-- Tabela de Agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
  id                SERIAL PRIMARY KEY,
  cliente_nome      VARCHAR(255) NOT NULL,
  cliente_telefone  VARCHAR(20),
  barbeiro_id       INTEGER NOT NULL REFERENCES barbeiros(id) ON DELETE CASCADE,
  tipo_servico      VARCHAR(100) NOT NULL,
  valor             DECIMAL(10,2) NOT NULL DEFAULT 0,
  data              DATE NOT NULL,
  horario           VARCHAR(10) NOT NULL,
  status            VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluido', 'cancelado')),
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agendamentos_barbeiro ON agendamentos(barbeiro_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data);

-- Seed de Barbeiros Iniciais (Garante que existam sem duplicar se rodar novamente)
INSERT INTO barbeiros (id, nome, comissao_padrao, telefone, senha_hash, role)
VALUES 
  (1, 'Lukinhas', 50, '(11) 99999-0001', '$2b$10$9bC7wh3d4LYjxND5RZlAn.ZEO/wqQMNEoMg1ih0X2vpWxeLslqQ0i', 'barber'),
  (2, 'Neguin do corte', 50, '(11) 99999-0002', '$2b$10$9bC7wh3d4LYjxND5RZlAn.ZEO/wqQMNEoMg1ih0X2vpWxeLslqQ0i', 'barber'),
  (3, 'Admin Master', 0, '(11) 99999-0000', '$2b$10$.X9tVym/xPUEHEiqrYphp.J.GdT553vHPMBohwwqMPUuhvWRG9lqO', 'admin')
ON CONFLICT (id) DO NOTHING;

-- Ajustar a sequência do serial do ID
SELECT setval('barbeiros_id_seq', COALESCE((SELECT MAX(id)+1 FROM barbeiros), 1), false);
