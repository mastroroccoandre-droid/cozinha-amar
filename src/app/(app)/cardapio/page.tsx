'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { Modal, WeekSelector } from '@/components/ui'
import { REFEICAO_LABELS, REFEICAO_ORDER } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Cardapio, RefeicaoTipo } from '@/types'

const DIAS = [
  { label: 'Dom', full: 'Domingo', dia: 6 },
  { label: 'Seg', full: 'Segunda', dia: 0 },
  { label: 'Ter', full: 'Terça', dia: 1 },
  { label: 'Qua', full: 'Quarta', dia: 2 },
  { label: 'Qui', full: 'Quinta', dia: 3 },
  { label: 'Sex', full: 'Sexta', dia: 4 },
  { label: 'Sáb', full: 'Sábado', dia: 5 },
]

function getSemanaDoMes(data: Date): number {
  const primeiroDia = new Date(data.getFullYear(), data.getMonth(), 1)
  const diaDaSemana = primeiroDia.getDay()
  return Math.min(5, Math.ceil((data.getDate() + diaDaSemana) / 7))
}

function formatarDescricao(descricao: string): string[] {
  return descricao
    .split('\n')
    .map(l => l.replace(/^-\s*/, '').trim())
    .filter(Boolean)
}

export default function CardapioPage() {
  const semanaAtual = getSemanaDoMes(new Date())
  const [semanaAtiva, setSemanaAtiva] = useState(semanaAtual)
  const [cardapio, setCardapio] = useState<Cardapio[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<{
    open: boolean
    semana: number
    dia: number
    diaFull: string
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

  useEffect(() => { carregar(semanaAtiva) }, [semanaAtiva])

  function getRefeicao(dia: number, refeicao: RefeicaoTipo) {
    return cardapio.find((c) => c.dia_semana === dia && c.refeicao === refeicao)
  }

  function abrirEdicao(dia: number, diaFull: string, refeicao: RefeicaoTipo) {
    const item = getRefeicao(dia, refeicao)
    setEditando({
      open: true,
      semana: semanaAtiva,
      dia,
      diaFull,
      refeicao,
      descricao: item?.descricao ?? '',
      obs: item?.observacoes ?? '',
    })
  }

  async function salvarEdicao() {
    if (!editando) return
    setSalvando(true)
    const supabase = getSupabase()
    const { error } = await supabase.from('cardapio').upsert({
      semana: editando.semana,
      dia_semana: editando.dia,
      refeicao: editando.refeicao,
      descricao: editando.descricao,
      observacoes: editando.obs,
    }, { onConflict: 'semana,dia_semana,refeicao' })

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <WeekSelector active={semanaAtiva} onChange={setSemanaAtiva} />
        <div style={{ fontSize: '13px', color: '#888780' }}>
          Clique em qualquer refeição para editar
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#888780' }}>Carregando cardápio...</div>
      ) : (
        <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '6px', minWidth: '900px' }}>
            <thead>
              <tr>
                <th style={{ width: '80px', minWidth: '80px' }} />
                {DIAS.map((d) => (
                  <th key={d.dia} style={{ fontSize: '11px', color: '#888780', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 8px', textAlign: 'center' }}>
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REFEICAO_ORDER.map((refeicao) => (
                <tr key={refeicao}>
                  <td style={{ fontSize: '10px', color: '#888780', fontWeight: 600, textTransform: 'uppercase', padding: '4px 6px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    {REFEICAO_LABELS[refeicao]}
                  </td>
                  {DIAS.map((d) => {
                    const item = getRefeicao(d.dia, refeicao)
                    const linhas = item ? formatarDescricao(item.descricao) : []
                    return (
                      <td key={d.dia} style={{ verticalAlign: 'top', padding: '2px' }}>
                        <div
                          onClick={() => abrirEdicao(d.dia, d.full, refeicao)}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLDivElement).style.borderColor = '#7B9E6B'
                            ;(e.currentTarget as HTMLDivElement).style.background = '#F0FBF7'
                          }}
                          onMouseLeave={(e) => {
                            ;(e.currentTarget as HTMLDivElement).style.borderColor = '#E5E3DC'
                            ;(e.currentTarget as HTMLDivElement).style.background = item ? '#fff' : '#FAFAF8'
                          }}
                          style={{
                            background: item ? '#fff' : '#FAFAF8',
                            border: '1px solid #E5E3DC',
                            borderRadius: '8px',
                            padding: '8px 10px',
                            cursor: 'pointer',
                            minHeight: '64px',
                            transition: 'all 0.15s',
                          }}
                        >
                          {linhas.length > 0 ? (
                            linhas.map((linha, i) => (
                              <div key={i} style={{ fontSize: '12px', color: '#2C2C2A', lineHeight: 1.4, marginBottom: '1px' }}>
                                {linha}
                              </div>
                            ))
                          ) : (
                            <div style={{ fontSize: '12px', color: '#C8C6BF', textAlign: 'center', paddingTop: '12px' }}>
                              + Adicionar
                            </div>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legenda */}
      <div style={{ marginTop: '16px', padding: '10px 14px', background: '#E6F1FB', borderRadius: '8px', fontSize: '12px', color: '#0C447C' }}>
        💡 Este cardápio de 5 semanas se repete em todos os meses. Alterações feitas aqui valem para sempre que a semana for usada.
      </div>

      {/* Modal de edição */}
      {editando && (
        <Modal
          open={editando.open}
          onClose={() => setEditando(null)}
          title={`${editando.diaFull} · ${REFEICAO_LABELS[editando.refeicao]}`}
          footer={
            <>
              <button className="btn btn-sm" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn btn-sm btn-primary" onClick={salvarEdicao} disabled={salvando}>
                {salvando ? 'Salvando...' : '✓ Salvar'}
              </button>
            </>
          }
        >
          <div className="input-group">
            <label className="input-label">Descrição da refeição</label>
            <textarea
              className="input"
              rows={4}
              value={editando.descricao}
              onChange={(e) => setEditando((prev) => prev ? { ...prev, descricao: e.target.value } : null)}
              placeholder="Ex: Arroz, feijão, frango grelhado, salada verde"
            />
          </div>
          <div className="input-group">
            <label className="input-label">Observações / substituições</label>
            <textarea
              className="input"
              rows={2}
              value={editando.obs}
              onChange={(e) => setEditando((prev) => prev ? { ...prev, obs: e.target.value } : null)}
              placeholder="Ex: Substituir por sopa para idosos com dificuldade de deglutição"
            />
          </div>
          <div style={{ padding: '10px', background: '#FAEEDA', borderRadius: '8px', fontSize: '12px', color: '#412402' }}>
            Semana {editando.semana} · {editando.diaFull} · {REFEICAO_LABELS[editando.refeicao]}
          </div>
        </Modal>
      )}
    </div>
  )
}
