'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Trash2, Package, ShoppingCart, TrendingDown, ChefHat } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { SectionHeader, MetricCard } from '@/components/ui'
import { formatBRL } from '@/lib/utils'

interface Movimentacao {
  id: string
  tipo: string
  quantidade: number
  motivo: string
  created_at: string
  produto_id: string
  produtos?: { nome: string; unidade: string }
}

interface CompraItem {
  nome_item: string
  quantidade_comprar: number
  unidade: string
  preco_unitario: number
  total_estimado: number
  created_at: string
}

interface ProducaoDiaria {
  data: string
  refeicao: string
  status: string
}

const RELATORIOS = [
  { icon: BarChart3, title: 'Consumo mensal', desc: 'Previsto vs realizado por produto', cor: '#185FA5', bg: '#E6F1FB' },
  { icon: Trash2, title: 'Desperdícios', desc: 'Perdas por refeição e período', cor: '#A32D2D', bg: '#FCEBEB' },
  { icon: Package, title: 'Movimentações de estoque', desc: 'Entradas, saídas e ajustes', cor: '#1D9E75', bg: '#E1F5EE' },
  { icon: ShoppingCart, title: 'Histórico de compras', desc: 'Por fornecedor e período', cor: '#BA7517', bg: '#FAEEDA' },
  { icon: TrendingDown, title: 'Custo alimentar', desc: 'Custo por idoso e mensal', cor: '#533AB7', bg: '#EEEDFE' },
  { icon: ChefHat, title: 'Produção diária', desc: 'Refeições confirmadas por dia', cor: '#1D9E75', bg: '#E1F5EE' },
]

export default function RelatoriosPage() {
  const mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([])
  const [compras, setCompras] = useState<CompraItem[]>([])
  const [producao, setProducao] = useState<ProducaoDiaria[]>([])
  const [totalCompras, setTotalCompras] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      const supabase = getSupabase()
      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const [movRes, comprasRes, prodRes] = await Promise.all([
        supabase
          .from('movimentacoes_estoque')
          .select('*, produtos(nome, unidade)')
          .gte('created_at', inicioMes)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('compra_itens')
          .select('*')
          .eq('status', 'recebido')
          .gte('created_at', inicioMes),
        supabase
          .from('producao_diaria')
          .select('*')
          .gte('data', inicioMes.split('T')[0])
          .order('data', { ascending: false }),
      ])

      const comprasData = comprasRes.data ?? []
      const total = comprasData.reduce((a: number, c: any) => a + (c.total_estimado ?? 0), 0)

      setMovimentacoes(movRes.data ?? [])
      setCompras(comprasData)
      setTotalCompras(total)
      setProducao(prodRes.data ?? [])
      setLoading(false)
    }
    carregar()
  }, [])

  const refConfirmadas = producao.filter(p => p.status === 'concluido').length
  const refTotal = producao.length
  const pctProducao = refTotal > 0 ? Math.round((refConfirmadas / refTotal) * 100) : 0

  return (
    <div>
      <SectionHeader
        title="Relatórios"
        subtitle={`Dados nutricionais e operacionais — ${mesAtual}`}
      />

      {/* Cards de relatórios */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        {RELATORIOS.map((rel, idx) => {
          const Icon = rel.icon
          return (
            <div key={idx} className="card" style={{ cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = rel.cor; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#E5E3DC'; (e.currentTarget as HTMLDivElement).style.transform = 'none' }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: rel.bg, color: rel.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <Icon size={20} />
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>{rel.title}</div>
              <div style={{ fontSize: '12px', color: '#888780', marginBottom: '16px' }}>{rel.desc}</div>
              <div style={{ fontSize: '12px', color: rel.cor }}>Em breve →</div>
            </div>
          )
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888780' }}>Carregando dados...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* Movimentações recentes */}
          <div className="card">
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#888780', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Package size={14} />
              Movimentações de estoque — {mesAtual}
            </div>
            {movimentacoes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#888780', fontSize: '13px' }}>
                Nenhuma movimentação registrada este mês
              </div>
            ) : (
              movimentacoes.map((m) => {
                const cor = m.tipo === 'entrada' ? '#1D9E75' : m.tipo === 'perda' ? '#A32D2D' : '#BA7517'
                const data = new Date(m.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F1EFE8', fontSize: '13px' }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{(m as any).produtos?.nome ?? 'Produto'}</div>
                      <div style={{ fontSize: '11px', color: '#888780' }}>{m.motivo?.substring(0, 40)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: cor, fontWeight: 500 }}>{m.tipo === 'entrada' ? '+' : '-'}{m.quantidade} {(m as any).produtos?.unidade}</div>
                      <div style={{ fontSize: '11px', color: '#888780' }}>{data}</div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Compras do mês */}
            <div className="card">
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#888780', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShoppingCart size={14} />
                Compras registradas — {mesAtual}
              </div>
              {compras.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px', color: '#888780', fontSize: '13px' }}>
                  Nenhuma compra registrada este mês
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '24px', fontWeight: 600, color: '#1D9E75', marginBottom: '4px' }}>
                    {formatBRL(totalCompras)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888780', marginBottom: '12px' }}>
                    {compras.length} {compras.length === 1 ? 'item comprado' : 'itens comprados'}
                  </div>
                  {compras.slice(0, 5).map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1EFE8', fontSize: '12px' }}>
                      <span>{c.nome_item}</span>
                      <span style={{ fontWeight: 500 }}>{c.total_estimado ? formatBRL(c.total_estimado) : '—'}</span>
                    </div>
                  ))}
                  {compras.length > 5 && (
                    <div style={{ fontSize: '11px', color: '#888780', marginTop: '8px' }}>+{compras.length - 5} itens</div>
                  )}
                </>
              )}
            </div>

            {/* Produção do mês */}
            <div className="card">
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#888780', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ChefHat size={14} />
                Produção confirmada — {mesAtual}
              </div>
              {refTotal === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px', color: '#888780', fontSize: '13px' }}>
                  Nenhuma refeição registrada este mês
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '24px', fontWeight: 600, color: '#3D4F38', marginBottom: '4px' }}>
                    {pctProducao}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#888780', marginBottom: '12px' }}>
                    {refConfirmadas} de {refTotal} refeições confirmadas
                  </div>
                  <div style={{ height: '8px', background: '#F1EFE8', borderRadius: '4px' }}>
                    <div style={{ height: '100%', borderRadius: '4px', background: '#7B9E6B', width: `${pctProducao}%`, transition: 'width 0.4s' }} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
