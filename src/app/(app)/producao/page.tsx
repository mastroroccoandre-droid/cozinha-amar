'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, Clock, AlertTriangle, ChefHat } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { Modal, Alert, SectionHeader } from '@/components/ui'
import {
  REFEICAO_LABELS, REFEICAO_HORARIOS, REFEICAO_ORDER,
  getSemanaCardapio, getDiaSemanaCardapio, DIAS_SEMANA
} from '@/lib/utils'
import toast from 'react-hot-toast'
import type { RefeicaoTipo } from '@/types'

interface Ingrediente {
  nome: string
  quantidade: number
  unidade: string
}

interface RefeicaoProducao {
  tipo: RefeicaoTipo
  descricao: string
  ingredientes: Ingrediente[]
  confirmada: boolean
  observacoes: string
}

export default function ProducaoPage() {
  const hoje = new Date()
  const semana = getSemanaCardapio(hoje)
  const diaSemana = getDiaSemanaCardapio(hoje)

  const [refeicoes, setRefeicoes] = useState<RefeicaoProducao[]>([])
  const [numIdosos, setNumIdosos] = useState(42)
  const [loading, setLoading] = useState(true)
  const [modalPerda, setModalPerda] = useState<{ open: boolean; refeicao?: string }>({ open: false })
  const [salvando, setSalvando] = useState(false)

  const carregarProducao = useCallback(async () => {
    const supabase = getSupabase()

    const { data: config } = await supabase.from('configuracoes').select('num_idosos').single()
    const nIdosos = config?.num_idosos ?? 42
    setNumIdosos(nIdosos)

    const { data: cardapioItems } = await supabase
      .from('cardapio')
      .select('*')
      .eq('semana', semana)
      .eq('dia_semana', diaSemana)

    const { data: todasPreparacoes } = await supabase
      .from('preparacoes')
      .select('*, ingredientes:preparacao_ingredientes(*)')
    
    const padrao = `Sem${semana}/Dia${diaSemana}`
    const preparacoes = (todasPreparacoes ?? []).filter((p: any) => p.nome.includes(padrao))

    // Busca refeições já confirmadas hoje
    const dataHoje = hoje.toISOString().split('T')[0]
    const { data: confirmadas } = await supabase
      .from('producao_diaria')
      .select('refeicao')
      .eq('data', dataHoje)
      .eq('status', 'concluido')

    const refConfirmadasHoje = new Set((confirmadas ?? []).map((c: any) => c.refeicao))

    const refeicoesData: RefeicaoProducao[] = REFEICAO_ORDER.map((tipo) => {
      const cardapioItem = cardapioItems?.find((c: any) => c.refeicao === tipo)
      const prep = preparacoes?.find((p: any) => p.tipo_refeicao === tipo)

      let ingredientes: Ingrediente[] = []

      if (prep && prep.ingredientes && prep.ingredientes.length > 0) {
        ingredientes = prep.ingredientes.map((ing: any) => ({
          nome: ing.nome_ingrediente,
          quantidade: Number(ing.quantidade_por_idoso) || 0,
          unidade: ing.unidade || '',
        }))
      } else {
        const desc = cardapioItem?.descricao || ''
        const linhas = desc.split('\n').map((l: string) => l.replace(/^-\s*/, '').trim()).filter(Boolean)
        ingredientes = linhas.map((nome: string) => ({ nome, quantidade: 0, unidade: '' }))
      }

      return {
        tipo,
        descricao: cardapioItem?.descricao ?? '',
        observacoes: cardapioItem?.observacoes ?? '',
        ingredientes,
        confirmada: refConfirmadasHoje.has(tipo),
      }
    })

    setRefeicoes(refeicoesData)
    setLoading(false)
  }, [semana, diaSemana])

  useEffect(() => { carregarProducao() }, [carregarProducao])

  async function confirmarRefeicao(refIdx: number) {
    setSalvando(true)
    const supabase = getSupabase()
    const ref = refeicoes[refIdx]
    const dataHoje = hoje.toISOString().split('T')[0]

    // Registra produção
    const { data: producao } = await supabase.from('producao_diaria').upsert({
      data: dataHoje,
      semana_cardapio: semana,
      dia_semana: diaSemana,
      refeicao: ref.tipo,
      descricao: ref.descricao,
      num_idosos: numIdosos,
      status: 'concluido',
      confirmado_em: new Date().toISOString(),
    }, { onConflict: 'data,refeicao' }).select().single()

    // Registra ingredientes consumidos
    if (producao && ref.ingredientes.length > 0) {
      const ingsValidos = ref.ingredientes.filter(i => i.quantidade > 0)
      if (ingsValidos.length > 0) {
        await supabase.from('producao_ingredientes').insert(
          ingsValidos.map(ing => ({
            producao_id: producao.id,
            nome_ingrediente: ing.nome,
            quantidade: ing.quantidade,
            unidade: ing.unidade,
          }))
        )
      }
    }

    setRefeicoes((prev) => {
      const updated = [...prev]
      updated[refIdx] = { ...updated[refIdx], confirmada: true }
      return updated
    })

    toast.success(`${REFEICAO_LABELS[ref.tipo]} confirmada!`)
    setSalvando(false)
  }

  const refConfirmadas = refeicoes.filter(r => r.confirmada).length
  const pct = refeicoes.length > 0 ? Math.round((refConfirmadas / refeicoes.length) * 100) : 0

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
        <div style={{ textAlign: 'center', color: '#888780' }}>
          <ChefHat size={40} style={{ margin: '0 auto 12px' }} />
          <div>Carregando produção do dia...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ background: '#EDF3EA', borderRadius: '14px', padding: '20px 24px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#3D4F38', marginBottom: '4px' }}>
            Produção do Dia
          </div>
          <div style={{ fontSize: '13px', color: '#5A7A4C' }}>
            Semana {semana} · {DIAS_SEMANA[diaSemana]} · {hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} · {numIdosos} refeições
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '28px', fontWeight: 600, color: '#3D4F38' }}>{pct}%</div>
          <div style={{ fontSize: '12px', color: '#5A7A4C' }}>{refConfirmadas} / {refeicoes.length} refeições</div>
        </div>
      </div>

      {/* Barra de progresso */}
      <div style={{ height: '8px', background: '#E5E3DC', borderRadius: '4px', marginBottom: '24px', overflow: 'hidden' }}>
        <div style={{ height: '100%', background: '#7B9E6B', borderRadius: '4px', width: `${pct}%`, transition: 'width 0.4s ease' }} />
      </div>

      {/* Refeições */}
      {refeicoes.map((ref, refIdx) => (
        <div key={ref.tipo} style={{ marginBottom: '20px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            {ref.confirmada
              ? <CheckCircle2 size={18} style={{ color: '#7B9E6B' }} />
              : <Clock size={18} style={{ color: '#888780' }} />
            }
            <span style={{ fontSize: '15px', fontWeight: 500 }}>{REFEICAO_LABELS[ref.tipo]}</span>
            <span style={{ fontSize: '11px', background: '#EDF3EA', color: '#3D4F38', padding: '2px 8px', borderRadius: '10px', fontWeight: 500 }}>
              {REFEICAO_HORARIOS[ref.tipo]}
            </span>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden', opacity: ref.confirmada ? 0.75 : 1 }}>

            {ref.descricao && (
              <div style={{ padding: '10px 16px', background: '#F8F6F2', fontSize: '12px', color: '#5F5E5A', borderBottom: '1px solid #E5E3DC' }}>
                📋 {ref.descricao.split('\n').map(l => l.replace(/^-\s*/, '')).filter(Boolean).join(' · ')}
              </div>
            )}

            {ref.ingredientes.length > 0 && (
              <div style={{ padding: '0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', padding: '6px 16px', background: '#F8F6F2', borderBottom: '1px solid #E5E3DC', fontSize: '10px', fontWeight: 600, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <span>Ingrediente</span>
                  <span style={{ textAlign: 'right' }}>Quantidade</span>
                </div>

                {ref.ingredientes.map((ing, i) => (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px',
                    padding: '9px 16px',
                    borderBottom: i < ref.ingredientes.length - 1 ? '1px solid #F1EFE8' : 'none',
                    fontSize: '13px',
                    alignItems: 'center',
                  }}>
                    <span style={{ color: '#2C2C2A', fontWeight: 500 }}>{ing.nome}</span>
                    <span style={{ textAlign: 'right', color: '#5F5E5A' }}>
                      {ing.quantidade > 0 ? `${ing.quantidade} ${ing.unidade}` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {ref.observacoes && (
              <div style={{ padding: '8px 16px', background: '#FCEEF0', fontSize: '12px', color: '#9A4A4A', borderTop: '1px solid #E5E3DC' }}>
                💡 {ref.observacoes}
              </div>
            )}

            {!ref.confirmada ? (
              <div style={{ padding: '10px 14px', background: '#F8F6F2', display: 'flex', gap: '8px', borderTop: '1px solid #E5E3DC' }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, fontSize: '13px' }}
                  onClick={() => confirmarRefeicao(refIdx)}
                  disabled={salvando}
                >
                  <CheckCircle2 size={14} />
                  Confirmar refeição
                </button>
                <button className="btn btn-sm" onClick={() => setModalPerda({ open: true, refeicao: ref.tipo })}>
                  <AlertTriangle size={13} />
                  Perda
                </button>
              </div>
            ) : (
              <div style={{ padding: '10px 16px', background: '#EDF3EA', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#3D4F38' }}>
                <CheckCircle2 size={15} />
                Refeição confirmada
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Modal Perda */}
      <Modal
        open={modalPerda.open}
        onClose={() => setModalPerda({ open: false })}
        title="Registrar perda"
        footer={
          <>
            <button className="btn btn-sm" onClick={() => setModalPerda({ open: false })}>Cancelar</button>
            <button className="btn btn-sm btn-primary" onClick={() => { setModalPerda({ open: false }); toast.success('Perda registrada!') }}>Salvar</button>
          </>
        }
      >
        <div className="input-group">
          <label className="input-label">Item</label>
          <input className="input" placeholder="Nome do item perdido" />
        </div>
        <div className="input-group">
          <label className="input-label">Quantidade</label>
          <input type="number" className="input" placeholder="0" min={0} />
        </div>
        <div className="input-group">
          <label className="input-label">Motivo</label>
          <select className="input">
            <option>Preparação excedente</option>
            <option>Recusa do idoso</option>
            <option>Acidente / queda</option>
            <option>Outro</option>
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">Observação</label>
          <textarea className="input" rows={2} placeholder="Detalhe se necessário..." />
        </div>
      </Modal>
    </div>
  )
}
