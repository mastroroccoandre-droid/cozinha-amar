'use client'

import { useEffect, useState } from 'react'
import { Plus, Check, RefreshCw, Trash2, X } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { Modal, SectionHeader, Badge, Alert, MetricCard } from '@/components/ui'
import { formatBRL, CATEGORIA_LABELS } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
import type { ListaCompra, CompraItem, CategoriaAlimento } from '@/types'

const EMAILS_ADMIN = ['admin@residencialamar.com.br', 'mxmastrorocco@gmail.com']

const CATEGORIAS = [
  { value: 'hortifruti', label: 'Hortifruti' },
  { value: 'carnes', label: 'Carnes' },
  { value: 'secos', label: 'Secos' },
  { value: 'laticinios', label: 'Laticínios' },
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'outros', label: 'Outros' },
]

export default function ComprasPage() {
  const { config } = useAppStore()
  const [lista, setLista] = useState<(ListaCompra & { itens: CompraItem[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [aprovando, setAprovando] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [modalItem, setModalItem] = useState(false)
  const [modalGerar, setModalGerar] = useState(false)
  const [modalLimpar, setModalLimpar] = useState(false)
  const [modalPreco, setModalPreco] = useState<{ open: boolean; item?: CompraItem }>({ open: false })
  const [novoItem, setNovoItem] = useState({ nome: '', quantidade: '', unidade: 'kg', categoria: 'secos' as CategoriaAlimento })
  const [precoItem, setPrecoItem] = useState({ preco: '', fornecedor: '' })
  const [salvando, setSalvando] = useState(false)
  const [ingredientes, setIngredientes] = useState<{nome: string, unidade: string, categoria: string}[]>([])
  const [filtroCategoria, setFiltroCategoria] = useState('')
  // Gerar
  const [semanasPeriodo, setSemanasPeriodo] = useState(4)
  const [categoriasFiltro, setCategoriasFiltro] = useState<string[]>([]) // vazio = todas
  // Limpar
  const [limparCategoria, setLimparCategoria] = useState('todas')

  async function carregarIngredientes() {
    const supabase = getSupabase()
    const { data } = await supabase.from('preparacao_ingredientes').select('nome_ingrediente, unidade, categoria').order('nome_ingrediente')
    const mapa = new Map<string, {unidade: string, categoria: string}>()
    ;(data ?? []).forEach((i: any) => {
      if (!mapa.has(i.nome_ingrediente)) {
        let u = i.unidade
        if (u === 'g') u = 'kg'
        if (u === 'ml') u = 'L'
        mapa.set(i.nome_ingrediente, { unidade: u, categoria: i.categoria ?? 'outros' })
      }
    })
    setIngredientes(Array.from(mapa.entries()).map(([nome, v]) => ({ nome, ...v })).sort((a, b) => a.nome.localeCompare(b.nome)))
  }

  async function carregar() {
    const supabase = getSupabase()
    const [{ data }, { data: authData }] = await Promise.all([
      supabase.from('listas_compra').select('*, itens:compra_itens(*)').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.auth.getUser(),
    ])
    setIsAdmin(EMAILS_ADMIN.includes(authData.user?.email ?? ''))
    if (!data) {
      const { data: novaLista } = await supabase.from('listas_compra').insert({
        titulo: 'Lista de compras — ' + new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
        tipo: 'mensal', semana_referencia: 1, total_estimado: 0,
      }).select('*, itens:compra_itens(*)').single()
      setLista(novaLista)
    } else {
      setLista(data)
    }
    setLoading(false)
  }

  useEffect(() => { carregar(); carregarIngredientes() }, [])

  function toggleCategoria(cat: string) {
    setCategoriasFiltro(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  }

  async function gerarListaCardapio() {
    setGerando(true)
    setModalGerar(false)
    const supabase = getSupabase()

    const { data: ings } = await supabase
      .from('preparacao_ingredientes')
      .select('nome_ingrediente, quantidade_por_idoso, unidade, categoria, produto_id')

    const { data: produtos } = await supabase.from('produtos').select('*').eq('ativo', true)

    const mapaIngredientes = new Map<string, { quantidade: number; unidade: string; categoria: string; produto_id: string | null }>()

    ;(ings ?? []).forEach((ing: any) => {
      // Filtra categorias se selecionadas
      if (categoriasFiltro.length > 0 && !categoriasFiltro.includes(ing.categoria ?? 'outros')) return

      const qtdPorSemana = ing.quantidade_por_idoso / 5
      const qtdPeriodo = qtdPorSemana * semanasPeriodo
      let qtd = qtdPeriodo
      let unidade = ing.unidade
      if (unidade === 'g') { qtd = qtd / 1000; unidade = 'kg' }
      if (unidade === 'ml') { qtd = qtd / 1000; unidade = 'L' }

      const atual = mapaIngredientes.get(ing.nome_ingrediente)
      if (atual) {
        mapaIngredientes.set(ing.nome_ingrediente, { ...atual, quantidade: atual.quantidade + qtd })
      } else {
        mapaIngredientes.set(ing.nome_ingrediente, { quantidade: qtd, unidade, categoria: ing.categoria ?? 'outros', produto_id: ing.produto_id })
      }
    })

    const estoqueMap = new Map<string, number>()
    ;(produtos ?? []).forEach((p: any) => { estoqueMap.set(p.nome, p.quantidade_atual) })

    const itensComprar = Array.from(mapaIngredientes.entries())
      .map(([nome, v]) => {
        const emEstoque = estoqueMap.get(nome) ?? 0
        const comprar = Math.max(0, v.quantidade - emEstoque)
        return { nome, ...v, emEstoque, comprar }
      })
      .filter(i => i.comprar > 0)
      .sort((a, b) => a.nome.localeCompare(b.nome))

    if (itensComprar.length === 0) {
      toast.success('Estoque suficiente para o período e categorias selecionadas!')
      setGerando(false)
      return
    }

    const catLabel = categoriasFiltro.length > 0
      ? categoriasFiltro.map(c => CATEGORIAS.find(x => x.value === c)?.label).join(', ')
      : 'todos os itens'

    const titulo = `Lista — ${semanasPeriodo} sem. — ${catLabel} — ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`

    const { data: novaLista, error } = await supabase.from('listas_compra').insert({
      titulo, tipo: 'mensal', semana_referencia: 1, total_estimado: 0,
    }).select().single()

    if (error || !novaLista) { toast.error('Erro ao gerar lista'); setGerando(false); return }

    await supabase.from('compra_itens').insert(
      itensComprar.map(i => ({
        lista_id: novaLista.id,
        produto_id: i.produto_id,
        nome_item: i.nome,
        categoria: i.categoria,
        quantidade_necessaria: parseFloat(i.quantidade.toFixed(2)),
        quantidade_estoque: parseFloat(i.emEstoque.toFixed(2)),
        quantidade_comprar: parseFloat(i.comprar.toFixed(2)),
        unidade: i.unidade,
        status: 'pendente',
      }))
    )

    toast.success(`Lista gerada com ${itensComprar.length} itens!`)
    setGerando(false)
    carregar()
  }

  async function limparLista() {
    if (!lista) return
    const supabase = getSupabase()
    if (limparCategoria === 'todas') {
      await supabase.from('compra_itens').delete().eq('lista_id', lista.id)
      toast.success('Lista apagada!')
    } else {
      await supabase.from('compra_itens').delete().eq('lista_id', lista.id).eq('categoria', limparCategoria)
      const label = CATEGORIAS.find(c => c.value === limparCategoria)?.label
      toast.success(`${label} removido da lista!`)
    }
    setModalLimpar(false)
    carregar()
  }

  async function adicionarItem() {
    if (!novoItem.nome.trim() || !lista) return
    setSalvando(true)
    const supabase = getSupabase()
    await supabase.from('compra_itens').insert({
      lista_id: lista.id,
      nome_item: novoItem.nome,
      categoria: novoItem.categoria,
      quantidade_comprar: parseFloat(novoItem.quantidade) || 0,
      quantidade_necessaria: parseFloat(novoItem.quantidade) || 0,
      quantidade_estoque: 0,
      unidade: novoItem.unidade,
      status: 'pendente',
    })
    toast.success('Item adicionado!')
    setModalItem(false)
    setNovoItem({ nome: '', quantidade: '', unidade: 'kg', categoria: 'secos' })
    setSalvando(false)
    carregar()
  }

  async function excluirItem(itemId: string) {
    const supabase = getSupabase()
    await supabase.from('compra_itens').delete().eq('id', itemId)
    toast.success('Item removido')
    carregar()
  }

  async function marcarComprado(item: CompraItem) {
    if (isAdmin) {
      setModalPreco({ open: true, item })
      setPrecoItem({ preco: item.preco_unitario?.toString() ?? '', fornecedor: '' })
    } else {
      const supabase = getSupabase()
      await supabase.from('compra_itens').update({ status: 'recebido' }).eq('id', item.id)
      toast.success('Item marcado como recebido')
      carregar()
    }
  }

  async function salvarPrecoECompra() {
    if (!modalPreco.item) return
    setSalvando(true)
    const supabase = getSupabase()
    const preco = parseFloat(precoItem.preco) || 0
    const total = preco * (modalPreco.item.quantidade_comprar ?? 0)
    await supabase.from('compra_itens').update({ status: 'recebido', preco_unitario: preco, total_estimado: total }).eq('id', modalPreco.item.id)
    if (modalPreco.item.produto_id) {
      await supabase.from('movimentacoes_estoque').insert({
        produto_id: modalPreco.item.produto_id, tipo: 'entrada',
        quantidade: modalPreco.item.quantidade_comprar,
        quantidade_anterior: 0, quantidade_posterior: modalPreco.item.quantidade_comprar,
        motivo: `Compra${precoItem.fornecedor ? ` — ${precoItem.fornecedor}` : ''} — ${formatBRL(total)}`,
      })
    }
    toast.success('Compra registrada!')
    setModalPreco({ open: false })
    setSalvando(false)
    carregar()
  }

  async function aprovarLista() {
    if (!lista) return
    setAprovando(true)
    const supabase = getSupabase()
    await supabase.from('listas_compra').update({ status: 'aprovado', aprovado_em: new Date().toISOString() }).eq('id', lista.id)
    toast.success('Lista aprovada!')
    setAprovando(false)
    carregar()
  }

  const categorias = lista ? Array.from(new Set(lista.itens.map(i => i.categoria).filter(Boolean))) as CategoriaAlimento[] : []
  const totalEstimado = lista?.itens.reduce((a, i) => a + (i.total_estimado ?? 0), 0) ?? 0
  const pendentes = lista?.itens.filter(i => i.status === 'pendente').length ?? 0
  const recebidos = lista?.itens.filter(i => i.status === 'recebido').length ?? 0

  return (
    <div>
      <SectionHeader
        title="Lista de Compras"
        subtitle="Baseada no cardápio real das preparações"
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            {lista && lista.itens.length > 0 && (
              <button className="btn btn-sm" onClick={() => setModalLimpar(true)} style={{ color: '#A32D2D' }}>
                <Trash2 size={13} /> Limpar
              </button>
            )}
            {lista && (
              <button className="btn btn-sm btn-primary" onClick={() => setModalItem(true)}>
                <Plus size={13} /> Adicionar item
              </button>
            )}
            <button className="btn btn-sm" onClick={() => setModalGerar(true)} disabled={gerando}>
              <RefreshCw size={13} />
              {gerando ? 'Gerando...' : 'Gerar lista'}
            </button>
            {isAdmin && lista && lista.status === 'pendente' && lista.itens.length > 0 && (
              <button className="btn btn-sm btn-primary" onClick={aprovarLista} disabled={aprovando}>
                <Check size={13} /> {aprovando ? 'Aprovando...' : 'Aprovar'}
              </button>
            )}
          </div>
        }
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#888780' }}>Carregando...</div>
      ) : (
        <>
          {lista && lista.itens.length > 0 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                {isAdmin && <MetricCard label="Total estimado" value={formatBRL(totalEstimado)} />}
                <MetricCard label="Pendentes" value={pendentes} color={pendentes > 0 ? '#BA7517' : undefined} />
                <MetricCard label="Recebidos" value={recebidos} color="#1D9E75" />
                <MetricCard label="Status" value={lista.status === 'aprovado' ? 'Aprovada' : 'Pendente'} color={lista.status === 'aprovado' ? '#1D9E75' : '#BA7517'} />
              </div>
              <Alert variant="blue">📋 <strong>{lista.titulo}</strong></Alert>
            </>
          )}

          {lista && lista.itens.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '14px', border: '1px solid #E5E3DC' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🛒</div>
              <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>Lista vazia</div>
              <div style={{ fontSize: '13px', color: '#888780', marginBottom: '20px' }}>
                Clique em "Gerar lista" para calcular o que precisa comprar baseado no cardápio
              </div>
              <button className="btn btn-primary" onClick={() => setModalGerar(true)}>Gerar lista do cardápio</button>
            </div>
          )}

          {lista && lista.itens.filter(i => !i.categoria).length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888780', marginBottom: '8px' }}>Outros</div>
              <TabelaItens itens={lista.itens.filter(i => !i.categoria)} isAdmin={isAdmin} onMarcar={marcarComprado} onExcluir={excluirItem} />
            </div>
          )}

          {categorias.map(cat => (
            <div key={cat} style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888780', marginBottom: '8px' }}>
                {CATEGORIA_LABELS[cat]}
              </div>
              <TabelaItens itens={lista!.itens.filter(i => i.categoria === cat)} isAdmin={isAdmin} onMarcar={marcarComprado} onExcluir={excluirItem} />
            </div>
          ))}
        </>
      )}

      {/* Modal Gerar */}
      <Modal open={modalGerar} onClose={() => setModalGerar(false)} title="Gerar lista de compras" size="sm"
        footer={<><button className="btn btn-sm" onClick={() => setModalGerar(false)}>Cancelar</button><button className="btn btn-sm btn-primary" onClick={gerarListaCardapio} disabled={gerando}>{gerando ? 'Gerando...' : '✓ Gerar lista'}</button></>}>
        <div className="input-group">
          <label className="input-label">Período</label>
          <select className="input" value={semanasPeriodo} onChange={(e) => setSemanasPeriodo(Number(e.target.value))}>
            <option value={1}>1 semana</option>
            <option value={2}>2 semanas</option>
            <option value={3}>3 semanas</option>
            <option value={4}>4 semanas (1 mês)</option>
            <option value={5}>5 semanas (cardápio completo)</option>
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">Categorias — deixe em branco para todas</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
            {CATEGORIAS.map(c => (
              <button key={c.value} onClick={() => toggleCategoria(c.value)}
                style={{ padding: '4px 12px', borderRadius: '20px', border: categoriasFiltro.includes(c.value) ? 'none' : '1px solid #E5E3DC', background: categoriasFiltro.includes(c.value) ? '#7B9E6B' : '#fff', color: categoriasFiltro.includes(c.value) ? '#fff' : '#5F5E5A', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>
                {c.label}
              </button>
            ))}
          </div>
          {categoriasFiltro.length > 0 && (
            <button onClick={() => setCategoriasFiltro([])} style={{ marginTop: '6px', fontSize: '11px', color: '#888780', background: 'none', border: 'none', cursor: 'pointer' }}>
              Limpar seleção
            </button>
          )}
        </div>
        <div style={{ padding: '10px', background: '#EDF3EA', borderRadius: '8px', fontSize: '12px', color: '#3D4F38', marginTop: '4px' }}>
          💡 Ingredientes das preparações × período, descontando estoque atual.
          {categoriasFiltro.length > 0 && <span> Filtrando: <strong>{categoriasFiltro.map(c => CATEGORIAS.find(x => x.value === c)?.label).join(', ')}</strong></span>}
        </div>
      </Modal>

      {/* Modal Limpar */}
      <Modal open={modalLimpar} onClose={() => setModalLimpar(false)} title="Limpar lista" size="sm"
        footer={<><button className="btn btn-sm" onClick={() => setModalLimpar(false)}>Cancelar</button><button className="btn btn-sm" onClick={limparLista} style={{ background: '#A32D2D', color: '#fff', border: 'none' }}>✓ Confirmar</button></>}>
        <div style={{ marginBottom: '16px', fontSize: '13px', color: '#5F5E5A' }}>
          Selecione o que deseja apagar da lista atual:
        </div>
        <div className="input-group">
          <label className="input-label">Apagar</label>
          <select className="input" value={limparCategoria} onChange={(e) => setLimparCategoria(e.target.value)}>
            <option value="todas">Toda a lista</option>
            {CATEGORIAS.filter(c => lista?.itens.some(i => i.categoria === c.value)).map(c => (
              <option key={c.value} value={c.value}>{c.label} apenas</option>
            ))}
          </select>
        </div>
        <div style={{ padding: '10px', background: '#FCEBEB', borderRadius: '8px', fontSize: '12px', color: '#A32D2D' }}>
          ⚠️ Esta ação não pode ser desfeita.
        </div>
      </Modal>

      {/* Modal adicionar item */}
      <Modal open={modalItem} onClose={() => setModalItem(false)} title="Adicionar item" size="sm"
        footer={<><button className="btn btn-sm" onClick={() => setModalItem(false)}>Cancelar</button><button className="btn btn-sm btn-primary" onClick={adicionarItem} disabled={salvando}>{salvando ? 'Salvando...' : '✓ Adicionar'}</button></>}>
        <div className="input-group">
          <label className="input-label">Categoria</label>
          <select className="input" value={filtroCategoria} onChange={(e) => { setFiltroCategoria(e.target.value); setNovoItem(f => ({ ...f, nome: '', unidade: 'kg' })) }}>
            <option value="">Todas</option>
            {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">Produto *</label>
          <select className="input" value={novoItem.nome} onChange={(e) => {
            const ing = ingredientes.find(i => i.nome === e.target.value)
            setNovoItem(f => ({ ...f, nome: e.target.value, unidade: ing?.unidade ?? f.unidade, categoria: (ing?.categoria ?? f.categoria) as CategoriaAlimento }))
          }}>
            <option value="">Selecione...</option>
            {ingredientes.filter(i => !filtroCategoria || i.categoria === filtroCategoria).map(ing => (
              <option key={ing.nome} value={ing.nome}>{ing.nome}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="input-group">
            <label className="input-label">Quantidade</label>
            <input className="input" type="number" min={0} value={novoItem.quantidade} onChange={(e) => setNovoItem(f => ({ ...f, quantidade: e.target.value }))} placeholder="0" />
          </div>
          <div className="input-group">
            <label className="input-label">Unidade</label>
            <input className="input" value={novoItem.unidade} readOnly style={{ background: '#F8F6F2', color: '#888780' }} />
          </div>
        </div>
      </Modal>

      {/* Modal preço */}
      <Modal open={modalPreco.open} onClose={() => setModalPreco({ open: false })} title={`Registrar compra — ${modalPreco.item?.nome_item}`} size="sm"
        footer={<><button className="btn btn-sm" onClick={() => setModalPreco({ open: false })}>Cancelar</button><button className="btn btn-sm btn-primary" onClick={salvarPrecoECompra} disabled={salvando}>{salvando ? 'Salvando...' : '✓ Registrar'}</button></>}>
        <div style={{ padding: '10px', background: '#E1F5EE', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', color: '#085041' }}>
          Quantidade: <strong>{modalPreco.item?.quantidade_comprar} {modalPreco.item?.unidade}</strong>
        </div>
        <div className="input-group">
          <label className="input-label">Preço por unidade (R$)</label>
          <input className="input" type="number" min={0} step={0.01} value={precoItem.preco} onChange={(e) => setPrecoItem(f => ({ ...f, preco: e.target.value }))} placeholder="0,00" />
        </div>
        <div className="input-group">
          <label className="input-label">Fornecedor (opcional)</label>
          <input className="input" value={precoItem.fornecedor} onChange={(e) => setPrecoItem(f => ({ ...f, fornecedor: e.target.value }))} placeholder="Ex: Atacadão..." />
        </div>
        {precoItem.preco && (
          <div style={{ padding: '10px', background: '#FAEEDA', borderRadius: '8px', fontSize: '13px', color: '#412402' }}>
            Total: <strong>{formatBRL(parseFloat(precoItem.preco) * (modalPreco.item?.quantidade_comprar ?? 0))}</strong>
          </div>
        )}
      </Modal>
    </div>
  )
}

function TabelaItens({ itens, isAdmin, onMarcar, onExcluir }: {
  itens: CompraItem[], isAdmin: boolean,
  onMarcar: (item: CompraItem) => void, onExcluir: (id: string) => void
}) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Qtd</th>
              <th>Un</th>
              {isAdmin && <th>Preço/un</th>}
              {isAdmin && <th>Total</th>}
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itens.map(item => (
              <tr key={item.id}>
                <td><strong>{item.nome_item}</strong></td>
                <td style={{ color: '#BA7517', fontWeight: 500 }}>{item.quantidade_comprar}</td>
                <td style={{ color: '#888780' }}>{item.unidade}</td>
                {isAdmin && <td>{item.preco_unitario ? formatBRL(item.preco_unitario) : '—'}</td>}
                {isAdmin && <td><strong>{item.total_estimado ? formatBRL(item.total_estimado) : '—'}</strong></td>}
                <td>
                  <Badge variant={item.status === 'recebido' ? 'green' : item.status === 'aprovado' ? 'blue' : 'amber'}>
                    {item.status === 'recebido' ? 'Recebido' : item.status === 'aprovado' ? 'Aprovado' : 'Pendente'}
                  </Badge>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {item.status !== 'recebido' && (
                      <button className="btn btn-sm btn-primary" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => onMarcar(item)}>
                        <Check size={11} /> {isAdmin ? 'Comprado' : 'Recebido'}
                      </button>
                    )}
                    {isAdmin && (
                      <button className="btn btn-sm btn-icon" style={{ color: '#A32D2D' }} onClick={() => onExcluir(item.id)}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
