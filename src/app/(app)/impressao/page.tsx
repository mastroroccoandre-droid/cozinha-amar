'use client'

import { useState } from 'react'
import { Printer, FileSpreadsheet } from 'lucide-react'
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

// Categorias para a lista de compras
const CATEGORIA_LABELS: Record<string, string> = {
  carnes: 'CARNES',
  hortifruti: 'HORTIFRUTI',
  secos: 'SECOS',
  laticinios: 'LATICÍNIOS',
  bebidas: 'BEBIDAS',
  outros: 'OUTROS',
}
const ORDEM_CATEGORIAS = ['carnes', 'hortifruti', 'secos', 'laticinios', 'bebidas', 'outros']

const DIAS_SEMANA_LABEL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export default function ImpressaoPage() {
  const [semanas, setSemanas] = useState<number[]>([1, 2, 3, 4, 5])
  const [diasSel, setDiasSel] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [fichas, setFichas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [exportando, setExportando] = useState(false)

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

  // ===== EXPORTAÇÃO EXCEL =====
  async function exportarExcel() {
    setExportando(true)
    try {
      const XLSX = await import('xlsx')
      const supabase = getSupabase()

      const wb = XLSX.utils.book_new()

      // ---------- 1) FICHAS DE DIA (5 semanas × 7 dias) ----------
      for (let semana = 1; semana <= 5; semana++) {
        for (const diaObj of DIAS) {
          const { data: cardapioItems } = await supabase
            .from('cardapio').select('*').eq('semana', semana).eq('dia_semana', diaObj.dia)
          const { data: todasPreps } = await supabase
            .from('preparacoes').select('*, ingredientes:preparacao_ingredientes(*)')
            .ilike('nome', '%Sem' + semana + '/Dia' + diaObj.dia + '%')

          const cardapio: Record<string, any> = {}
          const ings: Record<string, any[]> = {}
          for (const ref of REFEICOES) {
            const item = (cardapioItems ?? []).find((c: any) => c.refeicao === ref.key)
            const prep = (todasPreps ?? []).find((p: any) => p.tipo_refeicao === ref.key)
            cardapio[ref.key] = { descricao: item?.descricao ?? '', observacoes: item?.observacoes ?? '' }
            ings[ref.key] = prep?.ingredientes?.map((i: any) => ({
              nome: i.nome_ingrediente, quantidade: i.quantidade_por_idoso, unidade: i.unidade,
            })) ?? []
          }

          // Monta a matriz de células (AOA)
          const aoa: any[][] = []

          // Linha 1: título
          aoa.push([`RESIDENCIAL AMAR — ${diaObj.ordinal} ${diaObj.label.toUpperCase()} — SEMANA ${semana}`])

          // Linha 2: cabeçalhos das refeições (cada refeição ocupa 3 colunas)
          const linhaRefeicoes: any[] = []
          for (const ref of REFEICOES) { linhaRefeicoes.push(ref.label, '', '') }
          aoa.push(linhaRefeicoes)

          // Linha 3: descrição do cardápio (texto multi-linha)
          const linhaDesc: any[] = []
          for (const ref of REFEICOES) {
            const linhas = formatDesc(cardapio[ref.key]?.descricao ?? '').map(l => '- ' + l).join('\n')
            linhaDesc.push(linhas, '', '')
          }
          aoa.push(linhaDesc)

          // Linha 4: separador "quantidades"
          aoa.push(['↓ Quantidades para as refeições ↓'])

          // Linhas de ingredientes — calcula o máximo de linhas necessárias
          const ceia = ings['ceia'] ?? []
          const maxLinhas = Math.max(
            ...REFEICOES.map(r => (ings[r.key] ?? []).length),
            ceia.length + 1 + QTDE_MEDIA.length
          )

          for (let i = 0; i < maxLinhas; i++) {
            const linha: any[] = []
            for (const ref of REFEICOES) {
              if (ref.key === 'ceia') {
                // Coluna da ceia: ingredientes, depois "Qtde média diária", depois os itens
                if (i < ceia.length) {
                  const ing = ceia[i]
                  linha.push(ing.nome, ing.quantidade, ing.unidade)
                } else if (i === ceia.length) {
                  linha.push('Qtde média diária', '', '')
                } else {
                  const qm = QTDE_MEDIA[i - ceia.length - 1]
                  if (qm) linha.push(qm.nome, qm.quantidade, qm.unidade)
                  else linha.push('', '', '')
                }
              } else {
                const ing = (ings[ref.key] ?? [])[i]
                if (ing) linha.push(ing.nome, ing.quantidade, ing.unidade)
                else linha.push('', '', '')
              }
            }
            aoa.push(linha)
          }

          // Observações por refeição
          aoa.push(['Observações (por refeição):'])
          const linhaObs: any[] = []
          for (const ref of REFEICOES) {
            linhaObs.push(cardapio[ref.key]?.observacoes ?? '', '', '')
          }
          aoa.push(linhaObs)

          // Observações gerais
          aoa.push(['Observações gerais: 59 refeições almoço: 40 idosos + 5 creche + 11 func. Manhã + 3 func. Noite. Suco: servir 150 ml por idoso (+- 7L de água filtrada e 350g de açúcar no preparo)'])

          const ws = XLSX.utils.aoa_to_sheet(aoa)

          // Configuração de impressão: A4 paisagem, ajustar à largura da página
          ws['!pageSetup'] = { orientation: 'landscape', paperSize: 9, fitToWidth: 1, fitToHeight: 0, scale: 100 }
          ws['!margins'] = { left: 0.2, right: 0.2, top: 0.2, bottom: 0.2, header: 0.1, footer: 0.1 }

          // Merges: título (linha 1), cada refeição no cabeçalho e descrição
          const merges: any[] = []
          merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 17 } }) // título A1:R1
          // linha 2 (refeições) e linha 3 (descrição): cada refeição 3 colunas
          for (let b = 0; b < 6; b++) {
            merges.push({ s: { r: 1, c: b * 3 }, e: { r: 1, c: b * 3 + 2 } })
            merges.push({ s: { r: 2, c: b * 3 }, e: { r: 2, c: b * 3 + 2 } })
          }
          merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: 17 } }) // separador
          ws['!merges'] = merges

          // Larguras de coluna (ampliadas para preencher A4 paisagem)
          ws['!cols'] = Array.from({ length: 18 }, (_, i) => {
            const m = i % 3
            return { wch: m === 0 ? 20 : m === 1 ? 7 : 5 }
          })

          // Nome da aba (máx 31 chars, sem caracteres inválidos)
          const nomeAba = `${diaObj.ordinal} ${diaObj.label} S${semana}`.substring(0, 31)
          XLSX.utils.book_append_sheet(wb, ws, nomeAba)
        }
      }

      // ---------- 2) LISTA DE COMPRAS MENSAL ----------
      // Soma todos os ingredientes do mês (5 semanas × 7 dias), convertendo g→kg e ml→L
      const { data: todasPrepsLista } = await supabase
        .from('preparacoes').select('*, ingredientes:preparacao_ingredientes(*)')

      // Mapa: categoria -> nome -> { kg, L, pct, UN }
      const totais: Record<string, Record<string, any>> = {}
      const normNome = (s: string) => s.trim()

      for (const prep of todasPrepsLista ?? []) {
        for (const ing of prep.ingredientes ?? []) {
          const cat = ing.categoria ?? 'outros'
          const nome = normNome(ing.nome_ingrediente)
          if (!totais[cat]) totais[cat] = {}
          if (!totais[cat][nome]) totais[cat][nome] = { kg: 0, L: 0, pct: 0, UN: 0 }

          let qtd = ing.quantidade_por_idoso
          let u = ing.unidade
          if (u === 'g') { qtd /= 1000; u = 'kg' }
          if (u === 'ml') { qtd /= 1000; u = 'L' }

          if (u === 'kg') totais[cat][nome].kg += qtd
          else if (u === 'L') totais[cat][nome].L += qtd
          else if (u === 'pct') totais[cat][nome].pct += qtd
          else totais[cat][nome].UN += qtd
        }
      }

      const listaAoa: any[][] = []
      listaAoa.push(['LISTA DE COMPRAS MENSAL — PARA IMPRESSÃO'])
      listaAoa.push([])

      for (const cat of ORDEM_CATEGORIAS) {
        const itens = totais[cat]
        if (!itens || Object.keys(itens).length === 0) continue
        listaAoa.push([CATEGORIA_LABELS[cat]])
        listaAoa.push(['INGREDIENTE', 'kg', 'L', 'pct', 'UN'])
        for (const nome of Object.keys(itens).sort((a, b) => a.localeCompare(b, 'pt-BR'))) {
          const v = itens[nome]
          listaAoa.push([
            nome,
            v.kg ? Math.round(v.kg * 1000) / 1000 : '',
            v.L ? Math.round(v.L * 1000) / 1000 : '',
            v.pct ? Math.round(v.pct * 1000) / 1000 : '',
            v.UN ? Math.round(v.UN * 1000) / 1000 : '',
          ])
        }
        listaAoa.push([])
      }

      const wsLista = XLSX.utils.aoa_to_sheet(listaAoa)
      wsLista['!cols'] = [{ wch: 28 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }]
      XLSX.utils.book_append_sheet(wb, wsLista, 'LISTA COMPRAS')

      // ---------- Download ----------
      const hoje = new Date().toISOString().split('T')[0]
      XLSX.writeFile(wb, `Cardapio_Residencial_Amar_${hoje}.xlsx`)
    } catch (err) {
      console.error(err)
      alert('Erro ao gerar Excel. Veja o console para detalhes.')
    }
    setExportando(false)
  }

  const cs: React.CSSProperties = {
    border: '1px solid #000', padding: '3px 4px', verticalAlign: 'top',
    fontSize: '8.5pt', fontFamily: 'Arial, sans-serif', lineHeight: '1.3',
  }

  return (
    <div>
      <div className="no-print" style={{ marginBottom: '24px' }}>
        {/* Botão de exportação Excel — destaque */}
        <div style={{ background: '#EDF3EA', borderRadius: '12px', border: '1px solid #7B9E6B', padding: '16px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#3D4F38', marginBottom: '2px' }}>Exportar para Excel</div>
            <div style={{ fontSize: '12px', color: '#5A7A4C' }}>Gera as 35 fichas de dia + lista de compras mensal, no layout de impressão, com o cardápio atual do sistema.</div>
          </div>
          <button
            className="btn btn-primary"
            onClick={exportarExcel}
            disabled={exportando}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
          >
            <FileSpreadsheet size={16} />
            {exportando ? 'Gerando Excel...' : 'Baixar Excel'}
          </button>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E5E3DC', padding: '20px', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Selecionar semanas (para impressão na tela)</div>
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
        const maxLinhas = Math.max(
          ings('cafe_manha').length,
          ings('colacao').length,
          ings('almoco').length,
          ings('lanche_tarde').length,
          ings('jantar').length,
          ings('ceia').length + 1 + QTDE_MEDIA.length
        )

        const rows = Array.from({ length: maxLinhas })

        return (
          <div key={idx} className="ficha-print" style={{ marginBottom: '32px' }}>
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
          @page { size: A4 landscape; margin: 5mm; }

          /* Cada ficha ocupa exatamente uma página, sem cortes */
          .ficha-print {
            page-break-after: always;
            page-break-inside: avoid;
            break-inside: avoid;
            height: 100%;
            margin: 0 !important;
          }
          .ficha-print:last-child {
            page-break-after: avoid;
          }
          /* A tabela preenche a página inteira */
          .ficha-print table {
            width: 100% !important;
            height: 100%;
          }
          /* Evita que linhas sejam cortadas entre páginas */
          .ficha-print tr, .ficha-print td {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}
