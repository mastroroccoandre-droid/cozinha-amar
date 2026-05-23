'use client'

import { useState } from 'react'
import { Printer } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'

const DIAS = [
  { label: 'Domingo', dia: 6 },
  { label: 'Segunda', dia: 0 },
  { label: 'Terca', dia: 1 },
  { label: 'Quarta', dia: 2 },
  { label: 'Quinta', dia: 3 },
  { label: 'Sexta', dia: 4 },
  { label: 'Sabado', dia: 5 },
]

const REFEICOES = [
  { key: 'cafe_manha', label: 'Desjejum' },
  { key: 'colacao', label: 'Colacao' },
  { key: 'almoco', label: 'Almoco' },
  { key: 'lanche_tarde', label: 'Lanche' },
  { key: 'jantar', label: 'Janta' },
  { key: 'ceia', label: 'Ceia' },
]

const ORDINAL = ['1a', '2a', '3a', '4a', '5a', '6a', '7a']

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
            nome: i.nome_ingrediente, quantidade: i.quantidade_por_idoso, unidade: i.unidade,
          })) ?? []
        }

        resultado.push({ semana, dia: diaObj.dia, diaLabel: diaObj.label, cardapio, ingredientes })
      }
    }

    setFichas(resultado)
    setLoading(false)
  }

  function formatDesc(desc: string) {
    return desc.split('\n').map((l: string) => l.replace(/^-\s*/, '').trim()).filter(Boolean)
  }

  const tdStyle: React.CSSProperties = {
    border: '1px solid #000',
    padding: '3px 4px',
    verticalAlign: 'top',
    width: '16.66%',
    fontSize: '7.5pt',
    fontFamily: 'Arial, sans-serif',
  }

  const thStyle: React.CSSProperties = {
    border: '1px solid #000',
    padding: '3px 4px',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '7.5pt',
    fontFamily: 'Arial, sans-serif',
    background: '#e0e0e0',
    width: '16.66%',
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
      {fichas.map((ficha, idx) => (
        <div key={idx} style={{ pageBreakAfter: idx < fichas.length - 1 ? 'always' : 'avoid', marginBottom: '32px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            {/* Cabeçalho */}
            <thead>
              <tr>
                <td colSpan={6} style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontWeight: 'bold', fontSize: '9pt', fontFamily: 'Arial, sans-serif', background: '#d0d0d0' }}>
                  RESIDENCIAL AMAR — {ORDINAL[DIAS.findIndex(d => d.dia === ficha.dia)]} {ficha.diaLabel.toUpperCase()} DO MES — SEMANA {ficha.semana}
                </td>
              </tr>
              <tr>
                {REFEICOES.map(ref => <th key={ref.key} style={thStyle}>{ref.label.toUpperCase()}</th>)}
              </tr>
            </thead>
            <tbody>
              {/* Linha cardápio */}
              <tr>
                {REFEICOES.map(ref => (
                  <td key={ref.key} style={{ ...tdStyle, minHeight: '50px' }}>
                    {formatDesc(ficha.cardapio[ref.key]?.descricao ?? '').map((l: string, i: number) => (
                      <div key={i} style={{ lineHeight: 1.3 }}>- {l}</div>
                    ))}
                  </td>
                ))}
              </tr>

              {/* Divisor quantidades */}
              <tr>
                <td colSpan={6} style={{ border: '1px solid #000', padding: '2px', textAlign: 'center', fontSize: '7pt', fontFamily: 'Arial, sans-serif', background: '#f0f0f0', fontStyle: 'italic' }}>
                  Quantidades para 59 refeicoes
                </td>
              </tr>

              {/* Linha ingredientes */}
              <tr>
                {REFEICOES.map(ref => (
                  <td key={ref.key} style={{ ...tdStyle, minHeight: '70px' }}>
                    {(ficha.ingredientes[ref.key] ?? []).map((ing: any, i: number) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', lineHeight: 1.3, gap: '2px' }}>
                        <span style={{ flex: 1 }}>{ing.nome}</span>
                        <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{ing.quantidade} {ing.unidade}</span>
                      </div>
                    ))}
                  </td>
                ))}
              </tr>

              {/* Linha observações label */}
              <tr>
                <td colSpan={6} style={{ border: '1px solid #000', padding: '2px 4px', fontSize: '7pt', fontFamily: 'Arial, sans-serif', background: '#f0f0f0' }}>
                  Observacoes (por refeicao):
                </td>
              </tr>

              {/* Linha observações */}
              <tr>
                {REFEICOES.map(ref => (
                  <td key={ref.key} style={{ ...tdStyle, minHeight: '35px', fontSize: '7pt' }}>
                    {ficha.cardapio[ref.key]?.observacoes ?? ''}
                  </td>
                ))}
              </tr>

              {/* Rodapé */}
              <tr>
                <td colSpan={6} style={{ border: '1px solid #000', padding: '3px 4px', fontSize: '7pt', fontFamily: 'Arial, sans-serif' }}>
                  <strong>Observacoes gerais:</strong> 59 refeicoes: 40 idosos + 5 creche + 11 func. Manha + 3 func. Noite
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: A4 landscape; margin: 8mm; }
          table { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  )
}
