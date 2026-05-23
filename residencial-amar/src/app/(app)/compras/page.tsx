'use client'

import { useEffect, useState } from 'react'
import { Plus, Download, Check, RefreshCw } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { Modal, SectionHeader, Badge, Alert, MetricCard } from '@/components/ui'
import { formatBRL, CATEGORIA_LABELS } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
import type { ListaCompra, CompraItem, Produto, CategoriaAlimento } from '@/types'

export default function ComprasPage() {
  const { config } = useAppStore()
  const [lista, setLista] = useState<(ListaCompra & { itens: CompraItem[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [aprovando, setAprovando] = useState(false)
  const [modalItem, setModalItem] = useState<{ open: boolean; item?: CompraItem }>({ open: false })

  async function carregar() {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('listas_compra')
      .select('*, itens:compra_itens(*)')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setLista(data)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function gerarListaAutomatica() {
    setGerando(true)
    const supabase = getSupabase()

    // Busca produtos com estoque baixo
    const { data: produtos } = await supabase
      .from('produtos')
      .select('*')
      .eq('ativo', true)
      .order('nome')

    const numIdosos = config?.num_idosos ?? 42
    const margem = (config?.margem_seguranca ?? 10) / 100

    // Calcula necessidade baseada em 4 semanas
    const itensFaltando = (produtos ?? []).filter((p: Produto) => {
      return p.quantidade_atual < p.estoque_minimo * 1.5
    })

    if (itensFaltando.length === 0) {
      toast.success('Estoque adequado! Nenhum item precisa de reposição.')
      setGerando(false)
      return
    }

    // Cria lista
    const { data: novaLista, error } = await supabase
      .from('listas_compra')
      .insert({
        titulo: `Lista de compras — ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`,
        tipo: 'mensal',
        semana_referencia: 1,
        total_estimado: itensFaltando.reduce((acc: number, p: Produto) => {
          const falta = p.estoque_minimo * 2 - p.quantidade_atual
          return acc + falta * (p.preco_medio ?? 0)
        }, 0),
      })
      .select()
      .single()

    if (error || !novaLista) {
      toast.error('Erro ao gerar lista')
      setGerando(false)
      return
    }

    // Insere itens
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
          fornecedor_id: p.fornecedor_id,
          status: 'pendente',
        }
      })
    )

    toast.success('Lista gerada automaticamente!')
    setGerando(false)
    carregar()
  }

  async function aprovarLista() {
    if (!lista) return
    setAprovando(true)
    const supabase = getSupabase()

    await supabase
      .from('listas_compra')
      .update({ status: 'aprovado', aprovado_em: new Date().toISOString() })
      .eq('id', lista.id)

    toast.success('Lista aprovada!')
    setAprovando(false)
    carregar()
  }

  async function marcarRecebido(itemId: string) {
    const supabase = getSupabase()
    await supabase
      .from('compra_itens')
      .update({ status: 'recebido' })
      .eq('id', itemId)

    toast.success('Item marcado como recebido')
    carregar()
  }

  const categorias = lista
    ? Array.from(new Set(lista.itens.map((i) => i.categoria).filter(Boolean))) as CategoriaAlimento[]
    : []

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
            <button className="btn btn-sm" onClick={gerarListaAutomatica} disabled={gerando}>
              <RefreshCw size={13} className={gerando ? 'animate-spin' : ''} />
              {gerando ? 'Gerando...' : 'Gerar nova lista'}
            </button>
            {lista && lista.status === 'pendente' && (
              <button
                className="btn btn-sm btn-primary"
                onClick={aprovarLista}
                disabled={aprovando}
              >
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
        <div
          style={{
            textAlign: 'center',
            padding: '60px',
            background: '#fff',
            borderRadius: '14px',
            border: '1px solid #E5E3DC',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🛒</div>
          <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>
            Nenhuma lista gerada
          </div>
          <div style={{ fontSize: '13px', color: '#888780', marginBottom: '20px' }}>
            Clique em "Gerar nova lista" para calcular automaticamente o que precisa comprar
          </div>
          <button className="btn btn-primary" onClick={gerarListaAutomatica} disabled={gerando}>
            {gerando ? 'Gerando...' : '+ Gerar lista automática'}
          </button>
        </div>
      ) : (
        <>
          {/* Métricas */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '10px',
              marginBottom: '16px',
            }}
          >
            <MetricCard
              label="Total estimado"
              value={formatBRL(totalEstimado)}
            />
            <MetricCard
              label="Itens pendentes"
              value={pendentes}
              color={pendentes > 0 ? '#BA7517' : undefined}
            />
            <MetricCard
              label="Recebidos"
              value={recebidos}
              color="#1D9E75"
            />
            <MetricCard
              label="Status da lista"
              value={lista.status === 'aprovado' ? 'Aprovada' : 'Pendente'}
              color={lista.status === 'aprovado' ? '#1D9E75' : '#BA7517'}
            />
          </div>

          {/* Info */}
          <Alert variant="blue">
            📋 <strong>{lista.titulo}</strong> · Margem de segurança: {config?.margem_seguranca ?? 10}% · {config?.num_idosos ?? 42} idosos
          </Alert>

          {/* Itens por categoria */}
          {categorias.map((cat) => {
            const itenscat = lista.itens.filter((i) => i.categoria === cat)
            return (
              <div key={cat} style={{ marginTop: '20px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#888780',
                    marginBottom: '8px',
                  }}
                >
                  {CATEGORIA_LABELS[cat]}
                </div>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Produto</th>
                          <th>Estoque atual</th>
                          <th>Necessário</th>
                          <th>Comprar</th>
                          <th>Un</th>
                          <th>Preço/un</th>
                          <th>Total</th>
                          <th>Status</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {itenscat.map((item) => {
                          const falta = item.quantidade_comprar
                          const statusColor = item.status === 'recebido' ? '#1D9E75' : item.status === 'aprovado' ? '#185FA5' : '#BA7517'

                          return (
                            <tr key={item.id}>
                              <td><strong>{item.nome_item}</strong></td>
                              <td>
                                <span
                                  style={{
                                    color: item.quantidade_estoque < item.quantidade_necessaria / 2 ? '#A32D2D' : '#5F5E5A',
                                    fontWeight: 500,
                                  }}
                                >
                                  {item.quantidade_estoque} {item.unidade}
                                </span>
                              </td>
                              <td>{item.quantidade_necessaria} {item.unidade}</td>
                              <td>
                                <strong style={{ color: '#BA7517' }}>
                                  {falta} {item.unidade}
                                </strong>
                              </td>
                              <td style={{ color: '#888780' }}>{item.unidade}</td>
                              <td>{item.preco_unitario ? formatBRL(item.preco_unitario) : '—'}</td>
                              <td>
                                <strong>
                                  {item.total_estimado ? formatBRL(item.total_estimado) : '—'}
                                </strong>
                              </td>
                              <td>
                                <Badge variant={
                                  item.status === 'recebido' ? 'green' :
                                  item.status === 'aprovado' ? 'blue' : 'amber'
                                }>
                                  {item.status === 'recebido' ? 'Recebido' :
                                   item.status === 'aprovado' ? 'Aprovado' : 'Pendente'}
                                </Badge>
                              </td>
                              <td>
                                {item.status !== 'recebido' && (
                                  <button
                                    className="btn btn-sm"
                                    style={{ fontSize: '11px', padding: '4px 8px' }}
                                    onClick={() => marcarRecebido(item.id)}
                                  >
                                    <Check size={11} /> Recebido
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
