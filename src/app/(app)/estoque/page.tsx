'use client'

import { useEffect, useState, useMemo } from 'react'
import { Plus, Edit2, AlertTriangle, Package, Search } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import {
  Modal, SectionHeader, Badge, EmptyState, ProgressBar, MetricCard
} from '@/components/ui'
import {
  formatBRL,
  getStatusEstoque, getPorcentagemEstoque,
  CATEGORIA_LABELS, LOCAL_LABELS
} from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Produto, CategoriaAlimento, LocalEstoque } from '@/types'

interface ProdutoForm {
  nome: string
  categoria: CategoriaAlimento
  unidade: string
  quantidade_atual: number
  estoque_minimo: number
  local_armazenamento: LocalEstoque
  preco_medio: number
  observacoes: string
}

const FORM_INICIAL: ProdutoForm = {
  nome: '',
  categoria: 'secos',
  unidade: 'kg',
  quantidade_atual: 0,
  estoque_minimo: 0,
  local_armazenamento: 'despensa',
  preco_medio: 0,
  observacoes: '',
}

export default function EstoquePage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [catFiltro, setCatFiltro] = useState<string>('todas')
  const [localFiltro, setLocalFiltro] = useState<string>('todos')
  const [modalNovo, setModalNovo] = useState(false)
  const [modalEntrada, setModalEntrada] = useState<{ open: boolean; produto?: Produto }>({ open: false })
  const [modalAjuste, setModalAjuste] = useState<{ open: boolean; produto?: Produto }>({ open: false })
  const [form, setForm] = useState<ProdutoForm>(FORM_INICIAL)
  const [ajuste, setAjuste] = useState({ tipo: 'ajuste', novaQtd: 0, motivo: '' })
  const [entrada, setEntrada] = useState({ qtd: 0, nf: '', fornecedor: '' })
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('produtos')
      .select('*, fornecedor:fornecedores(nome)')
      .eq('ativo', true)
      .order('nome')
    setProdutos(data ?? [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const filtrados = useMemo(() => {
    return produtos.filter((p) => {
      const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase())
      const matchCat = catFiltro === 'todas' || p.categoria === catFiltro
      const matchLocal = localFiltro === 'todos' || p.local_armazenamento === localFiltro
      return matchBusca && matchCat && matchLocal
    })
  }, [produtos, busca, catFiltro, localFiltro])

  const stats = useMemo(() => ({
    total: produtos.length,
    baixo: produtos.filter((p) => getStatusEstoque(p) !== 'ok').length,
    categorias: new Set(produtos.map((p) => p.categoria)).size,
  }), [produtos])

  async function salvarProduto() {
    if (!form.nome.trim()) return toast.error('Informe o nome do produto')
    setSalvando(true)
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
    setSalvando(false)
  }

  async function salvarEntrada() {
    if (!modalEntrada.produto || entrada.qtd <= 0) return
    setSalvando(true)
    const supabase = getSupabase()
    const prod = modalEntrada.produto
    const novaQtd = prod.quantidade_atual + entrada.qtd

    await supabase.from('produtos').update({
      quantidade_atual: novaQtd,
    }).eq('id', prod.id)

    await supabase.from('movimentacoes_estoque').insert({
      produto_id: prod.id,
      tipo: 'entrada',
      quantidade: entrada.qtd,
      quantidade_anterior: prod.quantidade_atual,
      quantidade_posterior: novaQtd,
      motivo: `Entrada NF: ${entrada.nf}`,
    })

    toast.success('Entrada registrada!')
    setModalEntrada({ open: false })
    setEntrada({ qtd: 0, nf: '', fornecedor: '' })
    setSalvando(false)
    carregar()
  }

  async function salvarAjuste() {
    if (!modalAjuste.produto) return
    setSalvando(true)
    const supabase = getSupabase()
    const prod = modalAjuste.produto

    await supabase.from('produtos').update({
      quantidade_atual: ajuste.novaQtd,
    }).eq('id', prod.id)

    await supabase.from('movimentacoes_estoque').insert({
      produto_id: prod.id,
      tipo: ajuste.tipo,
      quantidade: Math.abs(ajuste.novaQtd - prod.quantidade_atual),
      quantidade_anterior: prod.quantidade_atual,
      quantidade_posterior: ajuste.novaQtd,
      motivo: ajuste.motivo,
    })

    toast.success('Estoque ajustado!')
    setModalAjuste({ open: false })
    setSalvando(false)
    carregar()
  }

  function getStatusBadge(p: Produto) {
    const status = getStatusEstoque(p)
    if (status === 'critico') return <Badge variant="red">Crítico</Badge>
    if (status === 'baixo') return <Badge variant="amber">Baixo</Badge>
    return <Badge variant="green">Ok</Badge>
  }

  return (
    <div>
      {/* Métricas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px',
          marginBottom: '20px',
        }}
      >
        <MetricCard label="Total de produtos" value={stats.total} icon={<Package size={13} />} />
        <MetricCard
          label="Estoque baixo"
          value={stats.baixo}
          icon={<AlertTriangle size={13} />}
          color={stats.baixo > 0 ? '#BA7517' : undefined}
        />
        <MetricCard label="Categorias" value={stats.categorias} />
      </div>

      {/* Filtros */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '16px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888780' }}
          />
          <input
            className="input"
            style={{ paddingLeft: '32px' }}
            placeholder="Buscar produto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <select
          className="input"
          style={{ width: 'auto' }}
          value={catFiltro}
          onChange={(e) => setCatFiltro(e.target.value)}
        >
          <option value="todas">Todas as categorias</option>
          {Object.entries(CATEGORIA_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        <select
          className="input"
          style={{ width: 'auto' }}
          value={localFiltro}
          onChange={(e) => setLocalFiltro(e.target.value)}
        >
          <option value="todos">Todos os locais</option>
          {Object.entries(LOCAL_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
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
                <th>Local</th>
                <th>Quantidade</th>
                <th>Mínimo</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#888780' }}>
                    Carregando...
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#888780' }}>
                    Nenhum produto encontrado
                  </td>
                </tr>
              ) : (
                filtrados.map((p) => {
                  const pct = getPorcentagemEstoque(p)
                  const status = getStatusEstoque(p)
                  const progressColor = status === 'ok' ? '#1D9E75' : status === 'baixo' ? '#BA7517' : '#A32D2D'

                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{p.nome}</div>
                        {p.observacoes && (
                          <div style={{ fontSize: '11px', color: '#888780' }}>{p.observacoes}</div>
                        )}
                      </td>
                      <td>
                        <Badge variant="gray">{CATEGORIA_LABELS[p.categoria]}</Badge>
                      </td>
                      <td style={{ fontSize: '13px', color: '#5F5E5A' }}>
                        {LOCAL_LABELS[p.local_armazenamento]}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div>
                            <div style={{ fontWeight: 500, fontSize: '13px' }}>
                              {p.quantidade_atual} {p.unidade}
                            </div>
                            <div style={{ width: '80px', marginTop: '4px' }}>
                              <div style={{ height: '4px', background: '#F1EFE8', borderRadius: '2px' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    borderRadius: '2px',
                                    background: progressColor,
                                    width: `${pct}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: '#888780', fontSize: '13px' }}>
                        {p.estoque_minimo} {p.unidade}
                      </td>
                      <td>{getStatusBadge(p)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => {
                              setModalEntrada({ open: true, produto: p })
                              setEntrada({ qtd: 0, nf: '', fornecedor: '' })
                            }}
                            title="Registrar entrada"
                          >
                            + Entrada
                          </button>
                          <button
                            className="btn btn-sm btn-icon"
                            onClick={() => {
                              setModalAjuste({ open: true, produto: p })
                              setAjuste({ tipo: 'ajuste', novaQtd: p.quantidade_atual, motivo: '' })
                            }}
                            title="Ajustar"
                          >
                            <Edit2 size={13} />
                          </button>
                        </div>
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
      <Modal
        open={modalNovo}
        onClose={() => { setModalNovo(false); setForm(FORM_INICIAL) }}
        title="Novo produto"
        footer={
          <>
            <button className="btn btn-sm" onClick={() => { setModalNovo(false); setForm(FORM_INICIAL) }}>
              Cancelar
            </button>
            <button className="btn btn-sm btn-primary" onClick={salvarProduto} disabled={salvando}>
              {salvando ? 'Salvando...' : '✓ Cadastrar'}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="input-group" style={{ gridColumn: '1 / -1' }}>
            <label className="input-label">Nome do produto *</label>
            <input className="input" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: Arroz branco parboilizado" />
          </div>
          <div className="input-group">
            <label className="input-label">Categoria</label>
            <select className="input" value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value as CategoriaAlimento }))}>
              {Object.entries(CATEGORIA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Unidade</label>
            <select className="input" value={form.unidade} onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))}>
              <option>kg</option><option>g</option><option>L</option><option>ml</option><option>un</option><option>cx</option><option>pct</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Quantidade atual</label>
            <input className="input" type="number" min={0} value={form.quantidade_atual} onChange={(e) => setForm((f) => ({ ...f, quantidade_atual: Number(e.target.value) }))} />
          </div>
          <div className="input-group">
            <label className="input-label">Estoque mínimo</label>
            <input className="input" type="number" min={0} value={form.estoque_minimo} onChange={(e) => setForm((f) => ({ ...f, estoque_minimo: Number(e.target.value) }))} />
          </div>
          <div className="input-group">
            <label className="input-label">Local de armazenamento</label>
            <select className="input" value={form.local_armazenamento} onChange={(e) => setForm((f) => ({ ...f, local_armazenamento: e.target.value as LocalEstoque }))}>
              {Object.entries(LOCAL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
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

      {/* Modal Entrada */}
      <Modal
        open={modalEntrada.open}
        onClose={() => setModalEntrada({ open: false })}
        title={`Entrada — ${modalEntrada.produto?.nome}`}
        size="sm"
        footer={
          <>
            <button className="btn btn-sm" onClick={() => setModalEntrada({ open: false })}>Cancelar</button>
            <button className="btn btn-sm btn-primary" onClick={salvarEntrada} disabled={salvando}>
              {salvando ? 'Salvando...' : '✓ Registrar entrada'}
            </button>
          </>
        }
      >
        <div style={{ padding: '10px', background: '#E1F5EE', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', color: '#085041' }}>
          Saldo atual: <strong>{modalEntrada.produto?.quantidade_atual} {modalEntrada.produto?.unidade}</strong>
        </div>
        <div className="input-group">
          <label className="input-label">Quantidade recebida ({modalEntrada.produto?.unidade})</label>
          <input className="input" type="number" min={0} value={entrada.qtd} onChange={(e) => setEntrada((e2) => ({ ...e2, qtd: Number(e.target.value) }))} />
        </div>
        <div className="input-group">
          <label className="input-label">Nota fiscal / referência</label>
          <input className="input" value={entrada.nf} onChange={(e) => setEntrada((e2) => ({ ...e2, nf: e.target.value }))} placeholder="NF-001" />
        </div>
      </Modal>

      {/* Modal Ajuste */}
      <Modal
        open={modalAjuste.open}
        onClose={() => setModalAjuste({ open: false })}
        title={`Ajustar — ${modalAjuste.produto?.nome}`}
        size="sm"
        footer={
          <>
            <button className="btn btn-sm" onClick={() => setModalAjuste({ open: false })}>Cancelar</button>
            <button className="btn btn-sm btn-primary" onClick={salvarAjuste} disabled={salvando}>
              {salvando ? 'Salvando...' : '✓ Salvar ajuste'}
            </button>
          </>
        }
      >
        <div style={{ padding: '10px', background: '#FAEEDA', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', color: '#412402' }}>
          Saldo atual: <strong>{modalAjuste.produto?.quantidade_atual} {modalAjuste.produto?.unidade}</strong>
        </div>
        <div className="input-group">
          <label className="input-label">Tipo de ajuste</label>
          <select className="input" value={ajuste.tipo} onChange={(e) => setAjuste((a) => ({ ...a, tipo: e.target.value }))}>
            <option value="ajuste">Inventário / correção</option>
            <option value="perda">Perda / descarte</option>
            <option value="saida">Saída manual</option>
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">Novo saldo ({modalAjuste.produto?.unidade})</label>
          <input className="input" type="number" min={0} value={ajuste.novaQtd} onChange={(e) => setAjuste((a) => ({ ...a, novaQtd: Number(e.target.value) }))} />
        </div>
        <div className="input-group">
          <label className="input-label">Motivo *</label>
          <textarea className="input" rows={2} value={ajuste.motivo} onChange={(e) => setAjuste((a) => ({ ...a, motivo: e.target.value }))} placeholder="Descreva o motivo do ajuste..." />
        </div>
      </Modal>
    </div>
  )
}
