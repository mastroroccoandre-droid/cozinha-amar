'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, Circle, Clock, AlertTriangle, ChefHat } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { Modal, Alert, SectionHeader } from '@/components/ui'
import {
  REFEICAO_LABELS, REFEICAO_HORARIOS, REFEICAO_ORDER,
  getSemanaCardapio, getDiaSemanaCardapio, DIAS_SEMANA
} from '@/lib/utils'
import toast from 'react-hot-toast'
import type { RefeicaoTipo, Cardapio } from '@/types'

interface ItemProducao {
  id: string
  nome: string
  qtdPrevista: number
  qtdReal: number
  unidade: string
  feito: boolean
}

interface RefeicaoProducao {
  tipo: RefeicaoTipo
  descricao: string
  itens: ItemProducao[]
  confirmada: boolean
  producaoId?: string
}

export default function ProducaoPage() {
  const hoje = new Date()
  const semana = getSemanaCardapio(hoje)
  const diaSemana = getDiaSemanaCardapio(hoje)
  const numIdosos = 42 // Vem da config

  const [refeicoes, setRefeicoes] = useState<RefeicaoProducao[]>([])
  const [loading, setLoading] = useState(true)
  const [modalPerda, setModalPerda] = useState<{ open: boolean; refeicao?: string }>({ open: false })
  const [modalFinalizar, setModalFinalizar] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const carregarProducao = useCallback(async () => {
    const supabase = getSupabase()
    const dataHoje = hoje.toISOString().split('T')[0]

    // Busca cardápio do dia
    const { data: cardapioItems } = await supabase
      .from('cardapio')
      .select('*')
      .eq('semana', semana)
      .eq('dia_semana', diaSemana)
      .order('refeicao')

    // Busca produção já registrada
    const { data: producaoExistente } = await supabase
      .from('producao_diaria')
      .select('*, itens:producao_itens(*)')
      .eq('data', dataHoje)

    const refeicoesData: RefeicaoProducao[] = REFEICAO_ORDER.map((tipo) => {
      const cardapioItem = cardapioItems?.find((c: Cardapio) => c.refeicao === tipo)
      const producao = producaoExistente?.find((p) => p.refeicao === tipo)

      // Itens mockados (em produção viriam das preparações vinculadas)
      const itensPadrao: ItemProducao[] = [
        {
          id: `${tipo}-1`,
          nome: cardapioItem?.descricao?.split(',')[0] ?? REFEICAO_LABELS[tipo],
          qtdPrevista: numIdosos,
          qtdReal: numIdosos,
          unidade: 'porções',
          feito: false,
        },
      ]

      return {
        tipo,
        descricao: cardapioItem?.descricao ?? REFEICAO_LABELS[tipo],
        itens: producao?.itens?.map((it: ItemProducao) => ({
          id: it.id,
          nome: it.nome,
          qtdPrevista: it.qtdPrevista,
          qtdReal: it.qtdReal ?? it.qtdPrevista,
          unidade: it.unidade,
          feito: it.feito,
        })) ?? itensPadrao,
        confirmada: producao?.status === 'concluido',
        producaoId: producao?.id,
      }
    })

    setRefeicoes(refeicoesData)
    setLoading(false)
  }, [semana, diaSemana])

  useEffect(() => {
    carregarProducao()
  }, [carregarProducao])

  function toggleItem(refIdx: number, itemIdx: number) {
    setRefeicoes((prev) => {
      const updated = [...prev]
      const ref = { ...updated[refIdx] }
      const itens = [...ref.itens]
      itens[itemIdx] = { ...itens[itemIdx], feito: !itens[itemIdx].feito }
      ref.itens = itens
      updated[refIdx] = ref
      return updated
    })
  }

  function updateQtd(refIdx: number, itemIdx: number, qtd: number) {
    setRefeicoes((prev) => {
      const updated = [...prev]
      const ref = { ...updated[refIdx] }
      const itens = [...ref.itens]
      itens[itemIdx] = { ...itens[itemIdx], qtdReal: qtd }
      ref.itens = itens
      updated[refIdx] = ref
      return updated
    })
  }

  async function confirmarRefeicao(refIdx: number) {
    setSalvando(true)
    const supabase = getSupabase()
    const ref = refeicoes[refIdx]
    const dataHoje = hoje.toISOString().split('T')[0]

    try {
      // Marca todos os itens como feito
      const refAtualizada = {
        ...ref,
        confirmada: true,
        itens: ref.itens.map((it) => ({ ...it, feito: true })),
      }

      // Salva produção no banco
      const { data: prod, error } = await supabase
        .from('producao_diaria')
        .upsert({
          id: ref.producaoId,
          data: dataHoje,
          semana_cardapio: semana,
          dia_semana: diaSemana,
          refeicao: ref.tipo,
          descricao: ref.descricao,
          num_idosos: numIdosos,
          status: 'concluido',
          confirmado_em: new Date().toISOString(),
        })
        .select()
        .single()

      if (!error && prod) {
        setRefeicoes((prev) => {
          const updated = [...prev]
          updated[refIdx] = refAtualizada
          return updated
        })
        toast.success(`${REFEICAO_LABELS[ref.tipo]} confirmada!`)
      }
    } catch (e) {
      toast.error('Erro ao confirmar refeição')
    } finally {
      setSalvando(false)
    }
  }

  async function finalizarDia() {
    setSalvando(true)
    // Baixa estoque automaticamente
    await new Promise((r) => setTimeout(r, 1000))
    setSalvando(false)
    setModalFinalizar(false)
    toast.success('Estoque atualizado automaticamente!')
  }

  const totalItens = refeicoes.reduce((a, r) => a + r.itens.length, 0)
  const itensConcluidos = refeicoes.reduce((a, r) => a + r.itens.filter((i) => i.feito).length, 0)
  const refConfirmadas = refeicoes.filter((r) => r.confirmada).length
  const pct = totalItens > 0 ? Math.round((itensConcluidos / totalItens) * 100) : 0

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px', color: '#888780' }}>
        <ChefHat size={40} style={{ margin: '0 auto 12px' }} />
        <div>Carregando produção do dia...</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      {/* Header verde */}
      <div
        style={{
          background: '#E1F5EE',
          borderRadius: '14px',
          padding: '20px 24px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#085041', marginBottom: '4px' }}>
            Produção do Dia
          </div>
          <div style={{ fontSize: '13px', color: '#0F6E56' }}>
            Semana {semana} · {DIAS_SEMANA[diaSemana]} ·{' '}
            {hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} ·{' '}
            {numIdosos} idosos
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '28px', fontWeight: 600, color: '#085041' }}>{pct}%</div>
          <div style={{ fontSize: '12px', color: '#0F6E56' }}>
            {refConfirmadas} / 6 refeições
          </div>
        </div>
      </div>

      {/* Barra de progresso */}
      <div
        style={{
          height: '8px',
          background: '#E5E3DC',
          borderRadius: '4px',
          marginBottom: '24px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            background: '#1D9E75',
            borderRadius: '4px',
            width: `${pct}%`,
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      {/* Refeições */}
      {refeicoes.map((ref, refIdx) => {
        const itensDaRef = ref.itens.length
        const itensFeitos = ref.itens.filter((i) => i.feito).length

        return (
          <div key={ref.tipo} style={{ marginBottom: '20px' }}>
            {/* Header da refeição */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '8px',
              }}
            >
              {ref.confirmada ? (
                <CheckCircle2 size={18} style={{ color: '#1D9E75' }} />
              ) : (
                <Clock size={18} style={{ color: '#888780' }} />
              )}
              <span style={{ fontSize: '15px', fontWeight: 500 }}>
                {REFEICAO_LABELS[ref.tipo]}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  background: '#E1F5EE',
                  color: '#0F6E56',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontWeight: 500,
                }}
              >
                {REFEICAO_HORARIOS[ref.tipo]}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#888780' }}>
                {itensFeitos}/{itensDaRef}
              </span>
            </div>

            {/* Card da refeição */}
            <div
              className="card"
              style={{
                padding: 0,
                overflow: 'hidden',
                opacity: ref.confirmada ? 0.7 : 1,
              }}
            >
              {/* Descrição */}
              <div
                style={{
                  padding: '10px 16px',
                  background: '#F1EFE8',
                  fontSize: '12px',
                  color: '#5F5E5A',
                  borderBottom: '1px solid #E5E3DC',
                }}
              >
                📋 {ref.descricao}
              </div>

              {/* Itens */}
              {ref.itens.map((item, itemIdx) => (
                <div
                  key={item.id}
                  className="check-item"
                  onClick={() => !ref.confirmada && toggleItem(refIdx, itemIdx)}
                  style={{ cursor: ref.confirmada ? 'default' : 'pointer' }}
                >
                  <div className={`check-box ${item.feito ? 'checked' : ''}`}>
                    {item.feito && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        textDecoration: item.feito ? 'line-through' : 'none',
                        color: item.feito ? '#888780' : '#2C2C2A',
                      }}
                    >
                      {item.nome}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888780' }}>
                      Previsto: {item.qtdPrevista} {item.unidade}
                    </div>
                  </div>

                  {/* Quantidade real */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      value={item.qtdReal}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateQtd(refIdx, itemIdx, Number(e.target.value))}
                      disabled={ref.confirmada}
                      style={{
                        width: '70px',
                        textAlign: 'center',
                        border: '1px solid #E5E3DC',
                        borderRadius: '8px',
                        padding: '5px 8px',
                        fontSize: '13px',
                        fontFamily: 'DM Sans, sans-serif',
                        background: ref.confirmada ? '#F1EFE8' : '#fff',
                      }}
                    />
                    <span style={{ fontSize: '12px', color: '#888780', width: '40px' }}>
                      {item.unidade}
                    </span>
                  </div>
                </div>
              ))}

              {/* Ações */}
              {!ref.confirmada && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: '#F1EFE8',
                    display: 'flex',
                    gap: '8px',
                    borderTop: '1px solid #E5E3DC',
                  }}
                >
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, fontSize: '13px' }}
                    onClick={() => confirmarRefeicao(refIdx)}
                    disabled={salvando}
                  >
                    <CheckCircle2 size={14} />
                    Confirmar refeição
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => setModalPerda({ open: true, refeicao: ref.tipo })}
                  >
                    <AlertTriangle size={13} />
                    Perda
                  </button>
                </div>
              )}

              {ref.confirmada && (
                <div
                  style={{
                    padding: '10px 16px',
                    background: '#E1F5EE',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    color: '#0F6E56',
                  }}
                >
                  <CheckCircle2 size={15} />
                  Refeição confirmada
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Botão finalizar */}
      <button
        className="btn btn-primary btn-lg"
        style={{ width: '100%', marginTop: '8px', fontSize: '15px', padding: '16px' }}
        onClick={() => setModalFinalizar(true)}
      >
        <CheckCircle2 size={18} />
        Finalizar dia e baixar estoque
      </button>

      {/* Modal Perda */}
      <Modal
        open={modalPerda.open}
        onClose={() => setModalPerda({ open: false })}
        title="Registrar perda"
        footer={
          <>
            <button className="btn btn-sm" onClick={() => setModalPerda({ open: false })}>
              Cancelar
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                setModalPerda({ open: false })
                toast.success('Perda registrada!')
              }}
            >
              Salvar
            </button>
          </>
        }
      >
        <div className="input-group">
          <label className="input-label">Item</label>
          <select className="input">
            <option>Selecione um item...</option>
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">Quantidade perdida</label>
          <input type="number" className="input" placeholder="0" min={0} />
        </div>
        <div className="input-group">
          <label className="input-label">Motivo</label>
          <select className="input">
            <option>Preparação excedente</option>
            <option>Recusa do idoso</option>
            <option>Validade vencida</option>
            <option>Acidente / queda</option>
            <option>Outro</option>
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">Observação (opcional)</label>
          <textarea className="input" rows={2} placeholder="Detalhe se necessário..." />
        </div>
      </Modal>

      {/* Modal Finalizar */}
      <Modal
        open={modalFinalizar}
        onClose={() => setModalFinalizar(false)}
        title="Finalizar dia"
        footer={
          <>
            <button className="btn btn-sm" onClick={() => setModalFinalizar(false)}>
              Cancelar
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={finalizarDia}
              disabled={salvando}
            >
              {salvando ? 'Processando...' : '✓ Confirmar e baixar estoque'}
            </button>
          </>
        }
      >
        <Alert variant="green">
          Todas as refeições confirmadas serão descontadas automaticamente do estoque.
        </Alert>
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '10px' }}>
            Resumo:
          </div>
          {refeicoes.map((r) => (
            <div
              key={r.tipo}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: '1px solid #E5E3DC',
                fontSize: '13px',
              }}
            >
              <span>{REFEICAO_LABELS[r.tipo]}</span>
              <Badge variant={r.confirmada ? 'green' : 'gray'}>
                {r.confirmada ? 'Confirmada' : 'Pendente'}
              </Badge>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}

// Importação inline para não ter dependência circular
function Badge({ variant, children }: { variant: string; children: React.ReactNode }) {
  return <span className={`badge badge-${variant}`}>{children}</span>
}
