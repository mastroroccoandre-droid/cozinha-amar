'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'

const supabase = getSupabase()

type CompraItem = {
  id: string
  lista_id: string
  produto_id: string | null
  nome_item: string
  categoria: string
  quantidade_comprar: number
  unidade: string
  preco_unitario: number | null
  total_estimado: number | null
  status: string
}

type Lista = {
  id: string
  titulo: string
  tipo: string
  status: string
  total_estimado: number | null
  created_at: string
}

const CATEGORIAS = ['hortifruti', 'carnes', 'secos', 'laticinios', 'bebidas', 'outros']
const CATEGORIA_LABELS: Record<string, string> = {
  hortifruti: 'Hortifruti',
  carnes: 'Carnes',
  secos: 'Secos',
  laticinios: 'Laticínios',
  bebidas: 'Bebidas',
  outros: 'Outros',
}

function getSemanaDoMes(data: Date): number {
  const primeiroDia = new Date(data.getFullYear(), data.getMonth(), 1)
  const diaDaSemana = primeiroDia.getDay()
  // Semana real do calendário (pode chegar a 6 em alguns meses)
  return Math.ceil((data.getDate() + diaDaSemana) / 7)
}

// Mapeia todos os dias de um mês para { semana, dia_semana }
function mapearDiasDoMes(ano: number, mes: number): { semana: number; dia_semana: number }[] {
  const dias: { semana: number; dia_semana: number }[] = []
  const totalDias = new Date(ano, mes + 1, 0).getDate()
  for (let d = 1; d <= totalDias; d++) {
    const data = new Date(ano, mes, d)
    let semana = getSemanaDoMes(data)
    // O cardápio só tem 5 semanas. A 6ª linha do calendário usa a Semana 1
    // (não repete a semana anterior).
    if (semana > 5) semana = 1
    // No sistema: 0=Segunda, 1=Terça, 2=Quarta, 3=Quinta, 4=Sexta, 5=Sábado, 6=Domingo
    // getDay(): 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
    const diaSistema = data.getDay() === 0 ? 6 : data.getDay() - 1
    dias.push({ semana, dia_semana: diaSistema })
  }
  return dias
}

const EMAILS_COZINHA = ['rosildacardoso1203@gmail.com']

export default function ComprasPage() {
  const [listas, setListas] = useState<Lista[]>([])
  const [listaSelecionada, setListaSelecionada] = useState<Lista | null>(null)
  const [itens, setItens] = useState<CompraItem[]>([])
  const [loading, setLoading] = useState(true)
  const [gerandoLista, setGerandoLista] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [modalPreco, setModalPreco] = useState<CompraItem | null>(null)
  const [precoInput, setPrecoInput] = useState('')
  const [qtdComprando, setQtdComprando] = useState('')
  const [emailUsuario, setEmailUsuario] = useState<string>('')
  const [quantidades, setQuantidades] = useState<Record<string, number>>({})
  const [salvandoItem, setSalvandoItem] = useState<string | null>(null)
  const [modalHistorico, setModalHistorico] = useState(false)
  const [modalAvulso, setModalAvulso] = useState(false)
  const [produtosCadastrados, setProdutosCadastrados] = useState<{ id: string; nome: string; unidade: string; categoria: string }[]>([])
  const [avulso, setAvulso] = useState({ nome: '', quantidade: '', unidade: 'kg', categoria: 'outros', produto_id: null as string | null })
  const [salvandoAvulso, setSalvandoAvulso] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [carregandoLogs, setCarregandoLogs] = useState(false)

  useEffect(() => {
    getSupabase().auth.getUser().then(({ data }) => {
      setEmailUsuario(data.user?.email ?? '')
    })
  }, [])

  const isCozinha = EMAILS_COZINHA.includes(emailUsuario)
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas')

  // Registra uma ação no log de auditoria
  async function registrarLog(params: {
    item: CompraItem
    acao: string
    quantidadeAnterior?: number | null
    quantidadeNova?: number | null
  }) {
    await supabase.from('log_compras').insert({
      lista_id: listaSelecionada?.id ?? null,
      lista_titulo: listaSelecionada?.titulo ?? null,
      nome_item: params.item.nome_item,
      acao: params.acao,
      quantidade_anterior: params.quantidadeAnterior ?? null,
      quantidade_nova: params.quantidadeNova ?? null,
      unidade: params.item.unidade,
      usuario_email: emailUsuario || 'desconhecido',
    })
  }

  // Modal gerar lista
  const hoje = new Date()
  const [mesRef, setMesRef] = useState(hoje.getMonth()) // 0-11
  const [anoRef, setAnoRef] = useState(hoje.getFullYear())
  const [semanasSelecionadas, setSemanasSelecionadas] = useState<number[]>([1, 2, 3, 4, 5])
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>([...CATEGORIAS])
  const [descontarEstoque, setDescontarEstoque] = useState(false)

  const carregarListas = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('listas_compra')
      .select('*')
      .order('created_at', { ascending: false })
    setListas(data || [])
    if (data && data.length > 0 && !listaSelecionada) {
      setListaSelecionada(data[0])
    }
    setLoading(false)
  }, [listaSelecionada])

  useEffect(() => {
    carregarListas()
  }, [])

  useEffect(() => {
    if (listaSelecionada) carregarItens(listaSelecionada.id)
  }, [listaSelecionada])

  async function carregarItens(listaId: string) {
    const { data } = await supabase
      .from('compra_itens')
      .select('*')
      .eq('lista_id', listaId)
      .eq('status', 'pendente')
      .order('categoria')
      .order('nome_item')
    setItens(data || [])
    // Inicializa quantidades editáveis
    const qtds: Record<string, number> = {}
    ;(data || []).forEach((i: CompraItem) => { qtds[i.id] = i.quantidade_comprar })
    setQuantidades(qtds)
  }

  function alterarQuantidade(id: string, delta: number) {
    setQuantidades(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] ?? 0) + delta)
    }))
  }

  async function salvarQuantidade(item: CompraItem) {
    const novaQtd = quantidades[item.id] ?? item.quantidade_comprar
    if (novaQtd === item.quantidade_comprar) return

    // Se zerou, confirma antes de remover da lista
    if (novaQtd === 0) {
      const ok = confirm(`"${item.nome_item}" será removido da lista de compras (quantidade zerada). Tem certeza que deseja realizar essa mudança?`)
      if (!ok) {
        // Desfaz: volta ao valor original
        setQuantidades(prev => ({ ...prev, [item.id]: item.quantidade_comprar }))
        return
      }
      setSalvandoItem(item.id)
      await registrarLog({ item, acao: 'removido (zerado)', quantidadeAnterior: item.quantidade_comprar, quantidadeNova: 0 })
      await supabase.from('compra_itens').delete().eq('id', item.id)
      setItens(prev => prev.filter(i => i.id !== item.id))
      setSalvandoItem(null)
      return
    }

    setSalvandoItem(item.id)
    await registrarLog({ item, acao: 'quantidade alterada', quantidadeAnterior: item.quantidade_comprar, quantidadeNova: novaQtd })
    await supabase
      .from('compra_itens')
      .update({ quantidade_comprar: novaQtd })
      .eq('id', item.id)
    setItens(prev => prev.map(i => i.id === item.id ? { ...i, quantidade_comprar: novaQtd } : i))
    setSalvandoItem(null)
  }

  async function excluirItem(item: CompraItem) {
    const ok = confirm(`Remover "${item.nome_item}" da lista?`)
    if (!ok) return
    setSalvandoItem(item.id)
    await registrarLog({ item, acao: 'item excluído', quantidadeAnterior: item.quantidade_comprar, quantidadeNova: null })
    await supabase.from('compra_itens').delete().eq('id', item.id)
    setItens(prev => prev.filter(i => i.id !== item.id))
    setSalvandoItem(null)
  }

  async function abrirHistorico() {
    setModalHistorico(true)
    setCarregandoLogs(true)
    const { data } = await supabase
      .from('log_compras')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    setLogs(data || [])
    setCarregandoLogs(false)
  }

  async function abrirModalAvulso() {
    if (!listaSelecionada) {
      alert('Selecione ou gere uma lista primeiro.')
      return
    }
    setModalAvulso(true)
    setAvulso({ nome: '', quantidade: '', unidade: 'kg', categoria: 'outros', produto_id: null })
    // Carrega produtos cadastrados para o autocomplete
    const { data } = await supabase
      .from('produtos')
      .select('id, nome, unidade, categoria')
      .eq('ativo', true)
      .order('nome')
    setProdutosCadastrados(data || [])
  }

  // Quando escolhe um produto da lista, preenche unidade e categoria
  function selecionarProdutoAvulso(nome: string) {
    const prod = produtosCadastrados.find(p => p.nome === nome)
    if (prod) {
      setAvulso(a => ({ ...a, nome: prod.nome, unidade: prod.unidade, categoria: prod.categoria, produto_id: prod.id }))
    } else {
      setAvulso(a => ({ ...a, nome, produto_id: null }))
    }
  }

  async function salvarItemAvulso() {
    if (!listaSelecionada) return
    if (!avulso.nome.trim()) {
      alert('Informe o nome do item.')
      return
    }
    const qtd = parseFloat(avulso.quantidade.replace(',', '.')) || 0
    if (qtd <= 0) {
      alert('Informe a quantidade.')
      return
    }
    setSalvandoAvulso(true)

    await supabase.from('compra_itens').insert({
      lista_id: listaSelecionada.id,
      produto_id: avulso.produto_id,
      nome_item: avulso.nome.trim(),
      categoria: avulso.categoria,
      quantidade_necessaria: qtd,
      quantidade_estoque: 0,
      quantidade_comprar: qtd,
      unidade: avulso.unidade,
      preco_unitario: null,
      total_estimado: null,
      status: 'pendente',
    })

    setSalvandoAvulso(false)
    setModalAvulso(false)
    carregarItens(listaSelecionada.id)
  }

  function toggleSemana(s: number) {
    setSemanasSelecionadas(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s].sort()
    )
  }

  function toggleCategoria(c: string) {
    setCategoriasSelecionadas(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    )
  }

  async function gerarLista() {
    if (semanasSelecionadas.length === 0) {
      alert('Selecione pelo menos uma semana.')
      return
    }
    if (categoriasSelecionadas.length === 0) {
      alert('Selecione pelo menos uma categoria.')
      return
    }

    setGerandoLista(true)

    try {
      // 1. Mapear dias reais do mês selecionado
      const diasDoMes = mapearDiasDoMes(anoRef, mesRef)

      // 2. Contar quantas vezes cada combinação (semana, dia_semana) aparece no mês
      // filtrado pelas semanas selecionadas
      const contagem: Record<string, number> = {}
      for (const dia of diasDoMes) {
        if (!semanasSelecionadas.includes(dia.semana)) continue
        const chave = `${dia.semana}_${dia.dia_semana}`
        contagem[chave] = (contagem[chave] || 0) + 1
      }

      // 4. Buscar preparações filtrando pelo nome (padrão: "Refeição SemX/DiaY")
      const { data: todasPreps } = await supabase
        .from('preparacoes')
        .select('id, nome, tipo_refeicao')

      const prepsFiltradas = (todasPreps || []).filter(p => {
        const match = p.nome?.match(/Sem(\d+)\/Dia(\d+)/)
        if (!match) return false
        const semana = parseInt(match[1])
        return semanasSelecionadas.includes(semana)
      })

      // 5. Buscar ingredientes dessas preparações
      const prepIds = prepsFiltradas.map(p => p.id)
      if (prepIds.length === 0) {
        alert('Nenhuma preparação encontrada para as semanas selecionadas.')
        setGerandoLista(false)
        return
      }

      const { data: ingredientes } = await supabase
        .from('preparacao_ingredientes')
        .select('*')
        .in('preparacao_id', prepIds)
        .in('categoria', categoriasSelecionadas)

      // 6. Para cada ingrediente, calcular quantidade necessária
      // baseada nos dias reais do mês
      const totais: Record<string, {
        nome: string
        categoria: string
        unidade: string
        produto_id: string | null
        quantidadeNecessaria: number
        quantidadeEstoque: number
        quantidade: number
      }> = {}

      for (const ing of ingredientes || []) {
        const prep = prepsFiltradas.find(p => p.id === ing.preparacao_id)
        if (!prep) continue

        const match = prep.nome?.match(/Sem(\d+)\/Dia(\d+)/)
        if (!match) continue
        const semana = parseInt(match[1])
        const diaSistema = parseInt(match[2])

        const chave = `${semana}_${diaSistema}`
        const vezes = contagem[chave] || 0
        if (vezes === 0) continue

        // quantidade_por_idoso já é o total da refeição (nutricionista já calculou)
        let qtd = ing.quantidade_por_idoso * vezes
        let unidade = ing.unidade

        // Converte SEMPRE para a unidade base na leitura (g→kg, ml→L),
        // independente da ordem dos registros. Assim a soma nunca mistura unidades.
        if (unidade === 'g') { qtd /= 1000; unidade = 'kg' }
        if (unidade === 'ml') { qtd /= 1000; unidade = 'L' }

        // Normaliza nome para evitar duplicatas por acento (ex: "Moída" vs "Moida")
        const chaveIng = ing.nome_ingrediente.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')

        if (!totais[chaveIng]) {
          totais[chaveIng] = {
            nome: ing.nome_ingrediente,
            categoria: ing.categoria,
            unidade,
            produto_id: ing.produto_id || null,
            quantidadeNecessaria: 0,
            quantidadeEstoque: 0,
            quantidade: 0,
          }
        }

        totais[chaveIng].quantidadeNecessaria += qtd
        totais[chaveIng].quantidade += qtd
      }

      // 7. Buscar estoque atual para todos os itens (para registrar quantidade_estoque)
      const { data: produtos } = await supabase
        .from('produtos')
        .select('id, nome, quantidade_atual, unidade')

      for (const chave of Object.keys(totais)) {
        const item = totais[chave]
        const produto = (produtos || []).find(
          p => p.nome.toLowerCase() === item.nome.toLowerCase() ||
               p.id === item.produto_id
        )
        if (produto) {
          let estoqueConvertido = produto.quantidade_atual
          if (item.unidade === 'g' && produto.unidade === 'kg') estoqueConvertido *= 1000
          if (item.unidade === 'kg' && produto.unidade === 'g') estoqueConvertido /= 1000
          if (item.unidade === 'ml' && produto.unidade === 'L') estoqueConvertido *= 1000
          if (item.unidade === 'L' && produto.unidade === 'ml') estoqueConvertido /= 1000
          item.quantidadeEstoque = estoqueConvertido

          // Descontar estoque se solicitado
          if (descontarEstoque) {
            item.quantidade = Math.max(0, item.quantidade - estoqueConvertido)
          }
        }
      }

      // 8. Filtrar itens com quantidade > 0 e ordenar por nome
      const itensFinal = Object.values(totais)
        .filter(i => i.quantidade > 0)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

      if (itensFinal.length === 0) {
        alert('Nenhum item gerado. Verifique as semanas/categorias selecionadas.')
        setGerandoLista(false)
        return
      }

      // 9. Criar lista no banco
      const mesesNomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
      const titulo = `Lista ${mesesNomes[mesRef]}/${anoRef} — Sem. ${semanasSelecionadas.join(',')}${descontarEstoque ? ' (c/ estoque)' : ''}`

      const { data: novaLista, error: erroLista } = await supabase
        .from('listas_compra')
        .insert({ titulo, tipo: 'mensal', status: 'pendente', total_estimado: null })
        .select()
        .single()

      if (erroLista || !novaLista) {
        alert('Erro ao criar lista.')
        setGerandoLista(false)
        return
      }

      // 10. Inserir itens
      const itensParaInserir = itensFinal.map(i => ({
        lista_id: novaLista.id,
        produto_id: i.produto_id,
        nome_item: i.nome,
        categoria: i.categoria,
        quantidade_necessaria: Math.round(i.quantidadeNecessaria * 100) / 100,
        quantidade_estoque: Math.round(i.quantidadeEstoque * 100) / 100,
        quantidade_comprar: Math.round(i.quantidade * 100) / 100,
        unidade: i.unidade,
        preco_unitario: null,
        total_estimado: null,
      }))

      await supabase.from('compra_itens').insert(itensParaInserir)

      await carregarListas()
      setListaSelecionada(novaLista)
      setModalAberto(false)
    } catch (err) {
      console.error(err)
      alert('Erro ao gerar lista.')
    }

    setGerandoLista(false)
  }

  async function marcarComprado(item: CompraItem) {
    if (item.status !== 'pendente') return
    setModalPreco(item)
    setPrecoInput('')
    setQtdComprando(String(item.quantidade_comprar)) // default: compra tudo
  }

  async function confirmarCompra() {
    if (!modalPreco) return
    const preco = parseFloat(precoInput.replace(',', '.')) || 0
    const comprando = parseFloat(qtdComprando.replace(',', '.')) || 0
    const totalPedido = modalPreco.quantidade_comprar

    if (comprando <= 0) {
      alert('Informe a quantidade que está comprando.')
      return
    }
    if (comprando > totalPedido) {
      alert(`Você não pode comprar mais que o pedido (${totalPedido} ${modalPreco.unidade}). Ajuste a quantidade.`)
      return
    }

    const total = preco * comprando
    const parcial = comprando < totalPedido
    const saldo = Math.round((totalPedido - comprando) * 100) / 100

    await registrarLog({
      item: modalPreco,
      acao: parcial ? `compra parcial (${comprando} de ${totalPedido} ${modalPreco.unidade})` : 'marcado como comprado',
      quantidadeAnterior: totalPedido,
      quantidadeNova: comprando,
    })

    if (parcial) {
      // 1. Cria um NOVO item com a parte comprada (status aprovado, aguardando recebimento)
      await supabase.from('compra_itens').insert({
        lista_id: modalPreco.lista_id,
        produto_id: modalPreco.produto_id,
        nome_item: modalPreco.nome_item,
        categoria: modalPreco.categoria,
        quantidade_necessaria: comprando,
        quantidade_estoque: 0,
        quantidade_comprar: comprando,
        unidade: modalPreco.unidade,
        preco_unitario: preco || null,
        total_estimado: total || null,
        status: 'aprovado',
      })
      // 2. Reduz o item original para o saldo restante (continua pendente na lista)
      await supabase
        .from('compra_itens')
        .update({ quantidade_comprar: saldo, quantidade_necessaria: saldo })
        .eq('id', modalPreco.id)
    } else {
      // Compra total: marca o próprio item como aprovado
      await supabase
        .from('compra_itens')
        .update({ status: 'aprovado', preco_unitario: preco || null, total_estimado: total || null })
        .eq('id', modalPreco.id)
    }

    setModalPreco(null)
    setQtdComprando('')
    if (listaSelecionada) carregarItens(listaSelecionada.id)
  }

  async function limparLista(categoria?: string) {
    if (!listaSelecionada) return
    const confirmar = confirm(
      categoria
        ? `Remover todos os itens de ${CATEGORIA_LABELS[categoria]} desta lista?`
        : 'Remover TODOS os itens desta lista?'
    )
    if (!confirmar) return

    let query = supabase.from('compra_itens').delete().eq('lista_id', listaSelecionada.id)
    if (categoria) query = query.eq('categoria', categoria)
    await query
    carregarItens(listaSelecionada.id)
  }

  async function excluirLista() {
    if (!listaSelecionada) return
    if (!confirm(`Excluir a lista "${listaSelecionada.titulo}"?`)) return
    await supabase.from('compra_itens').delete().eq('lista_id', listaSelecionada.id)
    await supabase.from('listas_compra').delete().eq('id', listaSelecionada.id)
    setListaSelecionada(null)
    setItens([])
    carregarListas()
  }

  const itensFiltrados = filtroCategoria === 'todas'
    ? itens
    : itens.filter(i => i.categoria === filtroCategoria)

  const itensPorCategoria = CATEGORIAS.reduce((acc, cat) => {
    acc[cat] = itensFiltrados.filter(i => i.categoria === cat)
    return acc
  }, {} as Record<string, CompraItem[]>)

  const totalEstimado = itens
    .filter(i => i.total_estimado)
    .reduce((s, i) => s + (i.total_estimado || 0), 0)

  const mesesNomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const anosDisponiveis = [hoje.getFullYear() - 1, hoje.getFullYear(), hoje.getFullYear() + 1]

  if (loading) return <div className="p-8 text-gray-500">Carregando...</div>

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Lista de Compras</h1>
        <div className="flex gap-2">
          {!isCozinha && (
            <button
              onClick={abrirHistorico}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium"
            >
              Histórico
            </button>
          )}
          <button
            onClick={abrirModalAvulso}
            className="border border-green-600 text-green-700 px-4 py-2 rounded-lg hover:bg-green-50 font-medium"
          >
            + Item avulso
          </button>
          <button
            onClick={() => setModalAberto(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium"
          >
            + Gerar Lista
          </button>
        </div>
      </div>

      {/* Seletor de listas existentes */}
      {listas.length > 0 && (
        <div className="mb-4 flex gap-2 flex-wrap">
          {listas.map(l => (
            <button
              key={l.id}
              onClick={() => setListaSelecionada(l)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                listaSelecionada?.id === l.id
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
              }`}
            >
              {l.titulo}
            </button>
          ))}
        </div>
      )}

      {/* Lista selecionada */}
      {listaSelecionada && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-gray-600 text-sm">{listaSelecionada.titulo}</span>
              {totalEstimado > 0 && (
                <span className="ml-3 text-green-700 font-semibold">
                  Total estimado: R$ {totalEstimado.toFixed(2)}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <select
                value={filtroCategoria}
                onChange={e => setFiltroCategoria(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value="todas">Todas categorias</option>
                {CATEGORIAS.map(c => (
                  <option key={c} value={c}>{CATEGORIA_LABELS[c]}</option>
                ))}
              </select>
              {!isCozinha && (
                <button
                  onClick={() => limparLista(filtroCategoria !== 'todas' ? filtroCategoria : undefined)}
                  className="text-sm text-red-600 hover:underline px-2"
                >
                  Limpar{filtroCategoria !== 'todas' ? ` ${CATEGORIA_LABELS[filtroCategoria]}` : ' tudo'}
                </button>
              )}
              {!isCozinha && (
                <button
                  onClick={excluirLista}
                  className="text-sm text-red-800 hover:underline px-2"
                >
                  Excluir lista
                </button>
              )}
            </div>
          </div>

          {/* Itens por categoria */}
          {CATEGORIAS.map(cat => {
            const grupo = itensPorCategoria[cat]
            if (!grupo || grupo.length === 0) return null
            return (
              <div key={cat} className="mb-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2 border-b pb-1">
                  {CATEGORIA_LABELS[cat]}
                </h2>
                <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
                  <table className="w-full text-sm" style={{ minWidth: '420px' }}>
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 text-gray-600">Item</th>
                        <th className="text-right px-4 py-2 text-gray-600">Qtde</th>
                        <th className="text-left px-2 py-2 text-gray-600">Un.</th>
                        {!isCozinha && <th className="text-right px-4 py-2 text-gray-600">Preço unit.</th>}
                        {!isCozinha && <th className="text-right px-4 py-2 text-gray-600">Total</th>}
                        <th className="px-4 py-2"></th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.map(item => (
                        <tr
                          key={item.id}
                          className={`border-t ${item.status === 'comprado' ? 'bg-green-50' : ''}`}
                        >
                          <td className={`px-4 py-2 ${item.status === 'comprado' ? 'line-through text-gray-400' : ''}`}>
                            {item.nome_item}
                          </td>
                          <td className="px-2 py-2">
                            {item.status !== 'comprado' ? (
                              <div className="flex items-center gap-1 justify-end">
                                <button
                                  onClick={() => alterarQuantidade(item.id, -0.5)}
                                  className="w-6 h-6 rounded border border-gray-300 bg-white flex items-center justify-center text-gray-600 hover:border-green-500 text-xs"
                                >−</button>
                                <input
                                  type="number"
                                  min={0}
                                  step={0.5}
                                  value={quantidades[item.id] ?? item.quantidade_comprar}
                                  onChange={e => setQuantidades(prev => ({ ...prev, [item.id]: parseFloat(e.target.value) || 0 }))}
                                  className="w-16 text-right border rounded px-1 py-0.5 text-sm font-mono"
                                  style={{ borderColor: (quantidades[item.id] ?? item.quantidade_comprar) !== item.quantidade_comprar ? '#7B9E6B' : '#E5E3DC' }}
                                />
                                <button
                                  onClick={() => alterarQuantidade(item.id, 0.5)}
                                  className="w-6 h-6 rounded border border-gray-300 bg-white flex items-center justify-center text-gray-600 hover:border-green-500 text-xs"
                                >+</button>
                              </div>
                            ) : (
                              <span className="text-right block font-mono text-gray-400">
                                {item.quantidade_comprar % 1 === 0 ? item.quantidade_comprar : item.quantidade_comprar.toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-gray-500">{item.unidade}</td>
                          {!isCozinha && (
                            <td className="px-4 py-2 text-right text-gray-500">
                              {item.preco_unitario ? `R$ ${item.preco_unitario.toFixed(2)}` : '—'}
                            </td>
                          )}
                          {!isCozinha && (
                            <td className="px-4 py-2 text-right text-gray-700">
                              {item.total_estimado ? `R$ ${item.total_estimado.toFixed(2)}` : '—'}
                            </td>
                          )}
                          <td className="px-4 py-2 text-center">
                            {item.status === 'comprado' ? (
                              <span className="text-green-600 text-xs font-medium">✓ Comprado</span>
                            ) : (quantidades[item.id] ?? item.quantidade_comprar) !== item.quantidade_comprar ? (
                              <button
                                onClick={() => salvarQuantidade(item)}
                                disabled={salvandoItem === item.id}
                                className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 mr-1"
                              >
                                {salvandoItem === item.id ? '...' : '✓ Salvar'}
                              </button>
                            ) : (
                              <button
                                onClick={() => marcarComprado(item)}
                                className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                              >
                                Marcar comprado
                              </button>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => excluirItem(item)}
                              disabled={salvandoItem === item.id}
                              title="Remover item da lista"
                              className="text-gray-400 hover:text-red-600 text-lg leading-none"
                            >×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}

          {itensFiltrados.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              Nenhum item nesta lista.
            </div>
          )}
        </>
      )}

      {listas.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-400">
          Nenhuma lista gerada ainda. Clique em "+ Gerar Lista" para começar.
        </div>
      )}

      {/* Modal Gerar Lista */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4 text-gray-800">Gerar Lista de Compras</h2>

            {/* Mês de referência */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Mês de referência</label>
              <div className="flex gap-2">
                <select
                  value={mesRef}
                  onChange={e => setMesRef(parseInt(e.target.value))}
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  {mesesNomes.map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>
                <select
                  value={anoRef}
                  onChange={e => setAnoRef(parseInt(e.target.value))}
                  className="border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  {anosDisponiveis.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Semanas do cardápio */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Semanas do cardápio</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    onClick={() => toggleSemana(s)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      semanasSelecionadas.includes(s)
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
                    }`}
                  >
                    Sem {s}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {semanasSelecionadas.length === 0
                  ? 'Selecione ao menos uma semana'
                  : `${semanasSelecionadas.length} semana(s) selecionada(s) — dias reais do mês serão calculados automaticamente`}
              </p>
            </div>

            {/* Categorias */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Categorias</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIAS.map(c => (
                  <button
                    key={c}
                    onClick={() => toggleCategoria(c)}
                    className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      categoriasSelecionadas.includes(c)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {CATEGORIA_LABELS[c]}
                  </button>
                ))}
              </div>
            </div>

            {/* Descontar estoque */}
            <div className="mb-6 flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <input
                type="checkbox"
                id="descontarEstoque"
                checked={descontarEstoque}
                onChange={e => setDescontarEstoque(e.target.checked)}
                className="w-4 h-4 accent-amber-600"
              />
              <label htmlFor="descontarEstoque" className="text-sm text-amber-800 cursor-pointer">
                Descontar estoque atual
                <span className="block text-xs text-amber-600 font-normal">
                  Se desmarcado, compra 100% do cardápio (mais seguro se o estoque não está atualizado)
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setModalAberto(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={gerarLista}
                disabled={gerandoLista}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {gerandoLista ? 'Gerando...' : 'Gerar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Preço */}
      {modalPreco && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-1 text-gray-800">Registrar Compra</h2>
            <p className="text-gray-600 text-sm mb-4">
              {modalPreco.nome_item} — pedido: {modalPreco.quantidade_comprar} {modalPreco.unidade}
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantidade comprando agora ({modalPreco.unidade})
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max={modalPreco.quantidade_comprar}
              value={qtdComprando}
              onChange={e => setQtdComprando(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 mb-1 text-sm"
              autoFocus
            />
            {(() => {
              const comprando = parseFloat(qtdComprando.replace(',', '.')) || 0
              const saldo = Math.round((modalPreco.quantidade_comprar - comprando) * 100) / 100
              if (comprando > 0 && saldo > 0) {
                return <p className="text-xs text-amber-600 mb-3">Compra parcial: {saldo} {modalPreco.unidade} continuarão na lista para comprar depois.</p>
              }
              return <div className="mb-3" />
            })()}

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preço unitário (R$) <span className="text-gray-400 font-normal">— opcional</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={precoInput}
              onChange={e => setPrecoInput(e.target.value)}
              placeholder="0,00"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4 text-sm"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setModalPreco(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarCompra}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Histórico de Alterações (só admin) */}
      {modalHistorico && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Histórico de Alterações</h2>
              <button
                onClick={() => setModalHistorico(false)}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none"
              >×</button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Registro de todas as alterações feitas nas listas de compras (últimas 200).
            </p>
            <div className="overflow-y-auto flex-1">
              {carregandoLogs ? (
                <div className="text-center py-12 text-gray-400">Carregando histórico...</div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12 text-gray-400">Nenhuma alteração registrada ainda.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-600">Data/Hora</th>
                      <th className="text-left px-3 py-2 text-gray-600">Item</th>
                      <th className="text-left px-3 py-2 text-gray-600">Ação</th>
                      <th className="text-right px-3 py-2 text-gray-600">De</th>
                      <th className="text-right px-3 py-2 text-gray-600">Para</th>
                      <th className="text-left px-3 py-2 text-gray-600">Por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id} className="border-t">
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-3 py-2 font-medium">{log.nome_item}</td>
                        <td className="px-3 py-2">
                          <span className={
                            log.acao.includes('removido') || log.acao.includes('excluído')
                              ? 'text-red-600' : log.acao.includes('comprado')
                              ? 'text-green-600' : 'text-amber-600'
                          }>{log.acao}</span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-gray-500">
                          {log.quantidade_anterior != null ? `${log.quantidade_anterior} ${log.unidade || ''}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-gray-700">
                          {log.quantidade_nova != null ? `${log.quantidade_nova} ${log.unidade || ''}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{log.usuario_email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Item Avulso */}
      {modalAvulso && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-1 text-gray-800">Adicionar Item Avulso</h2>
            <p className="text-gray-500 text-sm mb-4">
              Para itens que não estão no cardápio (ex: detergente, sal, azeite).
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
            <input
              type="text"
              list="produtos-cadastrados"
              value={avulso.nome}
              onChange={e => selecionarProdutoAvulso(e.target.value)}
              placeholder="Digite ou escolha um item já cadastrado"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-1 text-sm"
              autoFocus
            />
            <datalist id="produtos-cadastrados">
              {produtosCadastrados.map(p => (
                <option key={p.id} value={p.nome} />
              ))}
            </datalist>
            <p className="text-xs text-gray-400 mb-3">
              Se já existir, escolha da lista (preenche unidade e categoria). Senão, digite um novo.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={avulso.quantidade}
                  onChange={e => setAvulso(a => ({ ...a, quantidade: e.target.value }))}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                <select
                  value={avulso.unidade}
                  onChange={e => setAvulso(a => ({ ...a, unidade: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option>kg</option><option>g</option><option>L</option><option>ml</option>
                  <option>un</option><option>cx</option><option>pct</option><option>maço</option>
                </select>
              </div>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select
              value={avulso.categoria}
              onChange={e => setAvulso(a => ({ ...a, categoria: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 mb-5 text-sm"
            >
              {CATEGORIAS.map(c => (
                <option key={c} value={c}>{CATEGORIA_LABELS[c]}</option>
              ))}
            </select>

            <div className="flex gap-3">
              <button
                onClick={() => setModalAvulso(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={salvarItemAvulso}
                disabled={salvandoAvulso}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {salvandoAvulso ? 'Adicionando...' : 'Adicionar à lista'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
