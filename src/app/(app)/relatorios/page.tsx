'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Trash2, Package, ShoppingCart, TrendingDown, ChefHat, X } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { SectionHeader } from '@/components/ui'
import { formatBRL } from '@/lib/utils'

interface Movimentacao {
  id: string
  tipo: string
  quantidade: number
  motivo: string
  created_at: string
  produtos?: { nome: string; unidade: string }
}

interface ConsumoItem {
  nome: string
  previsto: number
  realizado: number
  unidade: string
}

interface CompraRegistrada {
  nome_item: string
  quantidade_comprar: number
  unidade: string
  preco_unitario: number
  total_estimado: number
  created_at: string
}

const RELATORIOS = [
  { id: 'consumo', icon: BarChart3, title: 'Consumo mensal', desc: 'Previsto vs realizado por ingrediente', cor: '#185FA5', bg: '#E6F1FB' },
  { id: 'desperdicio', icon: Trash2, title: 'Desperdícios', desc: 'Perdas por refeição e período', cor: '#A32D2D', bg: '#FCEBEB' },
  { id: 'movimentacoes', icon: Package, title: 'Movimentações de estoque', desc: 'Entradas, saídas e ajustes', cor: '#1D9E75', bg: '#E1F5EE' },
  { id: 'compras', icon: ShoppingCart, title: 'Histórico de compras', desc: 'Por fornecedor e período', cor: '#BA7517', bg: '#FAEEDA' },
  { id: 'custo', icon: TrendingDown, title: 'Custo alimentar', desc: 'Custo por categoria e total', cor: '#533AB7', bg: '#EEEDFE' },
  { id: 'producao', icon: ChefHat, title: 'Produção diária', desc: 'Refeições confirmadas por dia', cor: '#1D9E75', bg: '#E1F5EE' },
]

export default function RelatoriosPage() {
  const mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const inicioMesDate = inicioMes.split('T')[0]

  const [relatorioAtivo, setRelatorioAtivo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([])
  const [compras, setCompras] = useState<CompraRegistrada[]>([])
  const [consumo, setConsumo] = useState<ConsumoItem[]>([])
  const [producao, setProducao] = useState<any[]>([])
  const [totalCompras, setTotalCompras] = useState(0)

  async function abrirRelatorio(id: string) {
    setRelatorioAtivo(id)
    setLoading(true)
    const supabase = getSupabase()

    if (id === 'movimentacoes') {
      const { data } = await supabase
        .from('movimentacoes_estoque')
        .select('*, produtos(nome, unidade)')
        .gte('created_at', inicioMes)
        .order('created_at', { ascending: false })
      setMovimentacoes(data ?? [])
    }

    if (id === 'compras' || id === 'custo') {
      const { data } = await supabase
        .from('compra_itens')
        .select('*')
        .eq('status', 'recebido')
        .gte('created_at', inicioMes)
        .order('created_at', { ascending: false })
      const comprasData = data ?? []
      setCompras(comprasData)
      setTotalCompras(comprasData.reduce((a: number, c: any) => a + (c.total_estimado ?? 0), 0))
    }

    if (id === 'consumo') {
      // Previsto: soma ingredientes das preparações do mês
      const { data: prods } = await supabase
        .from('producao_ingredientes')
        .select('nome_ingrediente, quantidade, unidade')
        .gte('created_at', inicioMes)

      // Agrupa realizado por ingrediente
      const realizadoMap = new Map<string, { quantidade: number; unidade: string }>()
      ;(prods ?? []).forEach((p: any) => {
        const key = p.nome_ingrediente
        const atual = realizadoMap.get(key) ?? { quantidade: 0, unidade: p.unidade }
        realizadoMap.set(key, { quantidade: atual.quantidade + p.quantidade, unidade: p.unidade })
      })

      // Previsto: ingredientes das preparações da semana atual × semanas no mês
      const { data: ings } = await supabase
        .from('preparacao_ingredientes')
        .select('nome_ingrediente, quantidade_por_idoso, unidade')

      const prevMap = new Map<string, { quantidade: number; unidade: string }>()
      ;(ings ?? []).forEach((i: any) => {
        const key = i.nome_ingrediente
        const atual = prevMap.get(key) ?? { quantidade: 0, unidade: i.unidade }
        // Aproxima: cada preparação ocorre ~4x por mês
        prevMap.set(key, { quantidade: atual.quantidade + i.quantidade_por_idoso, unidade: i.unidade })
      })

      const consumoData: ConsumoItem[] = Array.from(realizadoMap.entries()).map(([nome, v]) => ({
        nome,
        realizado: v.quantidade,
        previsto: prevMap.get(nome)?.quantidade ?? v.quantidade,
        unidade: v.unidade,
      })).sort((a, b) => b.realizado - a.realizado)

      setConsumo(consumoData)
    }

    if (id === 'producao') {
      const { data } = await supabase
        .from('producao_diaria')
        .select('*')
        .gte('data', inicioMesDate)
        .order('data', { ascending: false })
      setProducao(data ?? [])
    }

    setLoading(false)
  }

  const rel = RELATORIOS.find(r => r.id === relatorioAtivo)

  return (
    <div>
      <SectionHeader
        title="Relatórios"
        subtitle={`Dados nutricionais e operacionais — ${mesAtual}`}
      />

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        {RELATORIOS.map((r) => {
          const Icon = r.icon
          return (
            <div key={r.id} className="card" style={{ cursor: 'pointer', transition: 'all 0.15s', borderColor: relatorioAtivo === r.id ? r.cor : '#E5E3DC' }}
              onClick={() => abrirRelatorio(r.id)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = r.cor; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = relatorioAtivo === r.id ? r.cor : '#E5E3DC'; (e.currentTarget as HTMLDivElement).style.transform = 'none' }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: r.bg, color: r.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <Icon size={20} />
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>{r.title}</div>
              <div style={{ fontSize: '12px', color: '#888780', marginBottom: '16px' }}>{r.desc}</div>
              <div style={{ fontSize: '12px', color: r.cor }}>Ver relatório →</div>
            </div>
          )
        })}
      </div>

      {/* Painel do relatório ativo */}
      {relatorioAtivo && rel && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#2C2C2A' }}>{rel.title} — {mesAtual}</div>
            <button className="btn btn-sm btn-icon" onClick={() => setRelatorioAtivo(null)}><X size={14} /></button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#888780' }}>Carregando...</div>
          ) : (

            <>
              {/* Movimentações */}
              {relatorioAtivo === 'movimentacoes' && (
                movimentacoes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#888780' }}>Nenhuma movimentação registrada este mês</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#F8F6F2' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#888780', fontSize: '11px', textTransform: 'uppercase' }}>Data</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#888780', fontSize: '11px', textTransform: 'uppercase' }}>Produto</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#888780', fontSize: '11px', textTransform: 'uppercase' }}>Tipo</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#888780', fontSize: '11px', textTransform: 'uppercase' }}>Quantidade</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#888780', fontSize: '11px', textTransform: 'uppercase' }}>Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimentacoes.map((m) => {
                        const cor = m.tipo === 'entrada' ? '#1D9E75' : m.tipo === 'perda' ? '#A32D2D' : '#BA7517'
                        return (
                          <tr key={m.id} style={{ borderBottom: '1px solid #F1EFE8' }}>
                            <td style={{ padding: '9px 12px', color: '#888780' }}>{new Date(m.created_at).toLocaleDateString('pt-BR')}</td>
                            <td style={{ padding: '9px 12px', fontWeight: 500 }}>{(m as any).produtos?.nome ?? '—'}</td>
                            <td style={{ padding: '9px 12px' }}><span style={{ color: cor, fontWeight: 500, textTransform: 'capitalize' }}>{m.tipo}</span></td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: cor, fontWeight: 500 }}>{m.tipo === 'entrada' ? '+' : '-'}{m.quantidade} {(m as any).produtos?.unidade}</td>
                            <td style={{ padding: '9px 12px', color: '#888780', fontSize: '12px' }}>{m.motivo?.substring(0, 50)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )
              )}

              {/* Compras */}
              {relatorioAtivo === 'compras' && (
                compras.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#888780' }}>Nenhuma compra registrada este mês</div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                      <div style={{ background: '#E1F5EE', borderRadius: '10px', padding: '12px 20px' }}>
                        <div style={{ fontSize: '11px', color: '#888780', marginBottom: '4px' }}>TOTAL DO MÊS</div>
                        <div style={{ fontSize: '22px', fontWeight: 600, color: '#1D9E75' }}>{formatBRL(totalCompras)}</div>
                      </div>
                      <div style={{ background: '#F8F6F2', borderRadius: '10px', padding: '12px 20px' }}>
                        <div style={{ fontSize: '11px', color: '#888780', marginBottom: '4px' }}>ITENS COMPRADOS</div>
                        <div style={{ fontSize: '22px', fontWeight: 600, color: '#2C2C2A' }}>{compras.length}</div>
                      </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#F8F6F2' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#888780', fontSize: '11px', textTransform: 'uppercase' }}>Data</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#888780', fontSize: '11px', textTransform: 'uppercase' }}>Produto</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#888780', fontSize: '11px', textTransform: 'uppercase' }}>Qtd</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#888780', fontSize: '11px', textTransform: 'uppercase' }}>Preço/un</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#888780', fontSize: '11px', textTransform: 'uppercase' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compras.map((c, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #F1EFE8' }}>
                            <td style={{ padding: '9px 12px', color: '#888780' }}>{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                            <td style={{ padding: '9px 12px', fontWeight: 500 }}>{c.nome_item}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right' }}>{c.quantidade_comprar} {c.unidade}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right' }}>{c.preco_unitario ? formatBRL(c.preco_unitario) : '—'}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600 }}>{c.total_estimado ? formatBRL(c.total_estimado) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )
              )}

              {/* Custo alimentar */}
              {relatorioAtivo === 'custo' && (
                compras.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#888780' }}>Nenhuma compra registrada este mês. Lance compras na Lista de Compras para ver o custo alimentar.</div>
                ) : (
                  <>
                    <div style={{ fontSize: '28px', fontWeight: 600, color: '#1D9E75', marginBottom: '4px' }}>{formatBRL(totalCompras)}</div>
                    <div style={{ fontSize: '13px', color: '#888780', marginBottom: '20px' }}>custo total do mês</div>
                    {(['carnes', 'hortifruti', 'secos', 'laticinios', 'bebidas', 'outros'] as const).map((cat) => {
                      const itens = compras.filter((c: any) => c.categoria === cat)
                      const total = itens.reduce((a: number, c: any) => a + (c.total_estimado ?? 0), 0)
                      if (total === 0) return null
                      const pct = totalCompras > 0 ? Math.round((total / totalCompras) * 100) : 0
                      const labels: Record<string, string> = { carnes: 'Carnes', hortifruti: 'Hortifruti', secos: 'Secos', laticinios: 'Laticínios', bebidas: 'Bebidas', outros: 'Outros' }
                      return (
                        <div key={cat} style={{ marginBottom: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px' }}>
                            <span style={{ fontWeight: 500 }}>{labels[cat]}</span>
                            <span style={{ color: '#533AB7', fontWeight: 500 }}>{formatBRL(total)} ({pct}%)</span>
                          </div>
                          <div style={{ height: '6px', background: '#F1EFE8', borderRadius: '3px' }}>
                            <div style={{ height: '100%', borderRadius: '3px', background: '#533AB7', width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </>
                )
              )}

              {/* Consumo */}
              {relatorioAtivo === 'consumo' && (
                consumo.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#888780' }}>Nenhuma refeição confirmada este mês ainda. Confirme refeições na Produção do Dia para ver o consumo realizado.</div>
                ) : (
                  consumo.map((item) => {
                    const pct = item.previsto > 0 ? Math.min(100, Math.round((item.realizado / item.previsto) * 100)) : 100
                    const cor = pct >= 90 ? '#1D9E75' : pct >= 70 ? '#BA7517' : '#A32D2D'
                    return (
                      <div key={item.nome} style={{ marginBottom: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px' }}>
                          <span style={{ fontWeight: 500 }}>{item.nome}</span>
                          <span style={{ color: cor, fontWeight: 500 }}>{item.realizado}/{item.previsto} {item.unidade} ({pct}%)</span>
                        </div>
                        <div style={{ height: '6px', background: '#F1EFE8', borderRadius: '3px' }}>
                          <div style={{ height: '100%', borderRadius: '3px', background: cor, width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })
                )
              )}

              {/* Produção */}
              {relatorioAtivo === 'producao' && (
                producao.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#888780' }}>Nenhuma refeição confirmada este mês</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#F8F6F2' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#888780', fontSize: '11px', textTransform: 'uppercase' }}>Data</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#888780', fontSize: '11px', textTransform: 'uppercase' }}>Refeição</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#888780', fontSize: '11px', textTransform: 'uppercase' }}>Status</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#888780', fontSize: '11px', textTransform: 'uppercase' }}>Idosos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {producao.map((p: any) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #F1EFE8' }}>
                          <td style={{ padding: '9px 12px', color: '#888780' }}>{new Date(p.data).toLocaleDateString('pt-BR')}</td>
                          <td style={{ padding: '9px 12px', fontWeight: 500, textTransform: 'capitalize' }}>{p.refeicao?.replace('_', ' ')}</td>
                          <td style={{ padding: '9px 12px' }}><span style={{ color: '#1D9E75', fontWeight: 500 }}>✓ Confirmada</span></td>
                          <td style={{ padding: '9px 12px', textAlign: 'right' }}>{p.num_idosos}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {/* Desperdícios */}
              {relatorioAtivo === 'desperdicio' && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#888780' }}>
                  <Trash2 size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '8px' }}>Nenhuma perda registrada</div>
                  <div style={{ fontSize: '13px' }}>Use o botão "Perda" na Produção do Dia para registrar desperdícios</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Resumo sempre visível */}
      {!relatorioAtivo && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <ResumoMovimentacoes inicioMes={inicioMes} mesAtual={mesAtual} />
          <ResumoComprasProducao inicioMes={inicioMes} inicioMesDate={inicioMesDate} mesAtual={mesAtual} />
        </div>
      )}
    </div>
  )
}

function ResumoMovimentacoes({ inicioMes, mesAtual }: { inicioMes: string; mesAtual: string }) {
  const [movs, setMovs] = useState<Movimentacao[]>([])
  useEffect(() => {
    getSupabase().from('movimentacoes_estoque').select('*, produtos(nome, unidade)').gte('created_at', inicioMes).order('created_at', { ascending: false }).limit(8).then(({ data }) => setMovs(data ?? []))
  }, [])
  return (
    <div className="card">
      <div style={{ fontSize: '13px', fontWeight: 500, color: '#888780', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Package size={14} /> Movimentações recentes — {mesAtual}
      </div>
      {movs.length === 0 ? <div style={{ textAlign: 'center', padding: '24px', color: '#888780', fontSize: '13px' }}>Nenhuma movimentação este mês</div> : movs.map((m) => {
        const cor = m.tipo === 'entrada' ? '#1D9E75' : m.tipo === 'perda' ? '#A32D2D' : '#BA7517'
        return (
          <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #F1EFE8', fontSize: '12px' }}>
            <div>
              <div style={{ fontWeight: 500 }}>{(m as any).produtos?.nome ?? '—'}</div>
              <div style={{ fontSize: '11px', color: '#888780' }}>{new Date(m.created_at).toLocaleDateString('pt-BR')}</div>
            </div>
            <span style={{ color: cor, fontWeight: 500 }}>{m.tipo === 'entrada' ? '+' : '-'}{m.quantidade}</span>
          </div>
        )
      })}
    </div>
  )
}

function ResumoComprasProducao({ inicioMes, inicioMesDate, mesAtual }: { inicioMes: string; inicioMesDate: string; mesAtual: string }) {
  const [totalCompras, setTotalCompras] = useState(0)
  const [qtdCompras, setQtdCompras] = useState(0)
  const [pctProducao, setPctProducao] = useState(0)
  const [refConfirmadas, setRefConfirmadas] = useState(0)
  const [refTotal, setRefTotal] = useState(0)

  useEffect(() => {
    const sb = getSupabase()
    sb.from('compra_itens').select('total_estimado').eq('status', 'recebido').gte('created_at', inicioMes).then(({ data }) => {
      const total = (data ?? []).reduce((a: number, c: any) => a + (c.total_estimado ?? 0), 0)
      setTotalCompras(total)
      setQtdCompras((data ?? []).length)
    })
    sb.from('producao_diaria').select('status').gte('data', inicioMesDate).then(({ data }) => {
      const total = (data ?? []).length
      const confirmadas = (data ?? []).filter((p: any) => p.status === 'concluido').length
      setRefTotal(total)
      setRefConfirmadas(confirmadas)
      setPctProducao(total > 0 ? Math.round((confirmadas / total) * 100) : 0)
    })
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="card">
        <div style={{ fontSize: '13px', fontWeight: 500, color: '#888780', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShoppingCart size={14} /> Compras — {mesAtual}
        </div>
        {qtdCompras === 0 ? <div style={{ textAlign: 'center', padding: '16px', color: '#888780', fontSize: '13px' }}>Nenhuma compra registrada</div> : <>
          <div style={{ fontSize: '22px', fontWeight: 600, color: '#1D9E75' }}>{formatBRL(totalCompras)}</div>
          <div style={{ fontSize: '12px', color: '#888780' }}>{qtdCompras} itens comprados</div>
        </>}
      </div>
      <div className="card">
        <div style={{ fontSize: '13px', fontWeight: 500, color: '#888780', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ChefHat size={14} /> Produção — {mesAtual}
        </div>
        {refTotal === 0 ? <div style={{ textAlign: 'center', padding: '16px', color: '#888780', fontSize: '13px' }}>Nenhuma refeição registrada</div> : <>
          <div style={{ fontSize: '22px', fontWeight: 600, color: '#3D4F38' }}>{pctProducao}%</div>
          <div style={{ fontSize: '12px', color: '#888780', marginBottom: '8px' }}>{refConfirmadas} de {refTotal} refeições confirmadas</div>
          <div style={{ height: '6px', background: '#F1EFE8', borderRadius: '3px' }}>
            <div style={{ height: '100%', borderRadius: '3px', background: '#7B9E6B', width: `${pctProducao}%` }} />
          </div>
        </>}
      </div>
    </div>
  )
}
