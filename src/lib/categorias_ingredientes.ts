// ============================================================
// MAPA DE CATEGORIAS DE INGREDIENTES — Lista de Compras
// Sistema Cozinha Amar / Residencial Amar
// ============================================================
//
// COMO FUNCIONA:
// A lista de compras normaliza o nome do ingrediente (minúsculas,
// sem acento, sem espaço extra), aplica APELIDOS (funde grafias
// diferentes do mesmo item) e busca a categoria em CATEGORIAS.
//
// RÉGUA DE CATEGORIZAÇÃO (decisão do André):
// A categoria reflete "COM QUEM eu compro", não a natureza do alimento.
//   • carnes      = açougue (proteínas, embutidos)
//   • hortifruti  = feira/sacolão (frutas e verduras FRESCAS)
//   • secos       = mercearia (grãos, farinhas, bolos prontos,
//                   gelatinas, polpas, sucos em pó, temperos secos)
//   • laticinios  = leite, queijo, margarina, iogurte, requeijão
//   • bebidas     = café, chás, cidreira
//   • outros      = o que não se encaixa
//
// ⚠️ FUSÃO: variações de CORTE/apresentação NÃO são fundidas
//   (pernil ≠ pernil cubos = compras diferentes). Só grafia/acento.
//
// >>> REVISAR OS ITENS MARCADOS COM "// ?" — classificação incerta <<<
// ============================================================

// Normaliza um nome: minúsculas, sem acento, sem espaço duplo
export function normalizarNome(nome: string): string {
  return nome
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

// ------------------------------------------------------------
// APELIDOS: nome-variante (normalizado) -> nome canônico (normalizado)
// Funde grafias diferentes do MESMO item. NÃO funde cortes diferentes.
// ------------------------------------------------------------
export const APELIDOS: Record<string, string> = {
  'molho tomate': 'molho de tomate',
  'polpa morango': 'polpa de morango',
  'farinha da milho': 'farinha de milho',
  'farinha mandioca': 'farinha de mandioca',
  'erva cha mate': 'cha mate',
  'erva cidreira': 'cidreira',
  'erva cha camomila': 'camomila',
  'aveia flocos': 'aveia',
  'azeitona sem caroco': 'azeitona',
  // Cortes de carne: MANTIDOS SEPARADOS por decisão do André.
  // (pernil, pernil peca inteira, pernil suino, pernil suino cubos = distintos)
  // Iogurte: fundido (iogurte natural = iogurte) — se forem produtos
  // diferentes na sua compra, remova esta linha:
  'iogurte natural': 'iogurte',
  // Mamão: "mamao formosa" é uma variedade específica — mantido separado.
  // Se for a mesma compra que "mamao", descomente:
  // 'mamao formosa': 'mamao',
}

// ------------------------------------------------------------
// CATEGORIAS: nome canônico (normalizado) -> categoria
// ------------------------------------------------------------
export const CATEGORIAS: Record<string, 'hortifruti' | 'carnes' | 'secos' | 'laticinios' | 'bebidas' | 'outros'> = {

  // ===== HORTIFRUTI (frutas e verduras frescas) =====
  'abacaxi': 'hortifruti',
  'abobrinha': 'hortifruti',
  'acelga': 'hortifruti',
  'agriao': 'hortifruti',
  'alface': 'hortifruti',
  'alface roxa': 'hortifruti',
  'alho': 'hortifruti',            // confirmado hortifruti (G7)
  'banana': 'hortifruti',
  'batata': 'hortifruti',
  'batata bolinha': 'hortifruti',
  'batata doce': 'hortifruti',
  'berinjela': 'hortifruti',
  'beterraba': 'hortifruti',
  'brocolis': 'hortifruti',
  'cabotia': 'hortifruti',
  'cebola': 'hortifruti',
  'cebola roxa': 'hortifruti',
  'cenoura': 'hortifruti',
  'cheiro verde': 'hortifruti',
  'chicoria': 'hortifruti',
  'chuchu': 'hortifruti',
  'couve': 'hortifruti',
  'couve flor': 'hortifruti',
  'erva de hortela': 'hortifruti',
  'espinafre': 'hortifruti',
  'inhame': 'hortifruti',
  'jilo': 'hortifruti',
  'laranja': 'hortifruti',
  'limao': 'hortifruti',
  'maca': 'hortifruti',
  'mamao': 'hortifruti',
  'mamao formosa': 'hortifruti',
  'mandioca': 'hortifruti',
  'mandioquinha': 'hortifruti',
  'manga': 'hortifruti',
  'melancia': 'hortifruti',
  'melao': 'hortifruti',
  'morango': 'hortifruti',
  'palmito': 'hortifruti',
  'pepino': 'hortifruti',
  'pera': 'hortifruti',
  'pimentao amarelo': 'hortifruti',
  'pimentao verde': 'hortifruti',
  'pimentao vermelho': 'hortifruti',
  'quiabo': 'hortifruti',
  'repolho': 'hortifruti',
  'rucula': 'hortifruti',
  'tomate': 'hortifruti',
  'vagem': 'hortifruti',

  // ===== CARNES (açougue: proteínas e embutidos) =====
  'acem': 'carnes',
  'acem cubos': 'carnes',
  'alcatra iscas': 'carnes',
  'bacon': 'carnes',
  'bacon cubos': 'carnes',
  'calabresa': 'carnes',
  'carne moida': 'carnes',
  'carne seca': 'carnes',
  'costela suina': 'carnes',
  'costelinha suina defum': 'carnes',
  'coxa/sobrecoxa': 'carnes',
  'coxao mole': 'carnes',
  'cupim': 'carnes',
  'file de frango': 'carnes',
  'file de peixe': 'carnes',
  'ovo cozido': 'carnes',          // conforme G4 (mas veja nota: 'ovos' cru está em secos)
  'frango desfiado': 'carnes',     // conforme G4 (compra ou faz, é compra de proteína)
  'lagarto': 'carnes',
  'lagarto peca inteira': 'carnes',
  'lombo suino': 'carnes',
  'lombo suino defumado': 'carnes',
  'maminha': 'carnes',
  'maminha peca': 'carnes',
  'musculo bovino': 'carnes',
  'musculo bovino cubos': 'carnes',
  'peito de frango': 'carnes',
  'pernil': 'carnes',
  'pernil peca inteira': 'carnes',
  'pernil suino': 'carnes',
  'pernil suino cubos': 'carnes',
  'presunto': 'carnes',
  'salsicha': 'carnes',
  'sobrecoxa frango': 'carnes',

  // ===== SECOS (mercearia) =====
  'achocolatado': 'secos',
  'acucar': 'secos',
  'amido de milho': 'secos',
  'ameixa sem caroco': 'secos',    // ameixa passa/seca = mercearia (G7)
  'ervilha': 'secos',              // ervilha seca/lata = mercearia (G7)
  'arroz': 'secos',
  'atum': 'secos',                 // enlatado = mercearia (G3)
  'sardinha': 'secos',             // enlatada = mercearia (G3)
  'aveia': 'secos',
  'azeite': 'secos',
  'azeitona': 'secos',
  'biscoito': 'secos',
  'biscoito pao de mel': 'secos',
  'bisnaguinha integral': 'secos',
  'bolacha salgada': 'secos',
  'bolo chocolate': 'secos',
  'bolo de baunilha': 'secos',
  'bolo de cenoura': 'secos',
  'bolo de coco': 'secos',
  'bolo de fuba': 'secos',
  'bolo de laranja': 'secos',
  'bolo de limao': 'secos',
  'bolo de milho': 'secos',
  'canela': 'secos',
  'canela em po': 'secos',
  'canjica': 'secos',
  'canjiquinha': 'secos',
  'chocolate em po': 'secos',
  'coco ralado': 'secos',
  'doce pingo de leite': 'secos',  // doce de leite pronto = mercearia (G2)
  'farinha de milho': 'secos',
  'farinha de trigo': 'secos',
  'farinha de mandioca': 'secos',
  'farinha milho grossa': 'secos',
  'feijao': 'secos',
  'feijao branco': 'secos',
  'feijao fradinho': 'secos',
  'feijao preto': 'secos',
  'fermento em po': 'secos',
  'fuba': 'secos',
  'fuba mimoso': 'secos',
  'gelatina de abacaxi': 'secos',
  'gelatina de limao': 'secos',
  'gelatina de morango': 'secos',
  'gelatina de uva': 'secos',
  'gelatina framboesa': 'secos',
  'gelatina maracuja': 'secos',
  'gelatina sem sabor': 'secos',
  'geleia de goiaba': 'secos',
  'granulado': 'secos',
  'grao de bico': 'secos',
  'ketchup': 'secos',
  'macarrao': 'secos',
  'macarrao espaguete': 'secos',
  'macarrao padre nosso': 'secos',
  'maionese': 'secos',
  'massa de pizza': 'secos',
  'mel': 'secos',
  'milho': 'secos',
  'mistura bolo de cenoura': 'secos',
  'mistura bolo de milho': 'secos',
  'molho de tomate': 'secos',
  'noz moscada': 'secos',
  'nhoque': 'secos',
  'oleo': 'secos',
  'oregano': 'secos',
  'ovos': 'secos',                 // seu enum não tem categoria melhor p/ ovo (G6)
  'pacoca': 'secos',
  'pao de forma': 'secos',
  'paes colab': 'secos',
  'paes idosos': 'secos',
  'parmesao ralado': 'secos',      // queijo ralado seco = mercearia (G2)
  'leite de coco': 'secos',        // não é laticínio, vai na mercearia (G2)
  'polpa de abacaxi': 'secos',
  'polpa de acerola': 'secos',
  'polpa de caju': 'secos',
  'polpa de manga': 'secos',
  'polpa de maracuja': 'secos',    // (antes você disse bebidas — unifiquei p/ secos)
  'polpa de morango': 'secos',
  'polpa de uva': 'secos',
  'sagu': 'secos',
  'shoyu': 'secos',
  'sorvete napolitano': 'secos', // congelado, comprado na mercearia (G5)
  'suco concentr. maracuja': 'secos',
  'suco de uva concentrado': 'secos',
  'suco goiaba em po': 'secos',
  'suco mamao em po': 'secos',
  'suco manga em po': 'secos',
  'suco tangerina em po': 'secos',
  'trigo': 'secos',
  'vinagre': 'secos',

  // ===== LATICÍNIOS =====
  'creme de leite': 'laticinios',
  'iogurte': 'laticinios',
  'leite': 'laticinios',
  'leite colab': 'laticinios',
  'leite condensado': 'laticinios',
  'leite idosos': 'laticinios',
  'margarina': 'laticinios',
  'mucarela': 'laticinios',
  'requeijao': 'laticinios',

  // ===== BEBIDAS =====
  'cafe': 'bebidas',
  'camomila': 'bebidas',
  'cha mate': 'bebidas',
  'cidreira': 'bebidas',

  // ===== OUTROS =====
  // (nada por enquanto — tudo se encaixou nas 6 acima)
}

// Categoria padrão para itens sem classificação
export const CATEGORIA_PADRAO = 'outros' as const

// Função helper: dado um nome cru, retorna a categoria
export function categoriaDoIngrediente(nomeCru: string): string {
  let norm = normalizarNome(nomeCru)
  if (APELIDOS[norm]) norm = APELIDOS[norm]
  return CATEGORIAS[norm] ?? CATEGORIA_PADRAO
}

// Função helper: dado um nome cru, retorna o nome canônico (para agrupar)
export function nomeCanonico(nomeCru: string): string {
  const norm = normalizarNome(nomeCru)
  return APELIDOS[norm] ?? norm
}
