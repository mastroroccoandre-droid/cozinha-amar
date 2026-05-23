-- ============================================================
-- RESIDENCIAL AMAR — Schema completo do banco de dados
-- Execute no Supabase: SQL Editor > New Query > Cole tudo > Run
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUM TYPES ──────────────────────────────────────────────
CREATE TYPE perfil_usuario AS ENUM ('admin', 'nutricionista', 'cozinha');
CREATE TYPE refeicao_tipo AS ENUM ('cafe_manha', 'colacao', 'almoco', 'lanche_tarde', 'jantar', 'ceia');
CREATE TYPE categoria_alimento AS ENUM ('hortifruti', 'carnes', 'congelados', 'secos', 'laticinios', 'padaria', 'limpeza', 'bebidas', 'descartaveis', 'outros');
CREATE TYPE local_estoque AS ENUM ('despensa', 'geladeira', 'freezer', 'estoque_secundario');
CREATE TYPE status_compra AS ENUM ('pendente', 'aprovado', 'recebido', 'cancelado');
CREATE TYPE status_producao AS ENUM ('pendente', 'em_andamento', 'concluido');

-- ─── CONFIGURAÇÕES DA ILPI ───────────────────────────────────
CREATE TABLE configuracoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome_ilpi TEXT NOT NULL DEFAULT 'Residencial Amar',
  responsavel_tecnico TEXT,
  num_idosos INTEGER NOT NULL DEFAULT 42,
  margem_seguranca NUMERIC(5,2) NOT NULL DEFAULT 10.0,
  fator_correcao NUMERIC(5,2) NOT NULL DEFAULT 1.1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO configuracoes (nome_ilpi, responsavel_tecnico, num_idosos, margem_seguranca, fator_correcao)
VALUES ('Residencial Amar', 'Ana Lima — CRN 12345', 42, 10.0, 1.1);

-- ─── USUÁRIOS ────────────────────────────────────────────────
CREATE TABLE usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  perfil perfil_usuario NOT NULL DEFAULT 'cozinha',
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── FORNECEDORES ────────────────────────────────────────────
CREATE TABLE fornecedores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  contato TEXT,
  telefone TEXT,
  email TEXT,
  categorias categoria_alimento[],
  observacoes TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO fornecedores (nome, contato, telefone, categorias) VALUES
  ('Distribuidora ABC', 'Carlos', '(11) 99999-0001', ARRAY['secos','laticinios']::categoria_alimento[]),
  ('Frigorífico Sul', 'Maria', '(11) 99999-0002', ARRAY['carnes','congelados']::categoria_alimento[]),
  ('Hortifruti Bom', 'João', '(11) 99999-0003', ARRAY['hortifruti']::categoria_alimento[]),
  ('Laticínios Bela', 'Ana', '(11) 99999-0004', ARRAY['laticinios']::categoria_alimento[]),
  ('Padaria Central', 'Pedro', '(11) 99999-0005', ARRAY['padaria']::categoria_alimento[]);

-- ─── PRODUTOS (ESTOQUE) ──────────────────────────────────────
CREATE TABLE produtos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  categoria categoria_alimento NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'kg',
  quantidade_atual NUMERIC(10,3) NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC(10,3) NOT NULL DEFAULT 0,
  local_armazenamento local_estoque NOT NULL DEFAULT 'despensa',
  data_validade DATE,
  preco_medio NUMERIC(10,2),
  fornecedor_id UUID REFERENCES fornecedores(id),
  observacoes TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Produtos iniciais de exemplo
INSERT INTO produtos (nome, categoria, unidade, quantidade_atual, estoque_minimo, local_armazenamento, data_validade, preco_medio) VALUES
  ('Arroz branco', 'secos', 'kg', 48, 20, 'despensa', '2025-12-01', 5.90),
  ('Feijão carioca', 'secos', 'kg', 12, 15, 'despensa', '2025-10-01', 8.50),
  ('Filé de frango', 'carnes', 'kg', 8, 10, 'freezer', '2025-02-15', 18.90),
  ('Banana', 'hortifruti', 'kg', 6, 5, 'despensa', '2025-01-20', 3.50),
  ('Leite integral', 'laticinios', 'L', 28, 20, 'geladeira', '2025-01-22', 5.80),
  ('Óleo de soja', 'secos', 'L', 4, 5, 'despensa', '2025-08-01', 7.20),
  ('Macarrão espaguete', 'secos', 'kg', 22, 10, 'despensa', '2026-01-01', 4.50),
  ('Pão integral', 'padaria', 'un', 140, 80, 'despensa', '2025-01-18', 0.80),
  ('Cenoura', 'hortifruti', 'kg', 3, 8, 'geladeira', '2025-01-19', 4.00),
  ('Batata inglesa', 'hortifruti', 'kg', 15, 10, 'despensa', '2025-01-25', 3.80),
  ('Tomate', 'hortifruti', 'kg', 5, 6, 'geladeira', '2025-01-17', 6.50),
  ('Sal refinado', 'secos', 'kg', 8, 3, 'despensa', '2026-06-01', 2.50),
  ('Açúcar refinado', 'secos', 'kg', 12, 5, 'despensa', '2026-06-01', 4.80),
  ('Manteiga', 'laticinios', 'kg', 3, 2, 'geladeira', '2025-02-01', 28.00),
  ('Ovo caipira', 'laticinios', 'un', 240, 120, 'geladeira', '2025-01-25', 0.85),
  ('Iogurte natural', 'laticinios', 'kg', 8, 5, 'geladeira', '2025-01-20', 12.00),
  ('Chuchu', 'hortifruti', 'kg', 7, 5, 'geladeira', '2025-01-22', 3.20),
  ('Abobrinha', 'hortifruti', 'kg', 4, 4, 'geladeira', '2025-01-19', 4.50),
  ('Alho', 'hortifruti', 'kg', 2, 1, 'despensa', '2025-03-01', 25.00),
  ('Cebola', 'hortifruti', 'kg', 6, 4, 'despensa', '2025-02-01', 5.00);

-- ─── MOVIMENTAÇÕES DE ESTOQUE ────────────────────────────────
CREATE TABLE movimentacoes_estoque (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id UUID NOT NULL REFERENCES produtos(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada','saida','ajuste','perda')),
  quantidade NUMERIC(10,3) NOT NULL,
  quantidade_anterior NUMERIC(10,3),
  quantidade_posterior NUMERIC(10,3),
  motivo TEXT,
  referencia_id UUID,
  usuario_id UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PREPARAÇÕES (RECEITAS) ──────────────────────────────────
CREATE TABLE preparacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  tipo_refeicao refeicao_tipo NOT NULL,
  rendimento_porcoes INTEGER DEFAULT 1,
  observacoes TEXT,
  substituicoes TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INGREDIENTES DAS PREPARAÇÕES ───────────────────────────
CREATE TABLE preparacao_ingredientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  preparacao_id UUID NOT NULL REFERENCES preparacoes(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES produtos(id),
  nome_ingrediente TEXT NOT NULL,
  quantidade_por_idoso NUMERIC(10,3) NOT NULL,
  unidade TEXT NOT NULL,
  fator_correcao NUMERIC(5,2) DEFAULT 1.0,
  observacoes TEXT
);

-- Preparações iniciais
INSERT INTO preparacoes (nome, categoria, tipo_refeicao, observacoes) VALUES
  ('Arroz branco', 'Cereais', 'almoco', 'Cozido com sal e óleo'),
  ('Feijão cozido', 'Leguminosas', 'almoco', 'Temperado com alho e sal'),
  ('Frango grelhado', 'Proteínas', 'almoco', 'Marinado com alho e ervas'),
  ('Sopa de legumes', 'Sopas', 'jantar', 'Batata, cenoura, chuchu'),
  ('Vitamina de banana', 'Bebidas', 'ceia', 'Com leite e açúcar'),
  ('Pão com requeijão', 'Padaria', 'cafe_manha', 'Pão integral'),
  ('Café com leite', 'Bebidas', 'cafe_manha', 'Leite integral com café'),
  ('Iogurte com granola', 'Laticínios', 'lanche_tarde', 'Iogurte natural'),
  ('Macarrão ao molho', 'Massas', 'jantar', 'Molho de tomate caseiro'),
  ('Omelete', 'Proteínas', 'jantar', '2 ovos por porção');

-- ─── CARDÁPIO SEMANAL ────────────────────────────────────────
-- 5 semanas × 7 dias × 6 refeições
CREATE TABLE cardapio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  semana INTEGER NOT NULL CHECK (semana BETWEEN 1 AND 5),
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=Segunda...6=Domingo
  refeicao refeicao_tipo NOT NULL,
  descricao TEXT NOT NULL,
  preparacao_id UUID REFERENCES preparacoes(id),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (semana, dia_semana, refeicao)
);

-- Cardápio Semana 1 — Segunda
INSERT INTO cardapio (semana, dia_semana, refeicao, descricao) VALUES
  (1,0,'cafe_manha','Pão integral com requeijão, café com leite'),
  (1,0,'colacao','Fruta da época'),
  (1,0,'almoco','Arroz, feijão, frango grelhado, salada verde'),
  (1,0,'lanche_tarde','Iogurte com granola'),
  (1,0,'jantar','Sopa de legumes com macarrão'),
  (1,0,'ceia','Vitamina de banana'),
-- Terça
  (1,1,'cafe_manha','Tapioca com queijo, suco de laranja'),
  (1,1,'colacao','Biscoito de polvilho'),
  (1,1,'almoco','Arroz, lentilha, carne moída, abobrinha refogada'),
  (1,1,'lanche_tarde','Maçã'),
  (1,1,'jantar','Arroz, ovo mexido, salada de alface'),
  (1,1,'ceia','Chá com bolacha'),
-- Quarta
  (1,2,'cafe_manha','Mingau de aveia, café com leite'),
  (1,2,'colacao','Banana'),
  (1,2,'almoco','Macarrão ao molho, frango desfiado, alface'),
  (1,2,'lanche_tarde','Bolo simples'),
  (1,2,'jantar','Purê de batata, peixe grelhado'),
  (1,2,'ceia','Leite morno'),
-- Quinta
  (1,3,'cafe_manha','Pão de queijo, café com leite'),
  (1,3,'colacao','Suco de acerola'),
  (1,3,'almoco','Arroz, feijão, bife acebolado, cenoura cozida'),
  (1,3,'lanche_tarde','Laranja'),
  (1,3,'jantar','Caldo de feijão com torradas'),
  (1,3,'ceia','Iogurte natural'),
-- Sexta
  (1,4,'cafe_manha','Cuscuz com ovo mexido, café'),
  (1,4,'colacao','Mamão'),
  (1,4,'almoco','Arroz, grão de bico, frango, beterraba'),
  (1,4,'lanche_tarde','Creme de papaia'),
  (1,4,'jantar','Sopa de abóbora'),
  (1,4,'ceia','Chá de ervas'),
-- Sábado
  (1,5,'cafe_manha','Pão com manteiga, café com leite'),
  (1,5,'colacao','Gelatina'),
  (1,5,'almoco','Feijoada leve, arroz, laranja'),
  (1,5,'lanche_tarde','Bolo de cenoura'),
  (1,5,'jantar','Arroz, omelete, salada'),
  (1,5,'ceia','Vitamina de morango'),
-- Domingo
  (1,6,'cafe_manha','Rabanada assada, café com leite'),
  (1,6,'colacao','Mamão'),
  (1,6,'almoco','Frango ao molho, arroz, feijão, chuchu'),
  (1,6,'lanche_tarde','Suco de maracujá'),
  (1,6,'jantar','Macarrão ao alho e óleo, carne moída'),
  (1,6,'ceia','Leite com mel');

-- Semana 2 (estrutura base)
INSERT INTO cardapio (semana, dia_semana, refeicao, descricao) VALUES
  (2,0,'cafe_manha','Pão francês com margarina, café com leite'),
  (2,0,'colacao','Banana'),
  (2,0,'almoco','Arroz, feijão, filé de frango, abobrinha'),
  (2,0,'lanche_tarde','Iogurte de frutas'),
  (2,0,'jantar','Caldo de legumes, torradas'),
  (2,0,'ceia','Leite morno'),
  (2,1,'cafe_manha','Mingau de fubá, café'),
  (2,1,'colacao','Maçã'),
  (2,1,'almoco','Arroz, lentilha, carne assada, salada'),
  (2,1,'lanche_tarde','Laranja'),
  (2,1,'jantar','Macarrão ao sugo, frango'),
  (2,1,'ceia','Chá com bolacha'),
  (2,2,'cafe_manha','Tapioca com queijo, café'),
  (2,2,'colacao','Mamão com laranja'),
  (2,2,'almoco','Arroz, feijão, peixe grelhado, cenoura'),
  (2,2,'lanche_tarde','Bolo de fubá'),
  (2,2,'jantar','Sopa de mandioca'),
  (2,2,'ceia','Vitamina de banana'),
  (2,3,'cafe_manha','Pão integral, requeijão, café'),
  (2,3,'colacao','Suco de laranja'),
  (2,3,'almoco','Arroz, feijão, frango ensopado, couve'),
  (2,3,'lanche_tarde','Fruta da época'),
  (2,3,'jantar','Omelete, arroz, salada'),
  (2,3,'ceia','Iogurte'),
  (2,4,'cafe_manha','Cuscuz, manteiga, café'),
  (2,4,'colacao','Banana'),
  (2,4,'almoco','Macarrão, carne moída, brócolis'),
  (2,4,'lanche_tarde','Gelatina'),
  (2,4,'jantar','Sopa de feijão'),
  (2,4,'ceia','Chá'),
  (2,5,'cafe_manha','Pão de queijo, café com leite'),
  (2,5,'colacao','Mamão'),
  (2,5,'almoco','Arroz, feijão preto, costela, couve'),
  (2,5,'lanche_tarde','Vitamina de mamão'),
  (2,5,'jantar','Arroz, ovo cozido, salada'),
  (2,5,'ceia','Leite com achocolatado'),
  (2,6,'cafe_manha','Rabanada, café com leite'),
  (2,6,'colacao','Laranja'),
  (2,6,'almoco','Frango assado, arroz, feijão, farofa'),
  (2,6,'lanche_tarde','Suco de acerola'),
  (2,6,'jantar','Caldo de abóbora'),
  (2,6,'ceia','Leite morno');

-- ─── REGISTRO DE PRODUÇÃO DIÁRIA ────────────────────────────
CREATE TABLE producao_diaria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data DATE NOT NULL,
  semana_cardapio INTEGER NOT NULL,
  dia_semana INTEGER NOT NULL,
  refeicao refeicao_tipo NOT NULL,
  descricao TEXT,
  num_idosos INTEGER NOT NULL,
  status status_producao DEFAULT 'pendente',
  confirmado_em TIMESTAMPTZ,
  confirmado_por UUID REFERENCES usuarios(id),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (data, refeicao)
);

-- ─── ITENS DA PRODUÇÃO ───────────────────────────────────────
CREATE TABLE producao_itens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producao_id UUID NOT NULL REFERENCES producao_diaria(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES produtos(id),
  nome_item TEXT NOT NULL,
  quantidade_prevista NUMERIC(10,3) NOT NULL,
  quantidade_utilizada NUMERIC(10,3),
  unidade TEXT NOT NULL,
  utilizado BOOLEAN DEFAULT FALSE,
  observacoes TEXT
);

-- ─── PERDAS ──────────────────────────────────────────────────
CREATE TABLE perdas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  produto_id UUID REFERENCES produtos(id),
  nome_item TEXT NOT NULL,
  quantidade NUMERIC(10,3) NOT NULL,
  unidade TEXT NOT NULL,
  motivo TEXT,
  producao_id UUID REFERENCES producao_diaria(id),
  registrado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── LISTA DE COMPRAS ────────────────────────────────────────
CREATE TABLE listas_compra (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo TEXT NOT NULL,
  tipo TEXT DEFAULT 'mensal' CHECK (tipo IN ('mensal','semanal','emergencial')),
  semana_referencia INTEGER,
  status status_compra DEFAULT 'pendente',
  aprovado_por UUID REFERENCES usuarios(id),
  aprovado_em TIMESTAMPTZ,
  total_estimado NUMERIC(12,2),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE compra_itens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lista_id UUID NOT NULL REFERENCES listas_compra(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES produtos(id),
  nome_item TEXT NOT NULL,
  categoria categoria_alimento,
  quantidade_necessaria NUMERIC(10,3) NOT NULL,
  quantidade_estoque NUMERIC(10,3) DEFAULT 0,
  quantidade_comprar NUMERIC(10,3) NOT NULL,
  unidade TEXT NOT NULL,
  preco_unitario NUMERIC(10,2),
  total_estimado NUMERIC(12,2),
  fornecedor_id UUID REFERENCES fornecedores(id),
  status status_compra DEFAULT 'pendente',
  observacoes TEXT
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE preparacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE preparacao_ingredientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cardapio ENABLE ROW LEVEL SECURITY;
ALTER TABLE producao_diaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE producao_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE perdas ENABLE ROW LEVEL SECURITY;
ALTER TABLE listas_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE compra_itens ENABLE ROW LEVEL SECURITY;

-- Políticas: usuários autenticados leem tudo
CREATE POLICY "Autenticados leem" ON configuracoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados leem" ON usuarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados leem" ON fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados leem" ON produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados leem" ON movimentacoes_estoque FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados leem" ON preparacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados leem" ON preparacao_ingredientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados leem" ON cardapio FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados leem" ON producao_diaria FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados leem" ON producao_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados leem" ON perdas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados leem" ON listas_compra FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados leem" ON compra_itens FOR SELECT TO authenticated USING (true);

-- Políticas de escrita (todos autenticados podem escrever — controle por perfil no app)
CREATE POLICY "Autenticados escrevem" ON configuracoes FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados escrevem" ON usuarios FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados escrevem" ON fornecedores FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados escrevem" ON produtos FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados escrevem" ON movimentacoes_estoque FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados escrevem" ON preparacoes FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados escrevem" ON preparacao_ingredientes FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados escrevem" ON cardapio FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados escrevem" ON producao_diaria FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados escrevem" ON producao_itens FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados escrevem" ON perdas FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados escrevem" ON listas_compra FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados escrevem" ON compra_itens FOR ALL TO authenticated USING (true);

-- ─── TRIGGERS: updated_at automático ─────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_configuracoes BEFORE UPDATE ON configuracoes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_produtos BEFORE UPDATE ON produtos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_preparacoes BEFORE UPDATE ON preparacoes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_cardapio BEFORE UPDATE ON cardapio FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_listas_compra BEFORE UPDATE ON listas_compra FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_usuarios BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── FUNÇÃO: criar usuário após signup ───────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, nome, email, perfil)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'perfil')::perfil_usuario, 'cozinha')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── ÍNDICES PARA PERFORMANCE ────────────────────────────────
CREATE INDEX idx_cardapio_semana_dia ON cardapio(semana, dia_semana);
CREATE INDEX idx_producao_data ON producao_diaria(data);
CREATE INDEX idx_movimentacoes_produto ON movimentacoes_estoque(produto_id);
CREATE INDEX idx_movimentacoes_data ON movimentacoes_estoque(created_at);
CREATE INDEX idx_produtos_categoria ON produtos(categoria);
CREATE INDEX idx_produtos_status ON produtos(quantidade_atual, estoque_minimo);
CREATE INDEX idx_compra_itens_lista ON compra_itens(lista_id);
