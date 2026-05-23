import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Usuario, Configuracao } from '@/types'

interface AppState {
  // Auth
  usuario: Usuario | null
  setUsuario: (u: Usuario | null) => void

  // Config global
  config: Configuracao | null
  setConfig: (c: Configuracao) => void

  // UI
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void

  // Semana ativa no cardápio
  semanaAtiva: number
  setSemanaAtiva: (s: number) => void

  // Data de hoje para produção
  dataProducao: string
  setDataProducao: (d: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      usuario: null,
      setUsuario: (u) => set({ usuario: u }),

      config: null,
      setConfig: (c) => set({ config: c }),

      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      semanaAtiva: 1,
      setSemanaAtiva: (s) => set({ semanaAtiva: s }),

      dataProducao: new Date().toISOString().split('T')[0],
      setDataProducao: (d) => set({ dataProducao: d }),
    }),
    {
      name: 'residencial-amar-store',
      partialize: (state) => ({
        semanaAtiva: state.semanaAtiva,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
)
