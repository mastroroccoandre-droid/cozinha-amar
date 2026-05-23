'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, AlertTriangle, Clock, TrendingUp,
  ShoppingCart, Package, ChefHat, ArrowRight
} from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import {
  MetricCard, Alert, SectionHeader, Badge, ProgressBar
} from '@/components/ui'
import {
  formatDate, formatBRL, getDiasParaVencer,
  getStatusEstoque, REFEICAO_LABELS, REFEICAO_ORDER, DIAS_SEMANA_SHORT
} from '@/lib/utils'
import type { Produto, Cardapio } from '@/types'

interface DashboardData {
  numIdosos: number
  produtosBaixos: Produto[]
  produtosVencendo: Produto[]
  cardapioSemana: Cardapio[]
  totalComprasPendentes: number
  custoMensal: number
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
      const hoje = new Date()

      setData({
        numIdosos: configRes.data?.num_idosos ?? 42,
        produtosBaixos: produtos.filter(p => getStatusEstoque(p) !== 'ok'),
        produtosVencendo: produtos.filter(p => {
          const dias = getDiasParaVencer(p.data_validade)
          return dias !== null && dias >= 0 && dias <= 7
        }),
        cardapioSemana: cardapioRes.data ?? [],
        totalComprasPendentes: 3,
        custoMensal: 18420,
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
          <div>Carregando dashboard...</div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { numIdosos, produtosBaixos, produtosVencendo } = data

  return (
    <div>
      {/* Métricas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <MetricCard
          label="Idosos ativos"
          value={numIdosos}
          sub="residentes"
          icon={<Users size={13} />}
        />
        <MetricCard
          label="Estoque baixo"
          value={produtosBaixos.length}
          sub="itens abaixo do mínimo"
          icon={<AlertTriangle size={13} />}
          color={produtosBaixos.length > 0 ? '#BA7517' : undefined}
          onClick={() => router.push('/estoque')}
        />
        <MetricCard
          label="Próx. vencer"
          value={produtosVencendo.length}
          sub="vencendo em 7 dias"
          icon={<Clock size={13} />}
          color={produtosVencendo.length > 0 ? '#A32D2D' : undefined}
          onClick={() => router.push('/estoque')}
        />
        <MetricCard
          label="Custo mensal"
          value={formatBRL(data.custoMensal)}
          sub="alimentação"
          icon={<TrendingUp size={13} />}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Alertas */}
        <div>
          <SectionHeader title="Alertas" subtitle="Atenção necessária agora" />

          {produtosBaixos.length === 0 && produtosVencendo.length === 0 ? (
            <Alert variant="green">
              ✅ Tudo em ordem! Nenhum alerta no momento.
            </Alert>
          ) : (
            <>
              {produtosBaixos.slice(0, 4).map((p) => (
                <Alert key={p.id} variant="amber">
                  <strong>{p.nome}</strong> — estoque baixo ({p.quantidade_atual} {p.unidade} / mínimo {p.estoque_minimo} {p.unidade})
                </Alert>
              ))}
              {produtosVencendo.slice(0, 3).map((p) => (
                <Alert key={p.id} variant="red">
                  <strong>{p.nome}</strong> — vence em {getDiasParaVencer(p.data_validade)} dias ({p.data_validade ? formatDate(p.data_validade) : '—'})
                </Alert>
              ))}
            </>
          )}

          {/* Produção do dia */}
          <div style={{ marginTop: '16px' }}>
            <SectionHeader
              title="Produção de hoje"
              subtitle="Semana 1 · Checklist da cozinha"
              action={
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => router.push('/producao')}
                >
                  <ChefHat size={13} />
                  Abrir
                </button>
              }
            />
            <div className="card-sm">
              {REFEICAO_ORDER.slice(0, 4).map((r, i) => (
                <div
                  key={r}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: i < 3 ? '1px solid #E5E3DC' : 'none',
                  }}
                >
                  <span style={{ fontSize: '13px' }}>{REFEICAO_LABELS[r]}</span>
                  <Badge variant={i < 1 ? 'green' : 'gray'}>
                    {i < 1 ? 'Confirmado' : 'Pendente'}
                  </Badge>
                </div>
              ))}
              <div style={{ marginTop: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: '#888780',
                    marginBottom: '6px',
                  }}
                >
                  <span>Progresso</span>
                  <span>1 / 6 refeições</span>
                </div>
                <ProgressBar value={1} max={6} />
              </div>
            </div>
          </div>
        </div>

        {/* Cardápio da semana */}
        <div>
          <SectionHeader
            title="Cardápio — Semana 1"
            subtitle="Visão rápida dos 7 dias"
            action={
              <button className="btn btn-sm" onClick={() => router.push('/cardapio')}>
                Ver completo
              </button>
            }
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {DIAS_SEMANA_SHORT.map((dia, idx) => {
              const almoco = data.cardapioSemana.find(
                (c) => c.dia_semana === idx && c.refeicao === 'almoco'
              )
              const jantar = data.cardapioSemana.find(
                (c) => c.dia_semana === idx && c.refeicao === 'jantar'
              )
              return (
                <div
                  key={dia}
                  className="card-sm"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 12px',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      background: idx === 0 ? '#E1F5EE' : '#F1EFE8',
                      color: idx === 0 ? '#0F6E56' : '#5F5E5A',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {dia}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: '#888780' }}>Almoço</div>
                    <div
                      style={{
                        fontSize: '12px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {almoco?.descricao?.split(',')[0] ?? '—'}
                    </div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: '#888780' }}>Jantar</div>
                    <div
                      style={{
                        fontSize: '12px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '120px',
                      }}
                    >
                      {jantar?.descricao?.split(',')[0] ?? '—'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
