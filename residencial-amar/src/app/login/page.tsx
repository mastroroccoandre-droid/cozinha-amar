'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) {
      toast.error('Email ou senha incorretos')
      setLoading(false)
      return
    }

    toast.success('Bem-vindo ao Residencial Amar!')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FAFAF8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '380px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              background: '#E1F5EE',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '24px',
            }}
          >
            🏠
          </div>
          <h1
            style={{
              fontFamily: 'DM Serif Display, serif',
              fontSize: '24px',
              color: '#2C2C2A',
              marginBottom: '4px',
            }}
          >
            Residencial Amar
          </h1>
          <p style={{ fontSize: '13px', color: '#888780' }}>
            Sistema de Gestão Nutricional
          </p>
        </div>

        {/* Card de login */}
        <div className="card">
          <h2 style={{ fontSize: '16px', fontWeight: 500, marginBottom: '20px' }}>
            Entrar no sistema
          </h2>

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="input-group" style={{ marginBottom: '20px' }}>
              <label className="input-label">Senha</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Demo credentials */}
        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            background: '#E6F1FB',
            borderRadius: '10px',
            fontSize: '12px',
            color: '#0C447C',
          }}
        >
          <strong>Ambiente demo:</strong> Crie um usuário no Supabase Auth e configure
          o perfil em Configurações → Usuários.
        </div>
      </div>
    </div>
  )
}
