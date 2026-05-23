'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FAFAF8',
            textAlign: 'center',
            padding: '24px',
            fontFamily: 'DM Sans, system-ui, sans-serif',
          }}
        >
          <div>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontSize: '20px', fontWeight: 500, marginBottom: '8px', color: '#2C2C2A' }}>
              Ocorreu um erro inesperado
            </h2>
            <p style={{ color: '#888780', marginBottom: '24px', fontSize: '14px' }}>
              Tente novamente ou contate o suporte.
            </p>
            <button
              onClick={reset}
              style={{
                padding: '10px 24px',
                background: '#1D9E75',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
