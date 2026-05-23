'use client'

import { useState } from 'react'
import { Printer } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'

const DIAS = [
  { label: 'Domingo', dia: 6, ordinal: '1º' },
  { label: 'Segunda', dia: 0, ordinal: '2º' },
  { label: 'Terca', dia: 1, ordinal: '3º' },
  { label: 'Quarta', dia: 2, ordinal: '4º' },
  { label: 'Quinta', dia: 3, ordinal: '5º' },
  { label: 'Sexta', dia: 4, ordinal: '6º' },
  { label: 'Sabado', dia: 5, ordinal: '7º' },
]

const REFEICOES = [
  { key: 'cafe_manha', label: 'DESJEJUM' },
  { key: 'colacao', label: 'COLAÇÃO' },
  { key: 'almoco', label: 'ALMOÇO' },
  { key: 'lanche_tarde', label: 'LANCHE' },
  { key: 'jantar', label: 'JANTA' },
  { key: 'ceia', label: 'CEIA' },
]

const QTDE_MEDIA_DIARIA = [
  { nome: 'açúcar', quantidade: 2, unidade: 'kg' },
  { nome: 'alho', quantidade: 320, unidade: 'g' },
  { nome: 'cebola', quantidade: 580, unidade: 'g' },
  { nome: 'cheiro verde', quantidade: 0.5, unidade: 'UN' },
  { nome: 'óleo', quantidade: 1, unidade: 'L' },
]

export default function ImpressaoPage() {
  const [semanas, setSemanas] = useState<number[]>([1, 2, 3, 4, 5])
  const [diasSel, setDiasSel] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [fichas, setFichas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  async function gerarFichas() {
    setLoading(true)
    const supabase = getSupabase()
    const resultado: any[] = []

    for (const semana of semanas) {
      for (const diaObj of DIAS.filter(d => diasSel.includes(d.dia))) {
        const { data: cardapioItems } = await supabase
          .from('cardapio').select('*').eq('semana', semana).eq('dia_semana', diaObj.dia)

        const { data: todasPreps } = await supabase
          .from('preparacoes').select('*, ingredientes:preparacao_ingredientes(*)')
          .ilike('nome', '%Sem' + semana + '/Dia' + diaObj.dia + '%')

        const cardapio: Record<string, any> = {}
        const ingredientes: Record<string, any[]> = {}

        for (const ref of REFEICOES) {
          const item = (cardapioItems ?? []).find((c: any) => c.refeicao === ref.key)
          const prep = (todasPreps ?? []).find((p: any) => p.tipo_refeicao === ref.key)
          cardapio[ref.key] = { descricao: item?.descricao ?? '', observacoes: item?.observacoes ?? '' }
          ingredientes[ref.key] = prep?.ingredientes?.map((i: any) => ({
            nome: i.nome_ingrediente,
            quantidade: i.quantidade_por_idoso,
            unidade: i.unidade,
          })) ?? []
        }

        resultado.push({ semana, dia: diaObj.dia, diaObj, cardapio, ingredientes })
      }
    }

    setFichas(resultado)
    setLoading(false)
  }

  function formatDesc(desc: string) {
    return desc.split('\n').map((l: string) => l.replace(/^-\s*/, '').trim()).filter(Boolean)
  }

  const border = '1px solid #000'
  const cellStyle: React.CSSProperties = {
    border,
    padding: '2px 3px',
    verticalAlign: 'top',
    fontSize: '7pt',
    fontFamily: 'Arial, sans-serif',
    lineHeight: '1.2',
  }

  return (
    <div>
      {/* Controles */}
      <div className="no-print" style={{ marginBottom: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E5E3DC', padding: '20px', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Selecionar semanas</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onClick={() => setSemanas(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s].sort())}
                style={{ padding: '6px 16px', borderRadius: '20px', border: semanas.includes(s) ? 'none' : '1px solid #E5E3DC', background: semanas.includes(s) ? '#7B9E6B' : '#fff', color: semanas.includes(s) ? '#fff' : '#5F5E5A', cursor: 'pointer', fontWeight: 500 }}>
                Semana {s}
              </button>
            ))}
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E5E3DC', padding: '20px', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Selecionar dias</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {DIAS.map(d => (
              <button key={d.dia} onClick={() => setDiasSel(prev => prev.includes(d.dia) ? prev.filter(x => x !== d.dia) : [...prev, d.dia])}
                style={{ padding: '6px 16px', borderRadius: '20px', border: diasSel.includes(d.dia) ? 'none' : '1px solid #E5E3DC', background: diasSel.includes(d.dia) ? '#7B9E6B' : '#fff', color: diasSel.includes(d.dia) ? '#fff' : '#5F5E5A', cursor: 'pointer', fontWeight: 500 }}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={gerarFichas} disabled={loading || semanas.length === 0 || diasSel.length === 0}>
            {loading ? 'Gerando...' : 'Gerar ' + (semanas.length * diasSel.length) + ' fichas'}
          </button>
          {fichas.length > 0 && (
            <button className="btn btn-sm" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={14} /> Imprimir
            </button>
          )}
        </div>
      </div>

      {/* Fichas */}
      {fichas.map((ficha, idx) => {
        // Calcula número máximo de linhas de ingredientes
        const maxLinhas = Math.max(...REFEICOES.map(ref => (ficha.ingredientes[ref.key] ?? []).length), QTDE_MEDIA_DIARIA.length)

        return (
          <div key={idx} style={{ pageBreakAfter: idx < fichas.length - 1 ? 'always' : 'avoid', marginBottom: '32px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                {/* Desjejum: nome, qtd, un */}
                <col style={{ width: '9%' }} /><col style={{ width: '3%' }} /><col style={{ width: '3%' }} />
                {/* Colação */}
                <col style={{ width: '6%' }} /><col style={{ width: '3%' }} /><col style={{ width: '3%' }} />
                {/* Almoço */}
                <col style={{ width: '11%' }} /><col style={{ width: '3%' }} /><col style={{ width: '3%' }} />
                {/* Lanche */}
                <col style={{ width: '9%' }} /><col style={{ width: '3%' }} /><col style={{ width: '3%' }} />
                {/* Janta */}
                <col style={{ width: '9%' }} /><col style={{ width: '3%' }} /><col style={{ width: '3%' }} />
                {/* Ceia */}
                <col style={{ width: '7%' }} /><col style={{ width: '3%' }} /><col style={{ width: '3%' }} />
              </colgroup>
              <thead>
                {/* Título */}
                <tr>
                  <td colSpan={18} style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold', fontSize: '9pt', background: '#d0d0d0', padding: '4px' }}>
                    RESIDENCIAL AMAR — {ficha.diaObj.ordinal} {ficha.diaObj.label.toUpperCase()} DO MÊS — SEMANA {ficha.semana}
                  </td>
                </tr>
                {/* Headers refeições */}
                <tr>
                  {REFEICOES.map(ref => (
                    <td key={ref.key} colSpan={3} style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold', background: '#e0e0e0', fontSize: '8pt' }}>
                      {ref.label}
                    </td>
                  ))}
                </tr>
                {/* Cardápio */}
                <tr>
                  {REFEICOES.map(ref => (
                    <td key={ref.key} colSpan={3} style={{ ...cellStyle, minHeight: '50px' }}>
                      {formatDesc(ficha.cardapio[ref.key]?.descricao ?? '').map((l: string, i: number) => (
                        <div key={i}>- {l}</div>
                      ))}
                    </td>
                  ))}
                </tr>
                {/* Divisor quantidades */}
                <tr>
                  <td colSpan={18} style={{ ...cellStyle, textAlign: 'center', fontStyle: 'italic', fontSize: '7pt', background: '#f0f0f0', padding: '1px' }}>
                    ↓ ↓ ↓ ↓ ↓ Quantidades para 59 refeições ↓ ↓ ↓ ↓ ↓
                  </td>
                </tr>
              </thead>
              <tbody>
                {/* Linhas de ingredientes */}
                {Array.from({ length: maxLinhas }).map((_, rowIdx) => {
                  const ceiaIng = (ficha.ingredientes['ceia'] ?? [])[rowIdx]
                  const qtdMedia = QTDE_MEDIA_DIARIA[rowIdx]

                  return (
                    <tr key={rowIdx}>
                      {/* Desjejum */}
                      {(() => { const ing = (ficha.ingredientes['cafe_manha'] ?? [])[rowIdx]; return <>
                        <td style={cellStyle}>{ing?.nome ?? ''}</td>
                        <td style={{ ...cellStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>{ing ? ing.quantidade : ''}</td>
                        <td style={cellStyle}>{ing?.unidade ?? ''}</td>
                      </> })()}
                      {/* Colação */}
                      {(() => { const ing = (ficha.ingredientes['colacao'] ?? [])[rowIdx]; return <>
                        <td style={cellStyle}>{ing?.nome ?? ''}</td>
                        <td style={{ ...cellStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>{ing ? ing.quantidade : ''}</td>
                        <td style={cellStyle}>{ing?.unidade ?? ''}</td>
                      </> })()}
                      {/* Almoço */}
                      {(() => { const ing = (ficha.ingredientes['almoco'] ?? [])[rowIdx]; return <>
                        <td style={cellStyle}>{ing?.nome ?? ''}</td>
                        <td style={{ ...cellStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>{ing ? ing.quantidade : ''}</td>
                        <td style={cellStyle}>{ing?.unidade ?? ''}</td>
                      </> })()}
                      {/* Lanche */}
                      {(() => { const ing = (ficha.ingredientes['lanche_tarde'] ?? [])[rowIdx]; return <>
                        <td style={cellStyle}>{ing?.nome ?? ''}</td>
                        <td style={{ ...cellStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>{ing ? ing.quantidade : ''}</td>
                        <td style={cellStyle}>{ing?.unidade ?? ''}</td>
                      </> })()}
                      {/* Janta */}
                      {(() => { const ing = (ficha.ingredientes['jantar'] ?? [])[rowIdx]; return <>
                        <td style={cellStyle}>{ing?.nome ?? ''}</td>
                        <td style={{ ...cellStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>{ing ? ing.quantidade : ''}</td>
                        <td style={cellStyle}>{ing?.unidade ?? ''}</td>
                      </> })()}
                      {/* Ceia + Qtde média */}
                      <td style={cellStyle}>{ceiaIng?.nome ?? (qtdMedia && !ceiaIng ? (rowIdx === (ficha.ingredientes['ceia'] ?? []).length ? 'Qtde média diária' : qtdMedia.nome) : '')}</td>
                      <td style={{ ...cellStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>{ceiaIng ? ceiaIng.quantidade : (qtdMedia ? qtdMedia.quantidade : '')}</td>
                      <td style={cellStyle}>{ceiaIng ? ceiaIng.unidade : (qtdMedia ? qtdMedia.unidade : '')}</td>
                    </tr>
                  )
                })}

                {/* Linha qtde média diária header */}
                <tr>
                  <td colSpan={15} style={{ ...cellStyle, background: '#f0f0f0' }}></td>
                  <td colSpan={3} style={{ ...cellStyle, fontWeight: 'bold', background: '#f0f0f0', textAlign: 'center' }}>Qtde média diária</td>
                </tr>
                {QTDE_MEDIA_DIARIA.map((item, i) => (
                  <tr key={i}>
                    <td colSpan={15} style={{ ...cellStyle, borderTop: 'none' }}></td>
                    <td style={cellStyle}>{item.nome}</td>
                    <td style={{ ...cellStyle, textAlign: 'right' }}>{item.quantidade}</td>
                    <td style={cellStyle}>{item.unidade}</td>
                  </tr>
                ))}

                {/* Observações por refeição */}
                <tr>
                  <td colSpan={18} style={{ ...cellStyle, background: '#f0f0f0', fontWeight: 'bold', fontSize: '7pt' }}>
                    Observações (por refeição):
                  </td>
                </tr>
                <tr>
                  {REFEICOES.map(ref => (
                    <td key={ref.key} colSpan={3} style={{ ...cellStyle, minHeight: '30px', fontSize: '6.5pt' }}>
                      {ficha.cardapio[ref.key]?.observacoes ?? ''}
                    </td>
                  ))}
                </tr>

                {/* Observações gerais */}
                <tr>
                  <td colSpan={18} style={{ ...cellStyle, fontSize: '7pt' }}>
                    <strong>Observações gerais:</strong> 59 refeições almoço: 40 idosos + 5 creche + 11 func. Manhã + 3 func. Noite. Suco: servir 150 ml por idoso (+- 7L de água filtrada e 350g de açúcar no preparo)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )
      })}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          aside, header { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; }
          div[style*="marginLeft"] { margin-left: 0 !important; }
          body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: A4 landscape; margin: 6mm; }
        }
      `}</style>
    </div>
  )
}
