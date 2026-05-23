'use client'

import { useEffect, useState, useRef } from 'react'
import { Printer } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'

const DIAS = [
  { label: 'Domingo', dia: 6 },
  { label: 'Segunda', dia: 0 },
  { label: 'Terça', dia: 1 },
  { label: 'Quarta', dia: 2 },
  { label: 'Quinta', dia: 3 },
  { label: 'Sexta', dia: 4 },
  { label: 'Sábado', dia: 5 },
]

const REFEICOES = [
  { key: 'cafe_manha', label: 'Desjejum' },
  { key: 'colacao', label: 'Colação' },
  { key: 'almoco', label: 'Almoço' },
  { key: 'lanche_tarde', label: 'Lanche' },
  { key: 'jantar', label: 'Janta' },
  { key: 'ceia', label: 'Ceia' },
]

const ORDINAL = ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '7ª']

interface FichaData {
  semana: number
  dia: number
  diaLabel: string
  cardapio: Record<string, { descricao: string; observacoes: string }>
  ingredientes: Record<string, { nome: string; quantidade: number; unidade: string }[]>
}

export default function ImpressaoPage() {
  const [semanas, setSemanas] = useState<number[]>([1, 2, 3, 4, 5])
  const [diasSel, setDiasSel] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [fichas, setFichas] = useState<FichaData[]>([])
  const [loading, setLoading] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  async function gerarFichas() {
    setLoading(true)
    const supabase = getSupabase()
    const resultado: FichaData[] = []

    for (const semana of semanas) {
      for (const diaObj of DIAS.filter(d => diasSel.includes(d.dia))) {
        const { data: cardapioItems } = await supabase
          .from('cardapio')
          .select('*')
          .eq('semana', semana)
          .eq('dia_semana', diaObj.dia)

        const { data: todasPreps } = await supabase
          .from('preparacoes')
          .select('*, ingredientes:preparacao_ingredientes(*)')
          .ilike('nome', `%Sem${semana}/Dia${diaObj.dia}%`)

        const cardapio: Record<string, { descricao: string; observacoes: string }> = {}
        const ingredientes: Record<string, { nome: string; quantidade: number; unidade: string }[]> = {}

        for (const ref of REFEICOES) {
          const item = (cardapioItems ?? []).find((c: any) => c.refeicao === ref.key)
          const prep = (todasPreps ?? []).find((p: any) => p.tipo_refeicao === ref.key)

          cardapio[ref.key] = {
            descricao: item?.descricao ?? '',
            observacoes: item?.observacoes ?? '',
          }

          ingredientes[ref.key] = prep?.ingredientes?.map((i: any) => ({
            nome: i.nome_ingrediente,
            quantidade: i.quantidade_por_idoso,
            unidade: i.unidade,
          })) ?? []
        }

        resultado.push({ semana, dia: diaObj.dia, diaLabel: diaObj.label, cardapio, ingredientes })
      }
    }

    setFichas(resultado)
    setLoading(false)
  }

  function imprimir() {
    window.print()
  }

  function formatDesc(desc: string) {
    return desc.split('\n').map(l => l.replace(/^-\s*/, '').trim()).filter(Boolean)
  }

  return (
    <div>
      {/* Controles — não aparecem na impressão */}
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
            {loading ? 'Gerando...' : `Gerar ${semanas.length * diasSel.length} fichas`}
          </button>
          {fichas.length > 0 && (
            <button className="btn btn-sm" onClick={imprimir} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={14} /> Imprimir
            </button>
          )}
        </div>
      </div>

      {/* Fichas para impressão */}
      <div ref={printRef}>
        {fichas.map((ficha, idx) => (
          <div key={idx} style={{ pageBreakAfter: 'always', marginBottom: '40px' }}>
            <FichaImpressao ficha={ficha} />
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          @page { size: A4 landscape; margin: 8mm; }
        }
      `}</style>
    </div>
  )

  function FichaImpressao({ ficha }: { ficha: FichaData }) {
    const diaOrdinal = DIAS.findIndex(d => d.dia === ficha.dia) + 1
    return (
      <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', border: '1px solid #000' }}>
        {/* Cabeçalho */}
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11px', padding: '4px', borderBottom: '1px solid #000', background: '#f0f0f0' }}>
          RESIDENCIAL AMAR — {ORDINAL[diaOrdinal - 1]} {ficha.diaLabel.toUpperCase()} DO MÊS — SEMANA {ficha.semana}
        </div>

        {/* Linha 1: Cardápio */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', borderBottom: '1px solid #000' }}>
          {REFEICOES.map((ref, i) => (
            <div key={ref.key} style={{ borderRight: i < 5 ? '1px solid #000' : 'none', padding: '4px', minHeight: '60px' }}>
              <div style={{ fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #ccc', marginBottom: '3px', fontSize: '8px' }}>{ref.label.toUpperCase()}</div>
              {formatDesc(ficha.cardapio[ref.key]?.descricao ?? '').map((l, i) => (
                <div key={i} style={{ lineHeight: 1.3 }}>- {l}</div>
              ))}
            </div>
          ))}
        </div>

        {/* Divisor */}
        <div style={{ textAlign: 'center', fontSize: '8px', borderBottom: '1px solid #000', padding: '2px', background: '#f5f5f5', fontStyle: 'italic' }}>
          Quantidades para 59 refeições
        </div>

        {/* Linha 2: Ingredientes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', borderBottom: '1px solid #000' }}>
          {REFEICOES.map((ref, i) => {
            const ings = ficha.ingredientes[ref.key] ?? []
            return (
              <div key={ref.key} style={{ borderRight: i < 5 ? '1px solid #000' : 'none', padding: '4px', minHeight: '80px' }}>
                {ings.map((ing, j) => (
                  <div key={j} style={{ display: 'flex', justifyContent: 'space-between', lineHeight: 1.4, gap: '4px' }}>
                    <span>{ing.nome}</span>
                    <span style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>{ing.quantidade} {ing.unidade}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {/* Linha 3: Observações */}
        <div style={{ borderBottom: '1px solid #000', padding: '2px 4px', fontSize: '8px', background: '#f5f5f5' }}>
          Observações (por refeição):
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', borderBottom: '1px solid #000' }}>
          {REFEICOES.map((ref, i) => (
            <div key={ref.key} style={{ borderRight: i < 5 ? '1px solid #000' : 'none', padding: '4px', minHeight: '40px', fontSize: '8px', lineHeight: 1.3 }}>
              {ficha.cardapio[ref.key]?.observacoes ?? ''}
            </div>
          ))}
        </div>

        {/* Rodapé */}
        <div style={{ padding: '3px 4px', fontSize: '8px' }}>
          <strong>Observações (gerais):</strong> 59 refeições: 40 idosos + 5 creche + 11 func. Manhã + 3 func. Noite
        </div>
      </div>
    )
  }
}
