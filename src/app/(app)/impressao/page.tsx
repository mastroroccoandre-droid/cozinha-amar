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

const QTDE_MEDIA: { nome: string; quantidade: number; unidade: string }[] = [
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
            nome: i.nome_ingrediente, quantidade: i.quantidade_por_idoso, unidade: i.unidade,
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

  const cs: React.CSSProperties = {
    border: '1px solid #000', padding: '2px 3px', verticalAlign: 'top',
    fontSize: '7pt', fontFamily: 'Arial, sans-serif', lineHeight: '1.25',
  }

  return (
    <div>
      <div className="no-print" style={{ marginBottom: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E5E3DC', padding: '20px', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Selecionar semanas</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[1,2,3,4,5].map(s => (
              <button key={s} onClick={() => setSemanas(p => p.includes(s) ? p.filter(x => x!==s) : [...p,s].sort())}
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
              <button key={d.dia} onClick={() => setDiasSel(p => p.includes(d.dia) ? p.filter(x => x!==d.dia) : [...p, d.dia])}
                style={{ padding: '6px 16px', borderRadius: '20px', border: diasSel.includes(d.dia) ? 'none' : '1px solid #E5E3DC', background: diasSel.includes(d.dia) ? '#7B9E6B' : '#fff', color: diasSel.includes(d.dia) ? '#fff' : '#5F5E5A', cursor: 'pointer', fontWeight: 500 }}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={gerarFichas} disabled={loading || !semanas.length || !diasSel.length}>
            {loading ? 'Gerando...' : `Gerar ${semanas.length * diasSel.length} fichas`}
          </button>
          {fichas.length > 0 && (
            <button className="btn btn-sm" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={14} /> Imprimir
            </button>
          )}
        </div>
      </div>

      {fichas.map((ficha, idx) => {
        const ings = (ref: string) => ficha.ingredientes[ref] ?? []
        // Número de linhas = máximo de ingredientes entre todas refeições
        // Para a ceia, as linhas extras mostram Qtde média diária
        const maxLinhas = Math.max(
          ings('cafe_manha').length,
          ings('colacao').length,
          ings('almoco').length,
          ings('lanche_tarde').length,
          ings('jantar').length,
          ings('ceia').length + 1 + QTDE_MEDIA.length // +1 para o header
        )

        const rows = Array.from({ length: maxLinhas })

        return (
          <div key={idx} style={{ pageBreakAfter: idx < fichas.length - 1 ? 'always' : 'avoid', marginBottom: '32px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '10%' }} /><col style={{ width: '3.5%' }} /><col style={{ width: '3%' }} />
                <col style={{ width: '5%' }} /><col style={{ width: '3%' }} /><col style={{ width: '2.5%' }} />
                <col style={{ width: '12%' }} /><col style={{ width: '3.5%' }} /><col style={{ width: '3%' }} />
                <col style={{ width: '10%' }} /><col style={{ width: '3%' }} /><col style={{ width: '3%' }} />
                <col style={{ width: '10%' }} /><col style={{ width: '3%' }} /><col style={{ width: '3%' }} />
                <col style={{ width: '10%' }} /><col style={{ width: '3.5%' }} /><col style={{ width: '3%' }} />
              </colgroup>

              <thead>
                <tr>
                  <td colSpan={18} style={{ ...cs, textAlign: 'center', fontWeight: 'bold', fontSize: '9pt', background: '#d0d0d0', padding: '4px' }}>
                    RESIDENCIAL AMAR — {ficha.diaObj.ordinal} {ficha.diaObj.label.toUpperCase()} DO MÊS — SEMANA {ficha.semana}
                  </td>
                </tr>
                <tr>
                  {REFEICOES.map(ref => (
                    <td key={ref.key} colSpan={3} style={{ ...cs, textAlign: 'center', fontWeight: 'bold', background: '#e8e8e8', fontSize: '8pt' }}>
                      {ref.label}
                    </td>
                  ))}
                </tr>
                <tr>
                  {REFEICOES.map(ref => (
                    <td key={ref.key} colSpan={3} style={{ ...cs }}>
                      {formatDesc(ficha.cardapio[ref.key]?.descricao ?? '').map((l: string, i: number) => (
                        <div key={i}>- {l}</div>
                      ))}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td colSpan={18} style={{ ...cs, textAlign: 'center', fontStyle: 'italic', background: '#f5f5f5', padding: '1px', fontSize: '6.5pt' }}>
                    ↓ &nbsp; ↓ &nbsp; ↓ &nbsp; ↓ &nbsp; ↓ &nbsp;&nbsp;&nbsp; Quantidades para 59 refeições &nbsp;&nbsp;&nbsp; ↓ &nbsp; ↓ &nbsp; ↓ &nbsp; ↓ &nbsp; ↓
                  </td>
                </tr>
              </thead>

              <tbody>
                {rows.map((_, i) => {
                  const ceia = ings('ceia')
                  const ceiaLen = ceia.length
                  // Na coluna da ceia: primeiro os ingredientes da ceia, depois header Qtde média, depois os itens
                  let ceiaCol: { nome: string; qtd: any; un: string; bold?: boolean } = { nome: '', qtd: '', un: '' }
                  if (i < ceiaLen) {
                    ceiaCol = { nome: ceia[i].nome, qtd: ceia[i].quantidade, un: ceia[i].unidade }
                  } else if (i === ceiaLen) {
                    ceiaCol = { nome: 'Qtde média diária', qtd: '', un: '', bold: true }
                  } else {
                    const qm = QTDE_MEDIA[i - ceiaLen - 1]
                    if (qm) ceiaCol = { nome: qm.nome, qtd: qm.quantidade, un: qm.unidade }
                  }

                  const cell = (ref: string) => {
                    const ing = ings(ref)[i]
                    return ing ? { nome: ing.nome, qtd: ing.quantidade, un: ing.unidade } : { nome: '', qtd: '', un: '' }
                  }

                  const dej = cell('cafe_manha')
                  const col = cell('colacao')
                  const alm = cell('almoco')
                  const lan = cell('lanche_tarde')
                  const jan = cell('jantar')

                  return (
                    <tr key={i}>
                      <td style={cs}>{dej.nome}</td>
                      <td style={{ ...cs, textAlign: 'right' }}>{dej.qtd}</td>
                      <td style={cs}>{dej.un}</td>

                      <td style={cs}>{col.nome}</td>
                      <td style={{ ...cs, textAlign: 'right' }}>{col.qtd}</td>
                      <td style={cs}>{col.un}</td>

                      <td style={cs}>{alm.nome}</td>
                      <td style={{ ...cs, textAlign: 'right' }}>{alm.qtd}</td>
                      <td style={cs}>{alm.un}</td>

                      <td style={cs}>{lan.nome}</td>
                      <td style={{ ...cs, textAlign: 'right' }}>{lan.qtd}</td>
                      <td style={cs}>{lan.un}</td>

                      <td style={cs}>{jan.nome}</td>
                      <td style={{ ...cs, textAlign: 'right' }}>{jan.qtd}</td>
                      <td style={cs}>{jan.un}</td>

                      <td style={{ ...cs, fontWeight: ceiaCol.bold ? 'bold' : 'normal', background: ceiaCol.bold ? '#f5f5f5' : 'transparent' }}>{ceiaCol.nome}</td>
                      <td style={{ ...cs, textAlign: 'right' }}>{ceiaCol.qtd}</td>
                      <td style={cs}>{ceiaCol.un}</td>
                    </tr>
                  )
                })}

                {/* Observações por refeição */}
                <tr>
                  <td colSpan={18} style={{ ...cs, background: '#f5f5f5', fontWeight: 'bold', fontSize: '6.5pt', padding: '1px 3px' }}>
                    Observações (por refeição):
                  </td>
                </tr>
                <tr>
                  {REFEICOES.map(ref => (
                    <td key={ref.key} colSpan={3} style={{ ...cs, fontSize: '6.5pt' }}>
                      {ficha.cardapio[ref.key]?.observacoes ?? ''}
                    </td>
                  ))}
                </tr>

                {/* Observações gerais */}
                <tr>
                  <td colSpan={18} style={{ ...cs, fontSize: '6.5pt' }}>
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
