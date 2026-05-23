import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'Residencial Amar — Gestão Nutricional',
  description: 'Sistema de gestão nutricional para ILPI',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#2C2C2A',
              color: '#fff',
              borderRadius: '10px',
              fontSize: '13px',
              fontFamily: 'DM Sans, sans-serif',
            },
            success: {
              iconTheme: { primary: '#1D9E75', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#A32D2D', secondary: '#fff' },
            },
          }}
        />
      </body>
    </html>
  )
}
