'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Trash2, Package, ShoppingCart, TrendingDown, Clock } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { SectionHeader, ProgressBar } from '@/components/ui'
import { formatBRL } from '@/lib/utils'

interface ConsumoItem {
  nome: string
  previsto: number
  realizado: number
  unidade: string
}

const CONSUMO_MOCK: ConsumoItem[] = [
  { nome: 'Arroz branco', previsto: 252, realizado: 248, unidade: 'kg' },
  { nome: 'Feijão carioca', previsto: 90, realizado: 88, unidade: 'kg' },
  { nome: 'Frango', previsto: 180, realizado: 176, unidade: 'kg' },
  { nome: 'Leite integral', previsto: 210, realizado: 205, unidade: 'L' },
  { nome: 'Pão integral', previsto: 1470, realizado: 1430, unidade: 'un' },
  { nome: 'Frutas', previsto: 840, realizado: 820, unidade: 'un' },
  { nome: 'Óleo de soja', previsto: 24, realizado: 22, unidade: 'L' },
  { nome: 'Açúcar', previsto: 18, realizado: 17, unidade: 'kg' },
]

const RELATORIOS = [
  { icon: BarChart3, title: 'Consumo mensal', desc: 'Previsto vs realizado por produto', cor: '#185FA5', bg: '#E6F1FB' },
  { icon: Trash2, title: 'Desperdícios', desc: 'Perdas por refeição e período', cor: '#A32D2D', bg: '#FCEBEB' },
  { icon: Package, title: 'Movimentações de estoque', desc: 'Entradas, saídas e ajustes', cor: '#1D9E75', bg: '#E1F5EE' },
  { icon: ShoppingCart, title: 'Histórico de compras', desc: 'Por fornecedor e período', cor: '#BA7517', bg: '#FAEEDA' },
  { icon: TrendingDown, title: 'Custo alimentar', desc: 'Custo por idoso e mensal', cor: '#533AB7', bg: '#EEEDFE' },
  { icon: Clock, title: 'Produtos vencendo', desc: 'Próximos 30 dias', cor: '#A32D2D', bg: '#FCEBEB' },
]

export default function RelatoriosPage() {
  const mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div>
      <SectionHeader
        title="Relatórios"
        subtitle={`Dados nutricionais e operacionais — ${mesAtual}`}
      />

      {/* Cards de relatórios */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '12px',
          marginBottom: '28px',
        }}
      >
        {RELATORIOS.map((rel, idx) => {
          const Icon = rel.icon
          return (
            <div
              key={idx}
              className="card"
              style={{ cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLDivElement).style.borderColor = rel.cor
                ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLDivElement).style.borderColor = '#E5E3DC'
                ;(e.currentTarget as HTMLDivElement).style.transform = 'none'
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: rel.bg,
                  color: rel.cor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}
              >
                <Icon size={20} />
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>{rel.title}</div>
              <div style={{ fontSize: '12px', color: '#888780', marginBottom: '16px' }}>{rel.desc}</div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: rel.cor,
                }}
              >
                Gerar relatório →
              </div>
            </div>
          )
        })}
      </div>

      {/* Consumo previsto vs realizado */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="card">
          <div
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: '#888780',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <BarChart3 size={14} />
            Consumo — Previsto vs Realizado
          </div>

          {CONSUMO_MOCK.map((item) => {
            const pct = Math.round((item.realizado / item.previsto) * 100)
            const cor = pct >= 97 ? '#1D9E75' : pct >= 90 ? '#BA7517' : '#A32D2D'

            return (
              <div key={item.nome} style={{ marginBottom: '14px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '5px',
                    fontSize: '13px',
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{item.nome}</span>
                  <span style={{ color: cor, fontWeight: 500 }}>
                    {item.realizado}/{item.previsto} {item.unidade} ({pct}%)
                  </span>
                </div>
                <div style={{ height: '6px', background: '#F1EFE8', borderRadius: '3px' }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: '3px',
                      background: cor,
                      width: `${pct}%`,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Custo por refeição */}
        <div>
          <div className="card" style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#888780', marginBottom: '16px' }}>
              Custo alimentar — {mesAtual}
            </div>

            {[
              { label: 'Custo total', valor: 18420, destaque: true },
              { label: 'Por idoso/dia', valor: 14.62, destaque: false },
              { label: 'Por refeição/idoso', valor: 2.44, destaque: false },
              { label: 'Hortifruti', valor: 3240, destaque: false },
              { label: 'Carnes', valor: 6800, destaque: false },
              { label: 'Secos', valor: 4200, destaque: false },
              { label: 'Laticínios', valor: 2800, destaque: false },
              { label: 'Outros', valor: 1380, destaque: false },
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '7px 0',
                  borderBottom: '1px solid #E5E3DC',
                  fontSize: row.destaque ? '15px' : '13px',
                  fontWeight: row.destaque ? 600 : 400,
                }}
              >
                <span style={{ color: row.destaque ? '#2C2C2A' : '#5F5E5A' }}>{row.label}</span>
                <span style={{ color: row.destaque ? '#1D9E75' : '#2C2C2A' }}>
                  {formatBRL(row.valor)}
                </span>
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#888780', marginBottom: '12px' }}>
              Desperdícios registrados
            </div>
            <div style={{ fontSize: '28px', fontWeight: 500, color: '#BA7517', marginBottom: '4px' }}>
              2,4%
            </div>
            <div style={{ fontSize: '12px', color: '#888780', marginBottom: '12px' }}>
              do total produzido — abaixo da meta de 5%
            </div>
            <div style={{ height: '8px', background: '#F1EFE8', borderRadius: '4px' }}>
              <div
                style={{ height: '100%', borderRadius: '4px', background: '#1D9E75', width: '52%' }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#888780',
                marginTop: '4px',
              }}
            >
              <span>0%</span>
              <span>Meta: 5%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
