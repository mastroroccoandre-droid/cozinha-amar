'use client'

import { useEffect, useState } from 'react'
import { Plus, Check, RefreshCw, Trash2 } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { Modal, SectionHeader, Badge, Alert, MetricCard } from '@/components/ui'
import { formatBRL, CATEGORIA_LABELS } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
import type { ListaCompra, CompraItem, Produto, CategoriaAlimento } from '@/types'

const EMAILS_ADMIN = ['admin@residencialamar.com.br']

export default function ComprasPage() {
  const { config } = useAppStore()
  const [lista, setLista] = useState<(ListaCompra & { itens: CompraItem[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [aprovando, setAprovando] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [modalItem, setModalItem] = useState<{ open: boolean }>({ open: false })
  const [modalPreco, setModalPreco] = useState<{ open: boolean; item?: CompraItem }>({ open: false })
  const [novoItem, setNovoItem] = useState({ nome: '', quantidade: '', unidade: 'kg', categoria: 'secos' as CategoriaAlimento, observacao: '' })
  const [precoItem, setPrecoItem] = useState({ preco: '', fornecedor: '' })
  const [salvando, setSalvando] = useState(false)
  const [ingredientes, setIngredientes] = useState<{nome: string, unidade: string}[]>([])

  async function carregarIngredientes() {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('preparacao_ingredientes')
      .select('nome_ingrediente, unidade')
      .order('nome_ingrediente')
    // Converte para maior unidade e deduplica
    function maiorUnidade(u: string): string {
      if (u === 'g') return 'kg'
      if (u === 'ml') return 'L'
      return u
    }
    const mapa = new Map<string, string>()
    ;(data ?? []).forEach((i: any) => {
      if (!mapa.has(i.nome_ingrediente)) mapa.set(i.nome_ingrediente, maiorUnidade(i.unidade))
    })
    setIngredientes(Array.from(mapa.entries()).map(([nome, unidade]) => ({ nome, unidade })).sort((a, b) => a.nome.localeCompare(b.nome)))
  }

  async function carregar() {
    const supabase = getSupabase()
    const [{ data }, { data: authData }] = await Promise.all([
      supabase.from('listas_compra').select('*, itens:compra_itens(*)').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.auth.getUser(),
    ])
    setIsAdmin(EMAILS_ADMIN.includes(authData.user?.email ?? ''))
    if (!data) {
      // Cria lista vazia automaticamente
      const { data: novaLista } = await supabase.from('listas_compra').insert({
        titulo: 'Lista de compras — ' + new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
        tipo: 'mensal',
        semana_referencia: 1,
        total_estimado: 0,
      }).select('*, itens:compra_itens(*)').single()
      setLista(novaLista)
    } else {
      setLista(data)
    }
    setLoading(false)
  }

  useEffect(() => { carregar(); carregarIngredientes() }, [])

  async function gerarListaAutomatica() {
    setGerando(true)
    const supabase = getSupabase()
    const { data: produtos } = await supabase.from('produtos').select('*').eq('ativo', true).order('nome')
    const margem = (config?.margem_seguranca ?? 10) / 100

    const itensFaltando = (produtos ?? []).filter((p: Produto) => p.quantidade_atual < p.estoque_minimo * 1.5)

    if (itensFaltando.length === 0) {
      toast.success('Estoque adequado! Nenhum item precisa de reposição.')
      setGerando(false)
      return
    }

    const { data: novaLista, error } = await supabase.from('listas_compra').insert({
      titulo: `Lista de compras — ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`,
      tipo: 'mensal',
      semana_referencia: 1,
      total_estimado: 0,
    }).select().single()

    if (error || !novaLista) { toast.error('Erro ao gerar lista'); setGerando(false); return }

    await supabase.from('compra_itens').insert(
      itensFaltando.map((p: Produto) => {
        const necessario = Math.ceil(p.estoque_minimo * 2 * (1 + margem))
        const comprar = Math.max(0, necessario - p.quantidade_atual)
        return {
          lista_id: novaLista.id,
          produto_id: p.id,
          nome_item: p.nome,
          categoria: p.categoria,
          quantidade_necessaria: necessario,
          quantidade_estoque: p.quantidade_atual,
          quantidade_comprar: comprar,
          unidade: p.unidade,
          preco_unitario: p.preco_medio,
          total_estimado: comprar * (p.preco_medio ?? 0),
          status: 'pendente',
        }
      })
    )

    toast.success('Lista gerada!')
    setGerando(false)
    carregar()
  }

  async function adicionarItem() {
    if (!novoItem.nome.trim() || !lista) return
    setSalvando(true)
    const supabase = getSupabase()
    const qtd = parseFloat(novoItem.quantidade) || 0

    await supabase.from('compra_itens').insert({
      lista_id: lista.id,
      nome_item: novoItem.nome,
      categoria: novoItem.categoria,
      quantidade_comprar: qtd,
      quantidade_necessaria: qtd,
      quantidade_estoque: 0,
      unidade: novoItem.unidade,
      status: 'pendente',
    })

    toast.success('Item adicionado!')
    setModalItem({ open: false })
    setNovoItem({ nome: '', quantidade: '', unidade: 'kg', categoria: 'secos', observacao: '' })
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

    await supabase.from('compra_itens').update({
      status: 'recebido',
      preco_unitario: preco,
      total_estimado: total,
    }).eq('id', modalPreco.item.id)

    // Registra no histórico de compras
    await supabase.from('movimentacoes_estoque').insert({
      produto_id: modalPreco.item.produto_id,
      tipo: 'entrada',
      quantidade: modalPreco.item.quantidade_comprar,
      quantidade_anterior: 0,
      quantidade_posterior: modalPreco.item.quantidade_comprar,
      motivo: `Compra registrada${precoItem.fornecedor ? ` — ${precoItem.fornecedor}` : ''} — ${formatBRL(total)}`,
    })

    toast.success('Compra registrada com preço!')
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

  const categorias = lista ? Array.from(new Set(lista.itens.map((i) => i.categoria).filter(Boolean))) as CategoriaAlimento[] : []
  const totalEstimado = lista?.itens.reduce((a, i) => a + (i.total_estimado ?? 0), 0) ?? 0
  const pendentes = lista?.itens.filter((i) => i.status === 'pendente').length ?? 0
  const recebidos = lista?.itens.filter((i) => i.status === 'recebido').length ?? 0

  return (
    <div>
      <SectionHeader
        title="Lista de Compras"
        subtitle="Gerada automaticamente com base no cardápio e estoque"
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            {lista && (
              <button className="btn btn-sm btn-primary" onClick={() => setModalItem({ open: true })}>
                <Plus size={13} /> Adicionar item
              </button>
            )}
            <button className="btn btn-sm" onClick={gerarListaAutomatica} disabled={gerando}>
              <RefreshCw size={13} className={gerando ? 'animate-spin' : ''} />
              {gerando ? 'Gerando...' : 'Gerar nova lista'}
            </button>
            {isAdmin && lista && lista.status === 'pendente' && (
              <button className="btn btn-sm btn-primary" onClick={aprovarLista} disabled={aprovando}>
                <Check size={13} />
                {aprovando ? 'Aprovando...' : 'Aprovar lista'}
              </button>
            )}
          </div>
        }
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#888780' }}>Carregando...</div>
      ) : !lista ? (
        <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '14px', border: '1px solid #E5E3DC' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🛒</div>
          <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>Nenhuma lista gerada</div>
          <div style={{ fontSize: '13px', color: '#888780', marginBottom: '20px' }}>
            Clique em "Gerar nova lista" para calcular automaticamente o que precisa comprar
          </div>
          <button className="btn btn-primary" onClick={gerarListaAutomatica} disabled={gerando}>
            {gerando ? 'Gerando...' : '+ Gerar lista automática'}
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
            <MetricCard label="Total estimado" value={formatBRL(totalEstimado)} />
            <MetricCard label="Itens pendentes" value={pendentes} color={pendentes > 0 ? '#BA7517' : undefined} />
            <MetricCard label="Recebidos" value={recebidos} color="#1D9E75" />
            <MetricCard label="Status" value={lista.status === 'aprovado' ? 'Aprovada' : 'Pendente'} color={lista.status === 'aprovado' ? '#1D9E75' : '#BA7517'} />
          </div>

          <Alert variant="blue">
            📋 <strong>{lista.titulo}</strong>
          </Alert>

          {/* Itens sem categoria */}
          {lista.itens.filter(i => !i.categoria).length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888780', marginBottom: '8px' }}>
                Outros
              </div>
              <TabelaItens
                itens={lista.itens.filter(i => !i.categoria)}
                isAdmin={isAdmin}
                onMarcar={marcarComprado}
                onExcluir={excluirItem}
              />
            </div>
          )}

          {categorias.map((cat) => (
            <div key={cat} style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888780', marginBottom: '8px' }}>
                {CATEGORIA_LABELS[cat]}
              </div>
              <TabelaItens
                itens={lista.itens.filter(i => i.categoria === cat)}
                isAdmin={isAdmin}
                onMarcar={marcarComprado}
                onExcluir={excluirItem}
              />
            </div>
          ))}
        </>
      )}

      {/* Modal adicionar item */}
      <Modal
        open={modalItem.open}
        onClose={() => setModalItem({ open: false })}
        title="Adicionar item à lista"
        size="sm"
        footer={
          <>
            <button className="btn btn-sm" onClick={() => setModalItem({ open: false })}>Cancelar</button>
            <button className="btn btn-sm btn-primary" onClick={adicionarItem} disabled={salvando}>
              {salvando ? 'Salvando...' : '✓ Adicionar'}
            </button>
          </>
        }
      >
        <div className="input-group">
          <label className="input-label">Produto *</label>
          <select className="input" value={novoItem.nome} onChange={(e) => {
            const ing = ingredientes.find(i => i.nome === e.target.value)
            setNovoItem(f => ({ ...f, nome: e.target.value, unidade: ing?.unidade ?? f.unidade }))
          }}>
            <option value="">Selecione um produto...</option>
            {ingredientes.map((ing) => (
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

      {/* Modal registrar preço (admin) */}
      <Modal
        open={modalPreco.open}
        onClose={() => setModalPreco({ open: false })}
        title={`Registrar compra — ${modalPreco.item?.nome_item}`}
        size="sm"
        footer={
          <>
            <button className="btn btn-sm" onClick={() => setModalPreco({ open: false })}>Cancelar</button>
            <button className="btn btn-sm btn-primary" onClick={salvarPrecoECompra} disabled={salvando}>
              {salvando ? 'Salvando...' : '✓ Registrar compra'}
            </button>
          </>
        }
      >
        <div style={{ padding: '10px', background: '#E1F5EE', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', color: '#085041' }}>
          Quantidade: <strong>{modalPreco.item?.quantidade_comprar} {modalPreco.item?.unidade}</strong>
        </div>
        <div className="input-group">
          <label className="input-label">Preço por unidade (R$)</label>
          <input className="input" type="number" min={0} step={0.01} value={precoItem.preco} onChange={(e) => setPrecoItem(f => ({ ...f, preco: e.target.value }))} placeholder="0,00" />
        </div>
        <div className="input-group">
          <label className="input-label">Fornecedor (opcional)</label>
          <input className="input" value={precoItem.fornecedor} onChange={(e) => setPrecoItem(f => ({ ...f, fornecedor: e.target.value }))} placeholder="Ex: Atacadão, Mercado X..." />
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
  itens: CompraItem[]
  isAdmin: boolean
  onMarcar: (item: CompraItem) => void
  onExcluir: (id: string) => void
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
            {itens.map((item) => (
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
