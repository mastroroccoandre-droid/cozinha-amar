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
  return Math.min(5, Math.ceil((data.getDate() + diaDaSemana) / 7))
}

// Mapeia todos os dias de um mês para { semana, dia_semana }
function mapearDiasDoMes(ano: number, mes: number): { semana: number; dia_semana: number }[] {
  const dias: { semana: number; dia_semana: number }[] = []
  const totalDias = new Date(ano, mes + 1, 0).getDate()
  for (let d = 1; d <= totalDias; d++) {
    const data = new Date(ano, mes, d)
    const semana = getSemanaDoMes(data)
    const dia_semana = data.getDay() === 0 ? 0 : data.getDay() // 0=Dom...6=Sáb (getDay já é 0=Dom)
    // No sistema: 0=Segunda, 1=Terça, 2=Quarta, 3=Quinta, 4=Sexta, 5=Sábado, 6=Domingo
    // getDay(): 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
    const diaSistema = data.getDay() === 0 ? 6 : data.getDay() - 1
    dias.push({ semana, dia_semana: diaSistema })
  }
  return dias
}

export default function ComprasPage() {
  const [listas, setListas] = useState<Lista[]>([])
  const [listaSelecionada, setListaSelecionada] = useState<Lista | null>(null)
  const [itens, setItens] = useState<CompraItem[]>([])
  const [loading, setLoading] = useState(true)
  const [gerandoLista, setGerandoLista] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [modalPreco, setModalPreco] = useState<CompraItem | null>(null)
  const [precoInput, setPrecoInput] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas')

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
      .order('categoria')
      .order('nome_item')
    setItens(data || [])
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
        const qtdTotal = ing.quantidade_por_idoso * vezes

        // Normaliza nome para evitar duplicatas por acento (ex: "Moída" vs "Moida")
        const chaveIng = ing.nome_ingrediente.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        if (!totais[chaveIng]) {
          totais[chaveIng] = {
            nome: ing.nome_ingrediente,
            categoria: ing.categoria,
            unidade: ing.unidade,
            produto_id: ing.produto_id || null,
            quantidadeNecessaria: 0,
            quantidadeEstoque: 0,
            quantidade: 0,
          }
        }
        totais[chaveIng].quantidadeNecessaria += qtdTotal
        totais[chaveIng].quantidade += qtdTotal
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
    if (item.status === 'comprado') return
    setModalPreco(item)
    setPrecoInput('')
  }

  async function confirmarCompra() {
    if (!modalPreco) return
    const preco = parseFloat(precoInput.replace(',', '.')) || 0
    const total = preco * modalPreco.quantidade_comprar

    await supabase
      .from('compra_itens')
      .update({ status: 'comprado', preco_unitario: preco || null, total_estimado: total || null })
      .eq('id', modalPreco.id)

    // Registrar entrada no estoque se tiver produto vinculado
    if (modalPreco.produto_id) {
      const { data: prod } = await supabase
        .from('produtos')
        .select('quantidade_atual, unidade')
        .eq('id', modalPreco.produto_id)
        .single()

      if (prod) {
        let qtdEntrada = modalPreco.quantidade_comprar
        // Converter se necessário (item em g, produto em kg)
        if (modalPreco.unidade === 'g' && prod.unidade === 'kg') qtdEntrada /= 1000
        if (modalPreco.unidade === 'kg' && prod.unidade === 'g') qtdEntrada *= 1000
        if (modalPreco.unidade === 'ml' && prod.unidade === 'L') qtdEntrada /= 1000
        if (modalPreco.unidade === 'L' && prod.unidade === 'ml') qtdEntrada *= 1000

        const nova = (prod.quantidade_atual || 0) + qtdEntrada

        await supabase
          .from('produtos')
          .update({ quantidade_atual: nova })
          .eq('id', modalPreco.produto_id)

        await supabase.from('movimentacoes_estoque').insert({
          produto_id: modalPreco.produto_id,
          tipo: 'entrada',
          quantidade: qtdEntrada,
          quantidade_anterior: prod.quantidade_atual,
          quantidade_posterior: nova,
          motivo: `Compra — ${listaSelecionada?.titulo || ''}`,
        })
      }
    }

    setModalPreco(null)
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
        <button
          onClick={() => setModalAberto(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium"
        >
          + Gerar Lista
        </button>
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
              <button
                onClick={() => limparLista(filtroCategoria !== 'todas' ? filtroCategoria : undefined)}
                className="text-sm text-red-600 hover:underline px-2"
              >
                Limpar{filtroCategoria !== 'todas' ? ` ${CATEGORIA_LABELS[filtroCategoria]}` : ' tudo'}
              </button>
              <button
                onClick={excluirLista}
                className="text-sm text-red-800 hover:underline px-2"
              >
                Excluir lista
              </button>
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
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 text-gray-600">Item</th>
                        <th className="text-right px-4 py-2 text-gray-600">Qtde</th>
                        <th className="text-left px-2 py-2 text-gray-600">Un.</th>
                        <th className="text-right px-4 py-2 text-gray-600">Preço unit.</th>
                        <th className="text-right px-4 py-2 text-gray-600">Total</th>
                        <th className="px-4 py-2"></th>
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
                          <td className="px-4 py-2 text-right font-mono">
                            {item.quantidade_comprar % 1 === 0
                              ? item.quantidade_comprar
                              : item.quantidade_comprar.toFixed(2)}
                          </td>
                          <td className="px-2 py-2 text-gray-500">{item.unidade}</td>
                          <td className="px-4 py-2 text-right text-gray-500">
                            {item.preco_unitario ? `R$ ${item.preco_unitario.toFixed(2)}` : '—'}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-700">
                            {item.total_estimado ? `R$ ${item.total_estimado.toFixed(2)}` : '—'}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {item.status === 'comprado' ? (
                              <span className="text-green-600 text-xs font-medium">✓ Comprado</span>
                            ) : (
                              <button
                                onClick={() => marcarComprado(item)}
                                className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                              >
                                Marcar comprado
                              </button>
                            )}
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
              {modalPreco.nome_item} — {modalPreco.quantidade_comprar} {modalPreco.unidade}
            </p>
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
              autoFocus
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
    </div>
  )
}
