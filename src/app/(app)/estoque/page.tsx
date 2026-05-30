'use client'

import { useEffect, useState, useMemo } from 'react'
import { Plus, Minus, Package, Search, AlertTriangle, Truck } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { Modal, Badge, MetricCard } from '@/components/ui'
import toast from 'react-hot-toast'
import type { Produto, CategoriaAlimento } from '@/types'

const CATEGORIAS_ESTOQUE: { value: CategoriaAlimento; label: string }[] = [
  { value: 'hortifruti', label: 'Hortifruti' },
  { value: 'carnes', label: 'Carnes' },
  { value: 'secos', label: 'Secos' },
  { value: 'laticinios', label: 'Laticínios' },
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'outros', label: 'Outros' },
]

interface ProdutoForm {
  nome: string
  categoria: CategoriaAlimento
  unidade: string
  quantidade_atual: number
  estoque_minimo: number
  preco_medio: number
  observacoes: string
}

const FORM_INICIAL: ProdutoForm = {
  nome: '',
  categoria: 'secos',
  unidade: 'kg',
  quantidade_atual: 0,
  estoque_minimo: 0,
  preco_medio: 0,
  observacoes: '',
}

interface ItemRecebimento {
  id: string
  lista_id: string
  lista_titulo: string
  nome_item: string
  produto_id: string | null
  quantidade_comprar: number
  unidade: string
  // Estado de edição do recebimento
  recebido: number
  motivo: string
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export default function EstoquePage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [quantidades, setQuantidades] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [catFiltro, setCatFiltro] = useState<string>('todas')
  const [modalNovo, setModalNovo] = useState(false)
  const [form, setForm] = useState<ProdutoForm>(FORM_INICIAL)
  const [salvando, setSalvando] = useState<string | null>(null)
  const [salvandoNovo, setSalvandoNovo] = useState(false)

  // Recebimentos pendentes
  const [recebimentos, setRecebimentos] = useState<ItemRecebimento[]>([])
  const [confirmandoReceb, setConfirmandoReceb] = useState<string | null>(null)
  const [emailUsuario, setEmailUsuario] = useState<string>('')

  useEffect(() => {
    getSupabase().auth.getUser().then(({ data }) => setEmailUsuario(data.user?.email ?? ''))
  }, [])

  async function carregar() {
    const supabase = getSupabase()
    const { data } = await supabase.from('produtos').select('*').eq('ativo', true).order('nome')
    const prods = data ?? []
    setProdutos(prods)
    const qtds: Record<string, number> = {}
    prods.forEach((p: Produto) => { qtds[p.id] = p.quantidade_atual })
    setQuantidades(qtds)
    setLoading(false)
  }

  async function carregarRecebimentos() {
    const supabase = getSupabase()
    // Itens comprados (status 'aprovado') aguardando recebimento
    const { data } = await supabase
      .from('compra_itens')
      .select('*, listas_compra(titulo)')
      .eq('status', 'aprovado')
      .order('nome_item')
    const itens: ItemRecebimento[] = (data ?? []).map((i: any) => ({
      id: i.id,
      lista_id: i.lista_id,
      lista_titulo: i.listas_compra?.titulo ?? '',
      nome_item: i.nome_item,
      produto_id: i.produto_id,
      quantidade_comprar: i.quantidade_comprar,
      unidade: i.unidade,
      recebido: i.quantidade_comprar, // default: recebeu o que pediu
      motivo: '',
    }))
    setRecebimentos(itens)
  }

  useEffect(() => {
    carregar()
    carregarRecebimentos()
  }, [])

  const filtrados = useMemo(() => {
    return produtos.filter((p) => {
      const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase())
      const matchCat = catFiltro === 'todas' || p.categoria === catFiltro
      return matchBusca && matchCat
    })
  }, [produtos, busca, catFiltro])

  const stats = useMemo(() => ({
    total: produtos.length,
    baixo: produtos.filter((p) => p.quantidade_atual < p.estoque_minimo).length,
  }), [produtos])

  function alterarQuantidade(id: string, delta: number, unidade: string) {
    setQuantidades(prev => {
      const atual = prev[id] ?? 0
      const passo = unidade === 'kg' || unidade === 'L' ? 0.5 : 1
      const nova = Math.max(0, atual + delta * passo)
      return { ...prev, [id]: nova }
    })
  }

  async function salvarQuantidade(produto: Produto) {
    const novaQtd = quantidades[produto.id] ?? produto.quantidade_atual
    if (novaQtd === produto.quantidade_atual) return
    setSalvando(produto.id)
    const supabase = getSupabase()

    await supabase.from('produtos').update({ quantidade_atual: novaQtd }).eq('id', produto.id)
    await supabase.from('movimentacoes_estoque').insert({
      produto_id: produto.id,
      tipo: novaQtd > produto.quantidade_atual ? 'entrada' : 'ajuste',
      quantidade: Math.abs(novaQtd - produto.quantidade_atual),
      quantidade_anterior: produto.quantidade_atual,
      quantidade_posterior: novaQtd,
      motivo: 'Ajuste manual no estoque',
    })

    toast.success(`${produto.nome} atualizado!`)
    setSalvando(null)
    carregar()
  }

  // Atualiza campo editável de um recebimento
  function updateRecebimento(id: string, campo: 'recebido' | 'motivo', valor: number | string) {
    setRecebimentos(prev => prev.map(r => r.id === id ? { ...r, [campo]: valor } : r))
  }

  async function confirmarRecebimento(item: ItemRecebimento) {
    const divergencia = item.recebido !== item.quantidade_comprar

    if (divergencia && !item.motivo.trim()) {
      toast.error('Informe o motivo da divergência')
      return
    }
    if (item.recebido < 0) {
      toast.error('Quantidade inválida')
      return
    }

    setConfirmandoReceb(item.id)
    const supabase = getSupabase()

    // 1. Localiza o produto no estoque (por id ou por nome)
    let produtoId = item.produto_id
    let prod: { quantidade_atual: number; unidade: string } | null = null

    if (produtoId) {
      const { data } = await supabase.from('produtos').select('quantidade_atual, unidade').eq('id', produtoId).single()
      prod = data
    } else {
      const { data: prods } = await supabase.from('produtos').select('id, nome, quantidade_atual, unidade')
      const encontrado = (prods || []).find((p: any) => norm(p.nome) === norm(item.nome_item))
      if (encontrado) {
        produtoId = encontrado.id
        prod = { quantidade_atual: encontrado.quantidade_atual, unidade: encontrado.unidade }
      }
    }

    // 2. Dá entrada no estoque (se achou o produto) com a quantidade RECEBIDA
    if (produtoId && prod) {
      let qtdEntrada = item.recebido
      if (item.unidade === 'g' && prod.unidade === 'kg') qtdEntrada /= 1000
      if (item.unidade === 'kg' && prod.unidade === 'g') qtdEntrada *= 1000
      if (item.unidade === 'ml' && prod.unidade === 'L') qtdEntrada /= 1000
      if (item.unidade === 'L' && prod.unidade === 'ml') qtdEntrada *= 1000

      const nova = (prod.quantidade_atual || 0) + qtdEntrada
      await supabase.from('produtos').update({ quantidade_atual: nova }).eq('id', produtoId)
      await supabase.from('movimentacoes_estoque').insert({
        produto_id: produtoId,
        tipo: 'entrada',
        quantidade: qtdEntrada,
        quantidade_anterior: prod.quantidade_atual,
        quantidade_posterior: nova,
        motivo: `Recebimento — ${item.lista_titulo}`,
      })
    }

    // 3. Registra o recebimento (com divergência se houver)
    await supabase.from('recebimentos').insert({
      compra_item_id: item.id,
      lista_id: item.lista_id,
      lista_titulo: item.lista_titulo,
      nome_item: item.nome_item,
      quantidade_pedida: item.quantidade_comprar,
      quantidade_recebida: item.recebido,
      unidade: item.unidade,
      divergencia,
      motivo_divergencia: divergencia ? item.motivo : null,
      produto_id: produtoId,
      usuario_email: emailUsuario || 'desconhecido',
    })

    // 4. Marca o item da compra como recebido
    await supabase.from('compra_itens').update({ status: 'recebido' }).eq('id', item.id)

    toast.success(
      divergencia
        ? `${item.nome_item} recebido com divergência registrada`
        : `${item.nome_item} recebido e adicionado ao estoque`
    )

    setConfirmandoReceb(null)
    setRecebimentos(prev => prev.filter(r => r.id !== item.id))
    carregar()

    if (!produtoId) {
      toast(`"${item.nome_item}" não está vinculado a um produto do estoque — o recebimento foi registrado, mas não somou ao estoque.`, { icon: '⚠️', duration: 6000 })
    }
  }

  async function salvarProduto() {
    if (!form.nome.trim()) return toast.error('Informe o nome do produto')
    setSalvandoNovo(true)
    const supabase = getSupabase()
    const { error } = await supabase.from('produtos').insert({
      ...form,
      preco_medio: form.preco_medio || null,
    })
    if (error) {
      toast.error('Erro ao salvar produto')
    } else {
      toast.success('Produto cadastrado!')
      setModalNovo(false)
      setForm(FORM_INICIAL)
      carregar()
    }
    setSalvandoNovo(false)
  }

  return (
    <div>
      {/* Recebimentos pendentes */}
      {recebimentos.length > 0 && (
        <div className="card" style={{ marginBottom: '20px', border: '1px solid #BA7517', background: '#FDF6EC' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Truck size={18} style={{ color: '#BA7517' }} />
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#7A4D0E' }}>
              Recebimentos pendentes ({recebimentos.length})
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#9A6518', marginBottom: '14px' }}>
            Confira a quantidade recebida. Se for diferente da pedida, informe o motivo para registro.
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '600px' }}>
              <thead>
                <tr style={{ background: '#F6EAD7' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#7A4D0E', textTransform: 'uppercase' }}>Item</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: '#7A4D0E', textTransform: 'uppercase' }}>Pedido</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: '#7A4D0E', textTransform: 'uppercase' }}>Recebido</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#7A4D0E', textTransform: 'uppercase' }}>Motivo (se divergente)</th>
                  <th style={{ padding: '8px 10px' }}></th>
                </tr>
              </thead>
              <tbody>
                {recebimentos.map((item) => {
                  const divergente = item.recebido !== item.quantidade_comprar
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #EADBC2' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 500 }}>
                        {item.nome_item}
                        <div style={{ fontSize: '10px', color: '#9A6518' }}>{item.lista_titulo}</div>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#5F5E5A' }}>
                        {item.quantidade_comprar} {item.unidade}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                          <input
                            type="number"
                            min={0}
                            step={item.unidade === 'kg' || item.unidade === 'L' ? 0.5 : 1}
                            value={item.recebido}
                            onChange={(e) => updateRecebimento(item.id, 'recebido', parseFloat(e.target.value) || 0)}
                            style={{
                              width: '70px', padding: '4px 6px', textAlign: 'right', borderRadius: '6px',
                              border: `1px solid ${divergente ? '#BA7517' : '#E5E3DC'}`,
                              background: divergente ? '#FBEFD9' : '#fff',
                              fontWeight: divergente ? 600 : 400, fontSize: '13px',
                            }}
                          />
                          <span style={{ fontSize: '12px', color: '#888780' }}>{item.unidade}</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {divergente ? (
                          <input
                            type="text"
                            value={item.motivo}
                            onChange={(e) => updateRecebimento(item.id, 'motivo', e.target.value)}
                            placeholder="Ex: fornecedor enviou a menos"
                            style={{ width: '100%', minWidth: '180px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #BA7517', fontSize: '12px' }}
                          />
                        ) : (
                          <span style={{ fontSize: '12px', color: '#1D9E75' }}>✓ Conforme pedido</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => confirmarRecebimento(item)}
                          disabled={confirmandoReceb === item.id}
                        >
                          {confirmandoReceb === item.id ? '...' : '✓ Confirmar'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
        <MetricCard label="Total de produtos" value={stats.total} icon={<Package size={13} />} />
        <MetricCard label="Estoque baixo" value={stats.baixo} icon={<AlertTriangle size={13} />} color={stats.baixo > 0 ? '#BA7517' : undefined} />
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888780' }} />
          <input className="input" style={{ paddingLeft: '32px' }} placeholder="Buscar produto..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <select className="input" style={{ width: 'auto' }} value={catFiltro} onChange={(e) => setCatFiltro(e.target.value)}>
          <option value="todas">Todas as categorias</option>
          {CATEGORIAS_ESTOQUE.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <button className="btn btn-primary" onClick={() => setModalNovo(true)}>
          <Plus size={14} /> Novo produto
        </button>
      </div>

      {/* Tabela */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Quantidade</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#888780' }}>Carregando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#888780' }}>Nenhum produto encontrado</td></tr>
              ) : (
                filtrados.map((p) => {
                  const qtdAtual = quantidades[p.id] ?? p.quantidade_atual
                  const alterado = qtdAtual !== p.quantidade_atual
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{p.nome}</div>
                        {p.observacoes && <div style={{ fontSize: '11px', color: '#888780' }}>{p.observacoes}</div>}
                      </td>
                      <td>
                        <Badge variant="gray">{CATEGORIAS_ESTOQUE.find(c => c.value === p.categoria)?.label ?? p.categoria}</Badge>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => alterarQuantidade(p.id, -1, p.unidade)}
                            style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #E5E3DC', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Minus size={13} />
                          </button>
                          <input
                            type="number"
                            min={0}
                            step={p.unidade === 'kg' || p.unidade === 'L' ? 0.5 : 1}
                            value={qtdAtual}
                            onChange={(e) => setQuantidades(prev => ({ ...prev, [p.id]: parseFloat(e.target.value) || 0 }))}
                            style={{
                              width: '70px',
                              padding: '4px 6px',
                              border: `1px solid ${alterado ? '#7B9E6B' : '#E5E3DC'}`,
                              borderRadius: '6px',
                              fontSize: '13px',
                              textAlign: 'center',
                              fontWeight: alterado ? 600 : 400,
                              color: alterado ? '#3D4F38' : '#2C2C2A',
                              background: alterado ? '#EDF3EA' : '#fff',
                            }}
                          />
                          <span style={{ fontSize: '12px', color: '#888780', minWidth: '24px' }}>{p.unidade}</span>
                          <button
                            onClick={() => alterarQuantidade(p.id, 1, p.unidade)}
                            style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #E5E3DC', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </td>
                      <td>
                        {alterado && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => salvarQuantidade(p)}
                            disabled={salvando === p.id}
                          >
                            {salvando === p.id ? 'Salvando...' : '✓ Salvar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Produto */}
      <Modal open={modalNovo} onClose={() => { setModalNovo(false); setForm(FORM_INICIAL) }} title="Novo produto"
        footer={<><button className="btn btn-sm" onClick={() => { setModalNovo(false); setForm(FORM_INICIAL) }}>Cancelar</button><button className="btn btn-sm btn-primary" onClick={salvarProduto} disabled={salvandoNovo}>{salvandoNovo ? 'Salvando...' : '✓ Cadastrar'}</button></>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="input-group" style={{ gridColumn: '1 / -1' }}>
            <label className="input-label">Nome do produto *</label>
            <input className="input" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: Arroz branco parboilizado" />
          </div>
          <div className="input-group">
            <label className="input-label">Categoria</label>
            <select className="input" value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value as CategoriaAlimento }))}>
              {CATEGORIAS_ESTOQUE.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Unidade</label>
            <select className="input" value={form.unidade} onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))}>
              <option>kg</option><option>g</option><option>L</option><option>ml</option><option>un</option><option>cx</option><option>pct</option><option>maço</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Quantidade inicial</label>
            <input className="input" type="number" min={0} value={form.quantidade_atual} onChange={(e) => setForm((f) => ({ ...f, quantidade_atual: Number(e.target.value) }))} />
          </div>
          <div className="input-group">
            <label className="input-label">Preço médio (R$)</label>
            <input className="input" type="number" min={0} step={0.01} value={form.preco_medio} onChange={(e) => setForm((f) => ({ ...f, preco_medio: Number(e.target.value) }))} />
          </div>
          <div className="input-group" style={{ gridColumn: '1 / -1' }}>
            <label className="input-label">Observações</label>
            <input className="input" value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} placeholder="Marca, variação, observação..." />
          </div>
        </div>
      </Modal>
    </div>
  )
}
