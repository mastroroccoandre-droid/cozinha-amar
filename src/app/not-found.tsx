import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FAFAF8',
        textAlign: 'center',
        padding: '24px',
      }}
    >
      <div>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏠</div>
        <h1
          style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: '28px',
            color: '#2C2C2A',
            marginBottom: '8px',
          }}
        >
          Página não encontrada
        </h1>
        <p style={{ color: '#888780', marginBottom: '24px', fontSize: '14px' }}>
          A página que você está procurando não existe.
        </p>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: '#1D9E75',
            color: '#fff',
            borderRadius: '10px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          ← Voltar ao Dashboard
        </Link>
      </div>
    </div>
  )
}
