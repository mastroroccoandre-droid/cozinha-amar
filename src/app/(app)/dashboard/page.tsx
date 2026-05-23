'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, AlertTriangle, TrendingUp, ChefHat } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { MetricCard, Alert, SectionHeader, Badge } from '@/components/ui'
import { getStatusEstoque } from '@/lib/utils'
import type { Produto, Cardapio } from '@/types'

const REFEICAO_LABELS: Record<string, string> = {
  cafe_manha: 'Café da manhã',
  colacao: 'Colação',
  almoco: 'Almoço',
  lanche_tarde: 'Lanche',
  jantar: 'Jantar',
  ceia: 'Ceia',
}

const REFEICAO_ORDER = ['cafe_manha', 'colacao', 'almoco', 'lanche_tarde', 'jantar', 'ceia']
const DIAS = [
  { short: 'Seg', label: 'Segunda' },
  { short: 'Ter', label: 'Terça' },
  { short: 'Qua', label: 'Quarta' },
  { short: 'Qui', label: 'Quinta' },
  { short: 'Sex', label: 'Sexta' },
  { short: 'Sáb', label: 'Sábado' },
  { short: 'Dom', label: 'Domingo' },
]

interface DashboardData {
  numIdosos: number
  produtosBaixos: Produto[]
  cardapioSemana: Cardapio[]
  totalProdutos: number
}

function limparDescricao(desc: string) {
  return desc
    .split('\n')
    .map(l => l.replace(/^-\s*/, '').trim())
    .filter(Boolean)
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = getSupabase()

      const [configRes, produtosRes, cardapioRes] = await Promise.all([
        supabase.from('configuracoes').select('*').single(),
        supabase.from('produtos').select('*').eq('ativo', true).order('nome'),
        supabase.from('cardapio').select('*').eq('semana', 1).order('dia_semana').order('refeicao'),
      ])
      const produtos: Produto[] = produtosRes.data ?? []
      setData({
        numIdosos: configRes.data?.num_idosos ?? 42,
        produtosBaixos: produtos.filter(p => getStatusEstoque(p) !== 'ok'),
        cardapioSemana: cardapioRes.data ?? [],
        totalProdutos: produtos.length,
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
        <div style={{ textAlign: 'center', color: '#888780' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
          <div>Carregando...</div>
        </div>
      </div>
    )
  }

  if (!data) return null
  const { numIdosos, produtosBaixos } = data

  return (
    <div style={{ maxWidth: '1100px' }}>

      {/* ── MÉTRICAS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <MetricCard
          label="Estoque baixo"
          value={produtosBaixos.length}
          sub="itens abaixo do mínimo"
          icon={<AlertTriangle size={13} />}
          color={produtosBaixos.length > 0 ? '#BA7517' : undefined}
          onClick={() => router.push('/estoque')}
        />
        <MetricCard
          label="Total no estoque"
          value={data.totalProdutos}
          sub="produtos cadastrados"
          icon={<TrendingUp size={13} />}
          onClick={() => router.push('/estoque')}
        />
      </div>

      {/* ── LINHA 2: ALERTAS + PRODUÇÃO ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>

        {/* Alertas */}
        <div className="card">
          <SectionHeader title="Alertas de estoque" subtitle="Itens abaixo do mínimo" />
          {produtosBaixos.length === 0 ? (
            <Alert variant="green">✅ Estoque em ordem!</Alert>
          ) : (
            produtosBaixos.slice(0, 5).map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E5E3DC', fontSize: '13px' }}>
                <span style={{ fontWeight: 500, color: '#2C2C2A' }}>{p.nome}</span>
                <span style={{ color: '#BA7517', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                  {p.quantidade_atual} / {p.estoque_minimo} {p.unidade}
                </span>
              </div>
            ))
          )}
          {produtosBaixos.length > 5 && (
            <div style={{ fontSize: '12px', color: '#888780', marginTop: '8px', cursor: 'pointer' }} onClick={() => router.push('/estoque')}>
              +{produtosBaixos.length - 5} itens → ver estoque
            </div>
          )}
        </div>

        {/* Produção do dia */}
        <div className="card">
          <SectionHeader
            title="Produção de hoje"
            subtitle="Checklist da cozinha"
            action={
              <button className="btn btn-sm btn-primary" onClick={() => router.push('/producao')}>
                <ChefHat size={13} /> Abrir
              </button>
            }
          />
          {REFEICAO_ORDER.map((r, i) => (
            <div key={r} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < 5 ? '1px solid #E5E3DC' : 'none' }}>
              <span style={{ fontSize: '13px', color: '#2C2C2A' }}>{REFEICAO_LABELS[r]}</span>
              <Badge variant={i < 1 ? 'green' : 'gray'}>{i < 1 ? 'Confirmado' : 'Pendente'}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* ── CARDÁPIO DA SEMANA ── */}
      <div className="card">
        <SectionHeader
          title="Cardápio — Semana 1"
          subtitle="Almoço e jantar dos 7 dias"
          action={<button className="btn btn-sm" onClick={() => router.push('/cardapio')}>Ver cardápio completo</button>}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
          {DIAS.map((dia, idx) => {
            const almoco = data.cardapioSemana.find(c => c.dia_semana === idx && c.refeicao === 'almoco')
            const jantar = data.cardapioSemana.find(c => c.dia_semana === idx && c.refeicao === 'jantar')
            const almocoLinhas = almoco ? limparDescricao(almoco.descricao) : []
            const jantarLinhas = jantar ? limparDescricao(jantar.descricao) : []

            return (
              <div key={dia.short} style={{ background: '#FAFAF8', borderRadius: '10px', padding: '10px', border: '1px solid #E5E3DC' }}>
                <div style={{
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: idx === new Date().getDay() - 1 ? '#0F6E56' : '#888780',
                  background: idx === new Date().getDay() - 1 ? '#E1F5EE' : 'transparent',
                  borderRadius: '6px',
                  padding: '3px 0',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {dia.short}
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '9px', color: '#888780', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px', fontWeight: 600 }}>Almoço</div>
                  {almocoLinhas.slice(0, 3).map((linha, i) => (
                    <div key={i} style={{ fontSize: '11px', color: '#2C2C2A', lineHeight: 1.4, marginBottom: '1px' }}>
                      {linha}
                    </div>
                  ))}
                  {almocoLinhas.length > 3 && (
                    <div style={{ fontSize: '10px', color: '#888780' }}>+{almocoLinhas.length - 3} itens</div>
                  )}
                </div>

                <div style={{ height: '1px', background: '#E5E3DC', marginBottom: '8px' }} />

                <div>
                  <div style={{ fontSize: '9px', color: '#888780', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px', fontWeight: 600 }}>Jantar</div>
                  {jantarLinhas.slice(0, 2).map((linha, i) => (
                    <div key={i} style={{ fontSize: '11px', color: '#5F5E5A', lineHeight: 1.4, marginBottom: '1px' }}>
                      {linha}
                    </div>
                  ))}
                  {jantarLinhas.length > 2 && (
                    <div style={{ fontSize: '10px', color: '#888780' }}>+{jantarLinhas.length - 2} itens</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
