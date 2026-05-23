'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit2, ChevronLeft, ChevronRight } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { Modal, SectionHeader, WeekSelector } from '@/components/ui'
import {
  REFEICAO_LABELS, REFEICAO_ORDER, DIAS_SEMANA, DIAS_SEMANA_SHORT
} from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
import type { Cardapio, RefeicaoTipo } from '@/types'

export default function CardapioPage() {
  const { semanaAtiva, setSemanaAtiva } = useAppStore()
  const [cardapio, setCardapio] = useState<Cardapio[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<{
    open: boolean
    semana: number
    dia: number
    refeicao: RefeicaoTipo
    descricao: string
    obs: string
  } | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function carregar(semana: number) {
    setLoading(true)
    const supabase = getSupabase()
    const { data } = await supabase
      .from('cardapio')
      .select('*')
      .eq('semana', semana)
      .order('dia_semana')
      .order('refeicao')
    setCardapio(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    carregar(semanaAtiva)
  }, [semanaAtiva])

  function getRefeicao(dia: number, refeicao: RefeicaoTipo) {
    return cardapio.find((c) => c.dia_semana === dia && c.refeicao === refeicao)
  }

  function abrirEdicao(dia: number, refeicao: RefeicaoTipo) {
    const item = getRefeicao(dia, refeicao)
    setEditando({
      open: true,
      semana: semanaAtiva,
      dia,
      refeicao,
      descricao: item?.descricao ?? '',
      obs: item?.observacoes ?? '',
    })
  }

  async function salvarEdicao() {
    if (!editando) return
    setSalvando(true)
    const supabase = getSupabase()

    const { error } = await supabase
      .from('cardapio')
      .upsert({
        semana: editando.semana,
        dia_semana: editando.dia,
        refeicao: editando.refeicao,
        descricao: editando.descricao,
        observacoes: editando.obs,
      }, {
        onConflict: 'semana,dia_semana,refeicao',
      })

    if (error) {
      toast.error('Erro ao salvar')
    } else {
      toast.success('Cardápio atualizado!')
      await carregar(semanaAtiva)
    }
    setSalvando(false)
    setEditando(null)
  }

  return (
    <div>
      {/* Controles */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <WeekSelector active={semanaAtiva} onChange={setSemanaAtiva} />
        <div style={{ fontSize: '13px', color: '#888780' }}>
          Clique em qualquer refeição para editar
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#888780' }}>
          Carregando cardápio...
        </div>
      ) : (
        <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
          <div className="week-grid-container">
            {DIAS_SEMANA.map((dia, diaIdx) => (
              <div key={dia}>
                {/* Cabeçalho do dia */}
                <div
                  style={{
                    textAlign: 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#888780',
                    padding: '6px 0',
                    marginBottom: '6px',
                  }}
                >
                  {DIAS_SEMANA_SHORT[diaIdx]}
                </div>

                {/* Refeições do dia */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {REFEICAO_ORDER.map((refeicao) => {
                    const item = getRefeicao(diaIdx, refeicao)
                    return (
                      <div
                        key={refeicao}
                        onClick={() => abrirEdicao(diaIdx, refeicao)}
                        style={{
                          background: '#fff',
                          border: '1px solid #E5E3DC',
                          borderRadius: '8px',
                          padding: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          minHeight: '56px',
                        }}
                        onMouseEnter={(e) => {
                          ;(e.currentTarget as HTMLDivElement).style.borderColor = '#1D9E75'
                          ;(e.currentTarget as HTMLDivElement).style.background = '#F0FBF7'
                        }}
                        onMouseLeave={(e) => {
                          ;(e.currentTarget as HTMLDivElement).style.borderColor = '#E5E3DC'
                          ;(e.currentTarget as HTMLDivElement).style.background = '#fff'
                        }}
                      >
                        <div
                          style={{
                            fontSize: '9px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            color: '#888780',
                            fontWeight: 600,
                            marginBottom: '3px',
                          }}
                        >
                          {REFEICAO_LABELS[refeicao].split(' ').slice(0, 2).join(' ')}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: item ? '#2C2C2A' : '#B4B2A9',
                            lineHeight: 1.3,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {item?.descricao ?? '+ Adicionar'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legenda */}
      <div
        style={{
          marginTop: '16px',
          padding: '10px 14px',
          background: '#E6F1FB',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#0C447C',
        }}
      >
        💡 Este cardápio de 5 semanas se repete em todos os meses. Alterações feitas aqui valem para sempre que a semana for usada.
      </div>

      {/* Modal de edição */}
      {editando && (
        <Modal
          open={editando.open}
          onClose={() => setEditando(null)}
          title={`${DIAS_SEMANA[editando.dia]} · ${REFEICAO_LABELS[editando.refeicao]}`}
          footer={
            <>
              <button className="btn btn-sm" onClick={() => setEditando(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={salvarEdicao}
                disabled={salvando}
              >
                {salvando ? 'Salvando...' : '✓ Salvar'}
              </button>
            </>
          }
        >
          <div className="input-group">
            <label className="input-label">Descrição da refeição</label>
            <textarea
              className="input"
              rows={3}
              value={editando.descricao}
              onChange={(e) =>
                setEditando((prev) => prev ? { ...prev, descricao: e.target.value } : null)
              }
              placeholder="Ex: Arroz, feijão, frango grelhado, salada verde"
            />
          </div>
          <div className="input-group">
            <label className="input-label">Observações / substituições</label>
            <textarea
              className="input"
              rows={2}
              value={editando.obs}
              onChange={(e) =>
                setEditando((prev) => prev ? { ...prev, obs: e.target.value } : null)
              }
              placeholder="Ex: Substituir por sopa para idosos com dificuldade de deglutição"
            />
          </div>
          <div
            style={{
              padding: '10px',
              background: '#FAEEDA',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#412402',
            }}
          >
            Semana {editando.semana} · Dia {editando.dia + 1} · {REFEICAO_LABELS[editando.refeicao]}
          </div>
        </Modal>
      )}
    </div>
  )
}
