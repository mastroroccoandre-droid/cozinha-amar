'use client'

import { useEffect, useState } from 'react'
import { Save, Plus, Truck, Users, Building } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { Modal, SectionHeader, Badge } from '@/components/ui'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
import type { Configuracao, Fornecedor } from '@/types'

const PERFIL_LABELS: Record<string, string> = {
  'admin@residencialamar.com.br': 'Administração',
  'mxmastrorocco@gmail.com': 'Administração',
  'ffabiulahelena@gmail.com': 'Nutricionista',
  'rosildacardoso1203@gmail.com': 'Cozinha',
}

const PERFIL_VARIANT: Record<string, 'amber' | 'green' | 'blue'> = {
  'admin@residencialamar.com.br': 'amber',
  'mxmastrorocco@gmail.com': 'amber',
  'ffabiulahelena@gmail.com': 'green',
  'rosildacardoso1203@gmail.com': 'blue',
}

export default function ConfiguracoesPage() {
  const { config, setConfig } = useAppStore()
  const [configuracao, setConfiguracao] = useState<Configuracao | null>(null)
  const [usuarios, setUsuarios] = useState<{ id: string; email: string; nome: string }[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [salvandoConfig, setSalvandoConfig] = useState(false)
  const [modalForn, setModalForn] = useState(false)
  const [novoForn, setNovoForn] = useState({ nome: '', contato: '', telefone: '', email: '' })

  async function carregar() {
    const supabase = getSupabase()
    const [configRes, fornsRes] = await Promise.all([
      supabase.from('configuracoes').select('*').single(),
      supabase.from('fornecedores').select('*').eq('ativo', true).order('nome'),
    ])

    if (configRes.data) {
      setConfiguracao(configRes.data)
      setConfig(configRes.data)
    }
    setFornecedores(fornsRes.data ?? [])

    // Busca usuários do Auth
    const { data: authData } = await supabase.auth.getUser()
    // Lista de usuários conhecidos
    setUsuarios([
      { id: '1', email: 'admin@residencialamar.com.br', nome: 'Admin' },
      { id: '2', email: 'mxmastrorocco@gmail.com', nome: 'André' },
      { id: '3', email: 'ffabiulahelena@gmail.com', nome: 'Fabíula' },
      { id: '4', email: 'rosildacardoso1203@gmail.com', nome: 'Rosilda' },
    ])
  }

  useEffect(() => { carregar() }, [])

  async function salvarConfig() {
    if (!configuracao) return
    setSalvandoConfig(true)
    const supabase = getSupabase()
    const { error } = await supabase.from('configuracoes').update({
      nome_ilpi: configuracao.nome_ilpi,
      responsavel_tecnico: configuracao.responsavel_tecnico,
      num_idosos: configuracao.num_idosos,
      margem_seguranca: configuracao.margem_seguranca,
      fator_correcao: configuracao.fator_correcao,
    }).eq('id', configuracao.id)

    if (!error) {
      setConfig(configuracao)
      toast.success('Configurações salvas!')
    } else {
      toast.error('Erro ao salvar')
    }
    setSalvandoConfig(false)
  }

  async function salvarFornecedor() {
    if (!novoForn.nome.trim()) return toast.error('Informe o nome do fornecedor')
    const supabase = getSupabase()
    const { error } = await supabase.from('fornecedores').insert(novoForn)
    if (!error) {
      toast.success('Fornecedor adicionado!')
      setModalForn(false)
      setNovoForn({ nome: '', contato: '', telefone: '', email: '' })
      carregar()
    }
  }

  if (!configuracao) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#888780' }}>Carregando...</div>
  }

  return (
    <div>
      <SectionHeader title="Configurações" subtitle="Parâmetros gerais do sistema" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Config geral */}
        <div>
          <div className="card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '14px', fontWeight: 500 }}>
              <Building size={16} style={{ color: '#1D9E75' }} />
              Informações da ILPI
            </div>

            <div className="input-group">
              <label className="input-label">Nome da instituição</label>
              <input className="input" value={configuracao.nome_ilpi}
                onChange={(e) => setConfiguracao(c => c ? { ...c, nome_ilpi: e.target.value } : c)} />
            </div>

            <div className="input-group">
              <label className="input-label">Responsável técnico</label>
              <input className="input" value={configuracao.responsavel_tecnico ?? ''}
                onChange={(e) => setConfiguracao(c => c ? { ...c, responsavel_tecnico: e.target.value } : c)}
                placeholder="Nome e CRN da nutricionista" />
            </div>

            <div className="input-group">
              <label className="input-label">Número de idosos ativos</label>
              <input className="input" type="number" min={1} value={configuracao.num_idosos}
                onChange={(e) => setConfiguracao(c => c ? { ...c, num_idosos: Number(e.target.value) } : c)} />
            </div>

            <div className="input-group">
              <label className="input-label">Margem de segurança (%)</label>
              <select className="input" value={configuracao.margem_seguranca}
                onChange={(e) => setConfiguracao(c => c ? { ...c, margem_seguranca: Number(e.target.value) } : c)}>
                <option value={5}>5%</option>
                <option value={10}>10%</option>
                <option value={15}>15%</option>
                <option value={20}>20%</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Fator de correção</label>
              <select className="input" value={configuracao.fator_correcao}
                onChange={(e) => setConfiguracao(c => c ? { ...c, fator_correcao: Number(e.target.value) } : c)}>
                <option value={1.0}>1.0 — Sem correção</option>
                <option value={1.1}>1.1 — +10% (recomendado)</option>
                <option value={1.15}>1.15 — +15%</option>
                <option value={1.2}>1.2 — +20%</option>
              </select>
            </div>

            <button className="btn btn-primary" onClick={salvarConfig} disabled={salvandoConfig}>
              <Save size={14} />
              {salvandoConfig ? 'Salvando...' : 'Salvar configurações'}
            </button>
          </div>

          {/* Fornecedores */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500 }}>
                <Truck size={16} style={{ color: '#185FA5' }} />
                Fornecedores
              </div>
              <button className="btn btn-sm" onClick={() => setModalForn(true)}>
                <Plus size={12} /> Novo
              </button>
            </div>

            {fornecedores.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#888780', fontSize: '13px' }}>
                Nenhum fornecedor cadastrado
              </div>
            ) : fornecedores.map((f) => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid #E5E3DC' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#E6F1FB', color: '#185FA5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Truck size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{f.nome}</div>
                  {f.contato && <div style={{ fontSize: '11px', color: '#888780' }}>{f.contato}</div>}
                </div>
                {f.telefone && <div style={{ fontSize: '12px', color: '#888780' }}>{f.telefone}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Usuários */}
        <div className="card">
          <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} style={{ color: '#1D9E75' }} />
            Usuários do sistema
          </div>

          {usuarios.map((u) => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #E5E3DC' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%',
                background: PERFIL_VARIANT[u.email] === 'amber' ? '#FAEEDA' : PERFIL_VARIANT[u.email] === 'green' ? '#E1F5EE' : '#E6F1FB',
                color: PERFIL_VARIANT[u.email] === 'amber' ? '#BA7517' : PERFIL_VARIANT[u.email] === 'green' ? '#1D9E75' : '#185FA5',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 500, flexShrink: 0,
              }}>
                {u.nome.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{u.nome}</div>
                <div style={{ fontSize: '11px', color: '#888780' }}>{u.email}</div>
              </div>
              <Badge variant={PERFIL_VARIANT[u.email] ?? 'gray'}>
                {PERFIL_LABELS[u.email] ?? 'Administração'}
              </Badge>
            </div>
          ))}

          <div style={{ marginTop: '16px', padding: '12px', background: '#E6F1FB', borderRadius: '8px', fontSize: '12px', color: '#0C447C' }}>
            <strong>Para adicionar usuários:</strong> crie no painel do Supabase em Authentication → Users.
          </div>

          {/* Níveis de acesso */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '12px' }}>Níveis de acesso</div>
            {[
              { perfil: 'Administração', cor: '#BA7517', desc: 'Acesso total: edição, aprovação, relatórios, configurações, impressão' },
              { perfil: 'Nutricionista', cor: '#1D9E75', desc: 'Edição de cardápio, preparações, ingredientes e quantidades' },
              { perfil: 'Cozinha', cor: '#185FA5', desc: 'Visualizar produção do dia, confirmar utilização, registrar perdas' },
            ].map((nivel) => (
              <div key={nivel.perfil} style={{ display: 'flex', gap: '10px', padding: '10px', background: '#FAFAF8', borderRadius: '8px', marginBottom: '8px', borderLeft: `3px solid ${nivel.cor}` }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: nivel.cor }}>{nivel.perfil}</div>
                  <div style={{ fontSize: '11px', color: '#888780', marginTop: '2px' }}>{nivel.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Fornecedor */}
      <Modal open={modalForn} onClose={() => setModalForn(false)} title="Novo fornecedor" size="sm"
        footer={<><button className="btn btn-sm" onClick={() => setModalForn(false)}>Cancelar</button><button className="btn btn-sm btn-primary" onClick={salvarFornecedor}>✓ Salvar</button></>}>
        <div className="input-group">
          <label className="input-label">Nome *</label>
          <input className="input" value={novoForn.nome} onChange={(e) => setNovoForn(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Atacadão" />
        </div>
        <div className="input-group">
          <label className="input-label">Contato</label>
          <input className="input" value={novoForn.contato} onChange={(e) => setNovoForn(f => ({ ...f, contato: e.target.value }))} placeholder="Nome do responsável" />
        </div>
        <div className="input-group">
          <label className="input-label">Telefone</label>
          <input className="input" value={novoForn.telefone} onChange={(e) => setNovoForn(f => ({ ...f, telefone: e.target.value }))} placeholder="(11) 99999-0000" />
        </div>
        <div className="input-group">
          <label className="input-label">Email</label>
          <input className="input" type="email" value={novoForn.email} onChange={(e) => setNovoForn(f => ({ ...f, email: e.target.value }))} placeholder="fornecedor@email.com" />
        </div>
      </Modal>
    </div>
  )
}
