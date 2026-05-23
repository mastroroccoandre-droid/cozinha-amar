// ── ENUMS ─────────────────────────────────────────────────────────────
export type PerfilUsuario = 'admin' | 'nutricionista' | 'cozinha'
export type RefeicaoTipo = 'cafe_manha' | 'colacao' | 'almoco' | 'lanche_tarde' | 'jantar' | 'ceia'
export type CategoriaAlimento = 'hortifruti' | 'carnes' | 'congelados' | 'secos' | 'laticinios' | 'padaria' | 'limpeza' | 'bebidas' | 'descartaveis' | 'outros'
export type LocalEstoque = 'despensa' | 'geladeira' | 'freezer' | 'estoque_secundario'
export type StatusCompra = 'pendente' | 'aprovado' | 'recebido' | 'cancelado'
export type StatusProducao = 'pendente' | 'em_andamento' | 'concluido'

// ── LABELS ────────────────────────────────────────────────────────────
export const REFEICAO_LABELS: Record<RefeicaoTipo, string> = {
  cafe_manha: 'Café da manhã',
  colacao: 'Colação',
  almoco: 'Almoço',
  lanche_tarde: 'Lanche da tarde',
  jantar: 'Jantar',
  ceia: 'Ceia',
}

export const REFEICAO_HORARIOS: Record<RefeicaoTipo, string> = {
  cafe_manha: '07:00',
  colacao: '09:30',
  almoco: '12:00',
  lanche_tarde: '15:30',
  jantar: '18:30',
  ceia: '20:30',
}

export const REFEICAO_ORDER: RefeicaoTipo[] = [
  'cafe_manha', 'colacao', 'almoco', 'lanche_tarde', 'jantar', 'ceia'
]

export const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
export const DIAS_SEMANA_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export const CATEGORIA_LABELS: Record<CategoriaAlimento, string> = {
  hortifruti: 'Hortifruti',
  carnes: 'Carnes',
  congelados: 'Congelados',
  secos: 'Secos',
  laticinios: 'Laticínios',
  padaria: 'Padaria',
  limpeza: 'Limpeza',
  bebidas: 'Bebidas',
  descartaveis: 'Descartáveis',
  outros: 'Outros',
}

export const LOCAL_LABELS: Record<LocalEstoque, string> = {
  despensa: 'Despensa',
  geladeira: 'Geladeira',
  freezer: 'Freezer',
  estoque_secundario: 'Estoque Secundário',
}

// ── DATABASE TYPES ────────────────────────────────────────────────────
export interface Configuracao {
  id: string
  nome_ilpi: string
  responsavel_tecnico?: string
  num_idosos: number
  margem_seguranca: number
  fator_correcao: number
  created_at: string
  updated_at: string
}

export interface Usuario {
  id: string
  nome: string
  email: string
  perfil: PerfilUsuario
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface Fornecedor {
  id: string
  nome: string
  contato?: string
  telefone?: string
  email?: string
  categorias?: CategoriaAlimento[]
  observacoes?: string
  ativo: boolean
  created_at: string
}

export interface Produto {
  id: string
  nome: string
  categoria: CategoriaAlimento
  unidade: string
  quantidade_atual: number
  estoque_minimo: number
  local_armazenamento: LocalEstoque
  data_validade?: string
  preco_medio?: number
  fornecedor_id?: string
  observacoes?: string
  ativo: boolean
  created_at: string
  updated_at: string
  // Joins
  fornecedor?: Fornecedor
}

export interface MovimentacaoEstoque {
  id: string
  produto_id: string
  tipo: 'entrada' | 'saida' | 'ajuste' | 'perda'
  quantidade: number
  quantidade_anterior?: number
  quantidade_posterior?: number
  motivo?: string
  referencia_id?: string
  usuario_id?: string
  created_at: string
  // Joins
  produto?: Produto
  usuario?: Usuario
}

export interface PreparacaoIngrediente {
  id: string
  preparacao_id: string
  produto_id?: string
  nome_ingrediente: string
  quantidade_por_idoso: number
  unidade: string
  fator_correcao: number
  observacoes?: string
  // Joins
  produto?: Produto
}

export interface Preparacao {
  id: string
  nome: string
  categoria: string
  tipo_refeicao: RefeicaoTipo
  rendimento_porcoes: number
  observacoes?: string
  substituicoes?: string
  ativo: boolean
  created_by?: string
  created_at: string
  updated_at: string
  // Joins
  ingredientes?: PreparacaoIngrediente[]
}

export interface Cardapio {
  id: string
  semana: number
  dia_semana: number
  refeicao: RefeicaoTipo
  descricao: string
  preparacao_id?: string
  observacoes?: string
  created_at: string
  updated_at: string
  // Joins
  preparacao?: Preparacao
}

export interface ProducaoDiaria {
  id: string
  data: string
  semana_cardapio: number
  dia_semana: number
  refeicao: RefeicaoTipo
  descricao?: string
  num_idosos: number
  status: StatusProducao
  confirmado_em?: string
  confirmado_por?: string
  observacoes?: string
  created_at: string
  // Joins
  itens?: ProducaoItem[]
}

export interface ProducaoItem {
  id: string
  producao_id: string
  produto_id?: string
  nome_item: string
  quantidade_prevista: number
  quantidade_utilizada?: number
  unidade: string
  utilizado: boolean
  observacoes?: string
}

export interface Perda {
  id: string
  data: string
  produto_id?: string
  nome_item: string
  quantidade: number
  unidade: string
  motivo?: string
  producao_id?: string
  registrado_por?: string
  created_at: string
}

export interface ListaCompra {
  id: string
  titulo: string
  tipo: 'mensal' | 'semanal' | 'emergencial'
  semana_referencia?: number
  status: StatusCompra
  aprovado_por?: string
  aprovado_em?: string
  total_estimado?: number
  observacoes?: string
  created_at: string
  updated_at: string
  // Joins
  itens?: CompraItem[]
}

export interface CompraItem {
  id: string
  lista_id: string
  produto_id?: string
  nome_item: string
  categoria?: CategoriaAlimento
  quantidade_necessaria: number
  quantidade_estoque: number
  quantidade_comprar: number
  unidade: string
  preco_unitario?: number
  total_estimado?: number
  fornecedor_id?: string
  status: StatusCompra
  observacoes?: string
  // Joins
  produto?: Produto
  fornecedor?: Fornecedor
}

// ── FORM TYPES ────────────────────────────────────────────────────────
export interface ProdutoForm {
  nome: string
  categoria: CategoriaAlimento
  unidade: string
  quantidade_atual: number
  estoque_minimo: number
  local_armazenamento: LocalEstoque
  data_validade?: string
  preco_medio?: number
  fornecedor_id?: string
  observacoes?: string
}

export interface PreparacaoForm {
  nome: string
  categoria: string
  tipo_refeicao: RefeicaoTipo
  observacoes?: string
  substituicoes?: string
  ingredientes: {
    nome_ingrediente: string
    quantidade_por_idoso: number
    unidade: string
  }[]
}

export interface CardapioForm {
  semana: number
  dia_semana: number
  refeicao: RefeicaoTipo
  descricao: string
  preparacao_id?: string
  observacoes?: string
}
