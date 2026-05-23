'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { Modal, SectionHeader, Badge, EmptyState } from '@/components/ui'
import { REFEICAO_LABELS } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
import type { Preparacao, PreparacaoIngrediente, RefeicaoTipo } from '@/types'


const DIAS_SEMANA: Record<number, string> = {
  0: 'Segunda', 1: 'Terça', 2: 'Quarta', 3: 'Quinta',
  4: 'Sexta', 5: 'Sábado', 6: 'Domingo',
}

function formatarNomePreparacao(nome: string): string {
  const match = nome.match(/^(.+?)\s+Sem(\d+)\/Dia(\d+)$/)
  if (match) {
    const tipo = match[1]
    const sem = match[2]
    const dia = parseInt(match[3])
    const diaNome = DIAS_SEMANA[dia] ?? `Dia ${dia}`
    return `${tipo} — ${diaNome}, Sem ${sem}`
  }
  return nome
}

function formatarQuantidade(qtd: number, unidade: string): string {
  if (unidade === 'g' && qtd >= 1000) return `${(qtd/1000).toFixed(qtd%1000===0?0:1)} kg`
  if (unidade === 'ml' && qtd >= 1000) return `${(qtd/1000).toFixed(qtd%1000===0?0:1)} L`
  return `${qtd % 1 === 0 ? qtd : qtd.toFixed(1)} ${unidade}`
}

const DIAS: { label: string; dia: number }[] = [
  { label: 'Domingo', dia: 6 },
  { label: 'Segunda', dia: 0 },
  { label: 'Terça', dia: 1 },
  { label: 'Quarta', dia: 2 },
  { label: 'Quinta', dia: 3 },
  { label: 'Sexta', dia: 4 },
  { label: 'Sábado', dia: 5 },
]

const REFEICAO_ORDER: RefeicaoTipo[] = ['cafe_manha', 'colacao', 'almoco', 'lanche_tarde', 'jantar', 'ceia']

interface PrepForm {
  nome: string
  categoria: string
  tipo_refeicao: RefeicaoTipo
  observacoes: string
  substituicoes: string
  ingredientes: { nome_ingrediente: string; quantidade_por_idoso: string; unidade: string }[]
}

const FORM_INICIAL: PrepForm = {
  nome: '',
  categoria: 'Proteínas',
  tipo_refeicao: 'almoco',
  observacoes: '',
  substituicoes: '',
  ingredientes: [{ nome_ingrediente: '', quantidade_por_idoso: '', unidade: 'g' }],
}

export default function PreparacoesPage() {
  const { config } = useAppStore()
  const [preparacoes, setPreparacoes] = useState<(Preparacao & { ingredientes: PreparacaoIngrediente[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [detalhe, setDetalhe] = useState<(Preparacao & { ingredientes: PreparacaoIngrediente[] }) | null>(null)
  const [modalNova, setModalNova] = useState(false)
  const [form, setForm] = useState<PrepForm>(FORM_INICIAL)
  const [salvando, setSalvando] = useState(false)
  const semanaAtual = (() => { const h = new Date(); const p = new Date(h.getFullYear(), h.getMonth(), 1); return Math.min(5, Math.ceil((h.getDate() + p.getDay()) / 7)); })()
  const [semana, setSemana] = useState(semanaAtual)
  const [filtroRefeicao, setFiltroRefeicao] = useState<RefeicaoTipo | 'todas'>('todas')

  async function carregar() {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('preparacoes')
      .select('*, ingredientes:preparacao_ingredientes(*)')
      .eq('ativo', true)
      .order('nome')
    setPreparacoes(data ?? [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  function getPrep(dia: number, refeicao: RefeicaoTipo) {
    const padrao = `Sem${semana}/Dia${dia}`
    return preparacoes.find((p) =>
      p.nome.includes(padrao) && p.tipo_refeicao === refeicao
    ) ?? null
  }

  function addIngrediente() {
    setForm((f) => ({ ...f, ingredientes: [...f.ingredientes, { nome_ingrediente: '', quantidade_por_idoso: '', unidade: 'g' }] }))
  }

  function removeIngrediente(idx: number) {
    setForm((f) => ({ ...f, ingredientes: f.ingredientes.filter((_, i) => i !== idx) }))
  }

  function updateIngrediente(idx: number, field: string, value: string) {
    setForm((f) => {
      const ings = [...f.ingredientes]
      ings[idx] = { ...ings[idx], [field]: value }
      return { ...f, ingredientes: ings }
    })
  }

  async function salvarPreparacao() {
    if (!form.nome.trim()) return toast.error('Informe o nome da preparação')
    setSalvando(true)
    const supabase = getSupabase()
    const { data: prep, error } = await supabase.from('preparacoes').insert({
      nome: form.nome, categoria: form.categoria, tipo_refeicao: form.tipo_refeicao,
      observacoes: form.observacoes, substituicoes: form.substituicoes,
    }).select().single()

    if (error || !prep) { toast.error('Erro ao salvar'); setSalvando(false); return }

    const ings = form.ingredientes.filter((i) => i.nome_ingrediente.trim())
    if (ings.length > 0) {
      await supabase.from('preparacao_ingredientes').insert(
        ings.map((i) => ({ preparacao_id: prep.id, nome_ingrediente: i.nome_ingrediente, quantidade_por_idoso: parseFloat(i.quantidade_por_idoso) || 0, unidade: i.unidade }))
      )
    }

    toast.success('Preparação cadastrada!')
    setModalNova(false)
    setForm(FORM_INICIAL)
    setSalvando(false)
    carregar()
  }

  const REFEICAO_FILTROS: { value: RefeicaoTipo | 'todas'; label: string }[] = [
    { value: 'todas', label: 'Todas' },
    { value: 'cafe_manha', label: 'Café da manhã' },
    { value: 'colacao', label: 'Colação' },
    { value: 'almoco', label: 'Almoço' },
    { value: 'lanche_tarde', label: 'Lanche' },
    { value: 'jantar', label: 'Jantar' },
    { value: 'ceia', label: 'Ceia' },
  ]

  const refeicoesExibir = filtroRefeicao === 'todas' ? REFEICAO_ORDER : [filtroRefeicao]

  return (
    <div>
      <SectionHeader
        title="Preparações"
        subtitle={`${preparacoes.length} receitas cadastradas`}
        action={
          <button className="btn btn-primary" onClick={() => setModalNova(true)}>
            <Plus size={14} /> Nova preparação
          </button>
        }
      />

      {/* Navegação semanas */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <button className="btn btn-sm btn-icon" onClick={() => setSemana(s => Math.max(1, s - 1))} disabled={semana === 1}>
          <ChevronLeft size={16} />
        </button>
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setSemana(s)}
            style={{
              padding: '5px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', border: semana === s ? 'none' : '1px solid #E5E3DC',
              background: semana === s ? '#7B9E6B' : '#fff',
              color: semana === s ? '#fff' : '#5F5E5A',
            }}
          >
            Semana {s}
          </button>
        ))}
        <button className="btn btn-sm btn-icon" onClick={() => setSemana(s => Math.min(5, s + 1))} disabled={semana === 5}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Filtro refeição */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {REFEICAO_FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltroRefeicao(f.value)}
            style={{
              padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
              cursor: 'pointer', border: filtroRefeicao === f.value ? 'none' : '1px solid #E5E3DC',
              background: filtroRefeicao === f.value ? '#7B9E6B' : '#fff',
              color: filtroRefeicao === f.value ? '#fff' : '#5F5E5A',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#888780' }}>Carregando...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '6px' }}>
            <thead>
              <tr>
                <th style={{ width: '100px', minWidth: '100px' }} />
                {DIAS.map((d) => (
                  <th key={d.dia} style={{ fontSize: '11px', color: '#888780', fontWeight: 600, textTransform: 'uppercase', padding: '4px 8px', textAlign: 'center', letterSpacing: '0.5px' }}>
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {refeicoesExibir.map((refeicao) => (
                <tr key={refeicao}>
                  <td style={{ fontSize: '10px', color: '#888780', fontWeight: 600, textTransform: 'uppercase', padding: '4px 6px', verticalAlign: 'middle', whiteSpace: 'nowrap', width: '100px', minWidth: '100px' }}>
                    {REFEICAO_LABELS[refeicao]}
                  </td>
                  {DIAS.map((d) => {
                    const prep = getPrep(d.dia, refeicao)
                    return (
                      <td key={d.dia} style={{ verticalAlign: 'top', padding: '2px' }}>
                        <div
                          onClick={() => prep && setDetalhe(prep)}
                          style={{
                            background: prep ? '#fff' : '#FAFAF8',
                            border: prep ? '1px solid #E5E3DC' : '1px dashed #E5E3DC',
                            borderRadius: '8px',
                            padding: '8px',
                            minHeight: '70px',
                            cursor: prep ? 'pointer' : 'default',
                            fontSize: '11px',
                            color: prep ? '#2C2C2A' : '#C8C6BF',
                          }}
                        >

                          {prep ? (
                            <>
                              {prep.ingredientes?.map((ing, i) => (
                                <div key={i} style={{ marginBottom: '1px', lineHeight: 1.3 }}>
                                  {ing.nome_ingrediente}
                                  <span style={{ color: '#7B9E6B', marginLeft: '4px' }}>{formatarQuantidade(ing.quantidade_por_idoso, ing.unidade)}</span>
                                </div>
                              ))}
                            </>
                          ) : (
                            <div style={{ textAlign: 'center', paddingTop: '16px' }}>—</div>
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

      {/* Modal detalhe */}
      {detalhe && (
        <Modal
          open={!!detalhe}
          onClose={() => setDetalhe(null)}
          title={formatarNomePreparacao(detalhe.nome)}
          size="md"
          footer={<button className="btn btn-sm" onClick={() => setDetalhe(null)}>Fechar</button>}
        >
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <Badge variant="gray">{detalhe.categoria}</Badge>
            <Badge variant="blue">{REFEICAO_LABELS[detalhe.tipo_refeicao]}</Badge>
          </div>
          {detalhe.ingredientes?.length > 0 && (
            <>
              <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>Ingredientes:</div>
              {detalhe.ingredientes.map((ing) => (
                <div key={ing.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #E5E3DC', fontSize: '13px' }}>
                  <span>{ing.nome_ingrediente}</span>
                  <span style={{ fontWeight: 500 }}>{formatarQuantidade(ing.quantidade_por_idoso, ing.unidade)}</span>
                </div>
              ))}
            </>
          )}
          {detalhe.observacoes && (
            <div style={{ marginTop: '14px', padding: '10px', background: '#FAEEDA', borderRadius: '8px', fontSize: '13px', color: '#412402' }}>
              📝 {detalhe.observacoes}
            </div>
          )}
        </Modal>
      )}

      {/* Modal nova preparação */}
      <Modal
        open={modalNova}
        onClose={() => { setModalNova(false); setForm(FORM_INICIAL) }}
        title="Nova preparação"
        size="lg"
        footer={
          <>
            <button className="btn btn-sm" onClick={() => { setModalNova(false); setForm(FORM_INICIAL) }}>Cancelar</button>
            <button className="btn btn-sm btn-primary" onClick={salvarPreparacao} disabled={salvando}>
              {salvando ? 'Salvando...' : '✓ Salvar preparação'}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="input-group" style={{ gridColumn: '1 / -1' }}>
            <label className="input-label">Nome *</label>
            <input className="input" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: Frango grelhado" />
          </div>
          <div className="input-group">
            <label className="input-label">Categoria</label>
            <select className="input" value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}>
              {['Proteínas', 'Cereais', 'Leguminosas', 'Hortifruti', 'Sopas', 'Massas', 'Bebidas', 'Sobremesas', 'Laticínios', 'Padaria'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Tipo de refeição</label>
            <select className="input" value={form.tipo_refeicao} onChange={(e) => setForm((f) => ({ ...f, tipo_refeicao: e.target.value as RefeicaoTipo }))}>
              {Object.entries(REFEICAO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '10px' }}>Ingredientes</div>
          {form.ingredientes.map((ing, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 70px 32px', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
              <input className="input" value={ing.nome_ingrediente} onChange={(e) => updateIngrediente(idx, 'nome_ingrediente', e.target.value)} placeholder="Ingrediente" />
              <input className="input" type="number" value={ing.quantidade_por_idoso} onChange={(e) => updateIngrediente(idx, 'quantidade_por_idoso', e.target.value)} placeholder="Qtd" min={0} />
              <select className="input" value={ing.unidade} onChange={(e) => updateIngrediente(idx, 'unidade', e.target.value)}>
                <option>g</option><option>ml</option><option>un</option><option>L</option><option>kg</option><option>colher</option>
              </select>
              <button className="btn btn-icon btn-sm" onClick={() => removeIngrediente(idx)} style={{ color: '#A32D2D' }} disabled={form.ingredientes.length === 1}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button className="btn btn-sm" onClick={addIngrediente}><Plus size={13} /> Ingrediente</button>
        </div>
        <div className="input-group" style={{ marginTop: '12px' }}>
          <label className="input-label">Observações</label>
          <textarea className="input" rows={2} value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} placeholder="Alergênicos, modo de preparo..." />
        </div>
      </Modal>
    </div>
  )
}
