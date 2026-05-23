'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, Clock, AlertTriangle, ChefHat } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { Modal } from '@/components/ui'
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
  const [modalPerda, setModalPerda] = useState<{ open: boolean; refeicao?: RefeicaoTipo }>({ open: false })
  const [perda, setPerda] = useState({ nome_item: '', quantidade: '', unidade: 'kg', motivo: 'Preparação excedente', observacao: '' })
  const [salvandoPerda, setSalvandoPerda] = useState(false)
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

  function atualizarQuantidade(refIdx: number, ingIdx: number, novaQtd: number) {
    setRefeicoes(prev => {
      const updated = [...prev]
      const ings = [...updated[refIdx].ingredientes]
      ings[ingIdx] = { ...ings[ingIdx], quantidade: novaQtd }
      updated[refIdx] = { ...updated[refIdx], ingredientes: ings }
      return updated
    })
  }

  async function salvarPerda() {
    if (!perda.nome_item.trim() || !modalPerda.refeicao) return toast.error('Informe o item')
    setSalvandoPerda(true)
    const supabase = getSupabase()
    const dataHoje = hoje.toISOString().split('T')[0]
    await supabase.from('perdas').insert({
      data: dataHoje,
      refeicao: modalPerda.refeicao,
      nome_item: perda.nome_item,
      quantidade: parseFloat(perda.quantidade) || 0,
      unidade: perda.unidade,
      motivo: perda.motivo,
      observacao: perda.observacao,
    })
    toast.success('Perda registrada!')
    setModalPerda({ open: false })
    setPerda({ nome_item: '', quantidade: '', unidade: 'kg', motivo: 'Preparação excedente', observacao: '' })
    setSalvandoPerda(false)
  }

  async function confirmarRefeicao(refIdx: number) {
    setSalvando(true)
    const supabase = getSupabase()
    const ref = refeicoes[refIdx]
    const dataHoje = hoje.toISOString().split('T')[0]

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

    const ingsValidos = ref.ingredientes.filter(i => i.quantidade > 0)

    if (producao && ingsValidos.length > 0) {
      // Salva no histórico de produção
      await supabase.from('producao_ingredientes').insert(
        ingsValidos.map(ing => ({
          producao_id: producao.id,
          nome_ingrediente: ing.nome,
          quantidade: ing.quantidade,
          unidade: ing.unidade,
        }))
      )

      // Desconta do estoque
      for (const ing of ingsValidos) {
        const { data: ingData } = await supabase
          .from('preparacao_ingredientes')
          .select('produto_id')
          .eq('nome_ingrediente', ing.nome)
          .limit(1)
          .single()

        if (!ingData?.produto_id) continue

        const { data: produto } = await supabase
          .from('produtos')
          .select('quantidade_atual, unidade')
          .eq('id', ingData.produto_id)
          .single()

        if (!produto) continue

        let qtdDescontar = ing.quantidade
        if (ing.unidade === 'g' && produto.unidade === 'kg') qtdDescontar = ing.quantidade / 1000
        if (ing.unidade === 'ml' && produto.unidade === 'L') qtdDescontar = ing.quantidade / 1000

        const novaQtd = Math.max(0, produto.quantidade_atual - qtdDescontar)

        await supabase.from('produtos').update({ quantidade_atual: novaQtd }).eq('id', ingData.produto_id)

        await supabase.from('movimentacoes_estoque').insert({
          produto_id: ingData.produto_id,
          tipo: 'saida',
          quantidade: qtdDescontar,
          quantidade_anterior: produto.quantidade_atual,
          quantidade_posterior: novaQtd,
          motivo: `Refeição: ${REFEICAO_LABELS[ref.tipo]} — ${dataHoje}`,
        })
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
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#3D4F38', marginBottom: '4px' }}>Produção do Dia</div>
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
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', padding: '6px 16px', background: '#F8F6F2', borderBottom: '1px solid #E5E3DC', fontSize: '10px', fontWeight: 600, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <span>Ingrediente</span>
                  <span style={{ textAlign: 'right' }}>Quantidade</span>
                </div>

                {ref.ingredientes.map((ing, i) => (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 160px',
                    padding: '7px 16px',
                    borderBottom: i < ref.ingredientes.length - 1 ? '1px solid #F1EFE8' : 'none',
                    fontSize: '13px',
                    alignItems: 'center',
                  }}>
                    <span style={{ color: '#2C2C2A', fontWeight: 500 }}>{ing.nome}</span>
                    {!ref.confirmada && ing.quantidade > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={ing.quantidade}
                          onChange={(e) => atualizarQuantidade(refIdx, i, parseFloat(e.target.value) || 0)}
                          style={{
                            width: '70px',
                            padding: '3px 6px',
                            border: '1px solid #E5E3DC',
                            borderRadius: '6px',
                            fontSize: '13px',
                            textAlign: 'right',
                            background: '#FAFAF8',
                          }}
                        />
                        <span style={{ color: '#888780', fontSize: '12px', minWidth: '24px' }}>{ing.unidade}</span>
                      </div>
                    ) : (
                      <span style={{ textAlign: 'right', color: '#5F5E5A' }}>
                        {ing.quantidade > 0 ? `${ing.quantidade} ${ing.unidade}` : '—'}
                      </span>
                    )}
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
                <button className="btn btn-sm" onClick={() => { setModalPerda({ open: true, refeicao: ref.tipo }); setPerda({ nome_item: '', quantidade: '', unidade: 'kg', motivo: 'Preparação excedente', observacao: '' }) }}>
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
        title={\}
        size="sm"
        footer={
          <>
            <button className="btn btn-sm" onClick={() => setModalPerda({ open: false })}>Cancelar</button>
            <button className="btn btn-sm btn-primary" onClick={salvarPerda} disabled={salvandoPerda}>{salvandoPerda ? 'Salvando...' : '✓ Registrar perda'}</button>
          </>
        }
      >
        <div className="input-group">
          <label className="input-label">Item *</label>
          <input className="input" value={perda.nome_item} onChange={(e) => setPerda(p => ({ ...p, nome_item: e.target.value }))} placeholder="Nome do item perdido" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="input-group">
            <label className="input-label">Quantidade</label>
            <input type="number" className="input" value={perda.quantidade} onChange={(e) => setPerda(p => ({ ...p, quantidade: e.target.value }))} placeholder="0" min={0} />
          </div>
          <div className="input-group">
            <label className="input-label">Unidade</label>
            <select className="input" value={perda.unidade} onChange={(e) => setPerda(p => ({ ...p, unidade: e.target.value }))}>
              <option>kg</option><option>g</option><option>L</option><option>ml</option><option>un</option><option>pct</option>
            </select>
          </div>
        </div>
        <div className="input-group">
          <label className="input-label">Motivo</label>
          <select className="input" value={perda.motivo} onChange={(e) => setPerda(p => ({ ...p, motivo: e.target.value }))}>
            <option>Preparação excedente</option>
            <option>Recusa do idoso</option>
            <option>Acidente / queda</option>
            <option>Outro</option>
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">Observação</label>
          <textarea className="input" rows={2} value={perda.observacao} onChange={(e) => setPerda(p => ({ ...p, observacao: e.target.value }))} placeholder="Detalhe se necessário..." />
        </div>
      </Modal>
    </div>
  )
}
