'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, ChevronRight } from 'lucide-react'
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
  // "Almoço Sem1/Dia0" → "Almoço — Segunda, Sem 1"
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
  const numIdosos = config?.num_idosos ?? 42

  const [preparacoes, setPreparacoes] = useState<(Preparacao & { ingredientes: PreparacaoIngrediente[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [detalhe, setDetalhe] = useState<Preparacao | null>(null)
  const [modalNova, setModalNova] = useState(false)
  const [form, setForm] = useState<PrepForm>(FORM_INICIAL)
  const [salvando, setSalvando] = useState(false)
  const [filtroRefeicao, setFiltroRefeicao] = useState('todas')
  const [busca, setBusca] = useState('')

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

  const filtradas = preparacoes.filter((p) => {
    const matchRefeicao = filtroRefeicao === 'todas' || p.tipo_refeicao === filtroRefeicao
    const matchBusca = busca === '' || formatarNomePreparacao(p.nome).toLowerCase().includes(busca.toLowerCase())
    return matchRefeicao && matchBusca
  })

  function addIngrediente() {
    setForm((f) => ({
      ...f,
      ingredientes: [...f.ingredientes, { nome_ingrediente: '', quantidade_por_idoso: '', unidade: 'g' }],
    }))
  }

  function removeIngrediente(idx: number) {
    setForm((f) => ({
      ...f,
      ingredientes: f.ingredientes.filter((_, i) => i !== idx),
    }))
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

    const { data: prep, error } = await supabase
      .from('preparacoes')
      .insert({
        nome: form.nome,
        categoria: form.categoria,
        tipo_refeicao: form.tipo_refeicao,
        observacoes: form.observacoes,
        substituicoes: form.substituicoes,
      })
      .select()
      .single()

    if (error || !prep) {
      toast.error('Erro ao salvar preparação')
      setSalvando(false)
      return
    }

    const ings = form.ingredientes.filter((i) => i.nome_ingrediente.trim())
    if (ings.length > 0) {
      await supabase.from('preparacao_ingredientes').insert(
        ings.map((i) => ({
          preparacao_id: prep.id,
          nome_ingrediente: i.nome_ingrediente,
          quantidade_por_idoso: parseFloat(i.quantidade_por_idoso) || 0,
          unidade: i.unidade,
        }))
      )
    }

    toast.success('Preparação cadastrada!')
    setModalNova(false)
    setForm(FORM_INICIAL)
    setSalvando(false)
    carregar()
  }

  const REFEICAO_FILTROS = [
    { value: 'todas', label: 'Todas' },
    { value: 'cafe_manha', label: 'Café da manhã' },
    { value: 'colacao', label: 'Colação' },
    { value: 'almoco', label: 'Almoço' },
    { value: 'lanche_tarde', label: 'Lanche' },
    { value: 'jantar', label: 'Jantar' },
    { value: 'ceia', label: 'Ceia' },
  ]

  return (
    <div>
      <SectionHeader
        title="Preparações"
        subtitle={`${preparacoes.length} receitas cadastradas`}
        action={
          <button className="btn btn-primary" onClick={() => setModalNova(true)}>
            <Plus size={14} />
            Nova preparação
          </button>
        }
      />

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {REFEICAO_FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltroRefeicao(f.value)}
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              border: filtroRefeicao === f.value ? 'none' : '1px solid #E5E3DC',
              background: filtroRefeicao === f.value ? '#7B9E6B' : '#fff',
              color: filtroRefeicao === f.value ? '#fff' : '#5F5E5A',
              transition: 'all 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Busca */}
      <input
        className="input"
        placeholder="Buscar preparação..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        style={{ marginBottom: '16px', maxWidth: '360px' }}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#888780' }}>Carregando...</div>
      ) : filtradas.length === 0 ? (
        <EmptyState
          icon="📖"
          title="Nenhuma preparação encontrada"
          description="Tente outro filtro ou adicione uma nova preparação"
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
          {filtradas.map((prep) => (
            <div
              key={prep.id}
              className="card"
              style={{ cursor: 'pointer' }}
              onClick={() => setDetalhe(prep)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: '#2C2C2A' }}>
                    {formatarNomePreparacao(prep.nome)}
                  </div>
                  <Badge variant="gray">{REFEICAO_LABELS[prep.tipo_refeicao]}</Badge>
                </div>
                <ChevronRight size={16} style={{ color: '#888780', flexShrink: 0 }} />
              </div>

              {/* Ingredientes resumo */}
              <div style={{ marginTop: '8px' }}>
                {prep.ingredientes?.slice(0, 3).map((ing) => (
                  <div key={ing.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#5F5E5A', padding: '2px 0' }}>
                    <span>{ing.nome_ingrediente}</span>
                    <span style={{ fontWeight: 500 }}>{ing.quantidade_por_idoso} {ing.unidade}</span>
                  </div>
                ))}
                {(prep.ingredientes?.length ?? 0) > 3 && (
                  <div style={{ fontSize: '11px', color: '#888780', marginTop: '2px' }}>
                    +{(prep.ingredientes?.length ?? 0) - 3} ingredientes
                  </div>
                )}
              </div>
            </div>
          ))}
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

          {(detalhe as any).ingredientes?.length > 0 && (
            <>
              <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>Ingredientes:</div>
              {(detalhe as any).ingredientes.map((ing: PreparacaoIngrediente) => (
                <div key={ing.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #E5E3DC', fontSize: '13px' }}>
                  <span>{ing.nome_ingrediente}</span>
                  <span style={{ fontWeight: 500 }}>{ing.quantidade_por_idoso} {ing.unidade}</span>
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
            <label className="input-label">Nome da preparação *</label>
            <input className="input" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: Frango grelhado com alho" />
          </div>
          <div className="input-group">
            <label className="input-label">Categoria</label>
            <select className="input" value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}>
              {['Proteínas', 'Cereais', 'Leguminosas', 'Hortifruti', 'Sopas', 'Massas', 'Bebidas', 'Sobremesas', 'Laticínios', 'Padaria'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Tipo de refeição</label>
            <select className="input" value={form.tipo_refeicao} onChange={(e) => setForm((f) => ({ ...f, tipo_refeicao: e.target.value as RefeicaoTipo }))}>
              {Object.entries(REFEICAO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginTop: '16px', marginBottom: '8px' }}>
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
          <textarea className="input" rows={2} value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} placeholder="Alergênicos, modo de preparo especial..." />
        </div>
        <div className="input-group">
          <label className="input-label">Possíveis substituições</label>
          <textarea className="input" rows={2} value={form.substituicoes} onChange={(e) => setForm((f) => ({ ...f, substituicoes: e.target.value }))} placeholder="Ex: Pode substituir frango por peixe..." />
        </div>
      </Modal>
    </div>
  )
}
