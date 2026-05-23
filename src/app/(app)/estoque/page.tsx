'use client'

import { useEffect, useState, useMemo } from 'react'
import { Plus, Minus, Package, Search, AlertTriangle } from 'lucide-react'
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

  async function carregar() {
    const supabase = getSupabase()
    const { data } = await supabase.from('produtos').select('*').eq('ativo', true).order('nome')
    const prods = data ?? []
    setProdutos(prods)
    // Inicializa quantidades com os valores atuais
    const qtds: Record<string, number> = {}
    prods.forEach((p: Produto) => { qtds[p.id] = p.quantidade_atual })
    setQuantidades(qtds)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

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
