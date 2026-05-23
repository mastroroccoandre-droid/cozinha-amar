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
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #EDF3EA 0%, #FCEEF0 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '72px', height: '72px',
            background: '#fff',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '32px',
            boxShadow: '0 4px 20px rgba(123,158,107,0.15)',
          }}>
            🏠
          </div>
          <h1 style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: '26px',
            color: '#3D4F38',
            marginBottom: '4px',
            lineHeight: 1.2,
          }}>
            Residencial <span style={{ color: '#C97070' }}>Amar</span>
          </h1>
          <p style={{ fontSize: '13px', color: '#7B9E6B' }}>
            Sistema de Gestão Nutricional
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 500, marginBottom: '20px', color: '#2C2C2A' }}>
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
              style={{
                width: '100%',
                padding: '12px',
                background: loading ? '#9DB98F' : '#7B9E6B',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                transition: 'background 0.15s',
              }}
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#9DB98F', marginTop: '16px' }}>
          Lar para Idosos · Hospedagem e Day Care
        </p>
      </div>
    </div>
  )
}
