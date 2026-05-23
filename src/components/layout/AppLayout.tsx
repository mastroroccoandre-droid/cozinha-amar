'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, ChefHat, CalendarDays, BookOpen,
  Package, ShoppingCart, BarChart3, Settings, Menu, LogOut, Users
} from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const NAV = [
  {
    section: 'Principal',
    items: [
      { href: '/dashboard',     label: 'Dashboard',       icon: LayoutDashboard },
      { href: '/producao',      label: 'Produção do Dia', icon: ChefHat },
    ],
  },
  {
    section: 'Cardápio',
    items: [
      { href: '/cardapio',      label: 'Cardápio Semanal', icon: CalendarDays },
      { href: '/preparacoes',   label: 'Preparações',      icon: BookOpen },
    ],
  },
  {
    section: 'Estoque',
    items: [
      { href: '/estoque',       label: 'Estoque',          icon: Package },
      { href: '/compras',       label: 'Lista de Compras', icon: ShoppingCart },
    ],
  },
  {
    section: 'Gestão',
    items: [
      { href: '/relatorios',    label: 'Relatórios',       icon: BarChart3 },
      { href: '/configuracoes', label: 'Configurações',    icon: Settings },
    ],
  },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { sidebarOpen, setSidebarOpen, usuario, config } = useAppStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    toast.success('Sessão encerrada')
    router.push('/login')
  }

  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#3D4F38' }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        {/* Ícone rosa */}
        <div style={{
          width: '40px', height: '40px',
          background: 'rgba(232,160,160,0.2)',
          borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '10px',
          fontSize: '20px',
        }}>🏠</div>
        <div style={{ fontFamily: 'DM Serif Display, serif', color: '#fff', fontSize: '17px', lineHeight: 1.2 }}>
          Residencial<br />
          <span style={{ color: '#F0BABA' }}>Amar</span>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', marginTop: '4px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          ILPI · Gestão Nutricional
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {NAV.map((group) => (
          <div key={group.section}>
            <div style={{ padding: '10px 16px 4px', color: 'rgba(255,255,255,0.25)', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 500 }}>
              {group.section}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn('sidebar-nav-item', active && 'active')}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 10px',
          background: 'rgba(123,158,107,0.2)',
          borderRadius: '8px',
          marginBottom: '10px',
        }}>
          <Users size={14} style={{ color: '#9DB98F' }} />
          <span style={{ color: '#9DB98F', fontSize: '12px', fontWeight: 500 }}>
            {config?.num_idosos ?? 42} idosos ativos
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'rgba(232,160,160,0.2)', color: '#F0BABA',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 500, flexShrink: 0,
          }}>
            {usuario?.nome?.split(' ').map((p) => p[0]).join('').substring(0, 2) ?? 'US'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {usuario?.nome ?? 'Usuário'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', textTransform: 'capitalize' }}>
              {usuario?.perfil ?? 'cozinha'}
            </div>
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: '4px', borderRadius: '6px', display: 'flex' }} title="Sair">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Desktop sidebar */}
      <aside style={{ width: sidebarOpen ? '220px' : '0', flexShrink: 0, position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 100, overflow: 'hidden', transition: 'width 0.2s ease' }} className="hidden md:block">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside style={{ position: 'fixed', top: 0, left: 0, width: '240px', height: '100vh', zIndex: 201, transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.2s ease' }} className="md:hidden">
        <SidebarContent />
      </aside>

      {/* Main */}
      <div style={{ marginLeft: sidebarOpen ? '220px' : '0', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', transition: 'margin-left 0.2s ease' }}>
        {/* Topbar */}
        <header style={{ background: '#fff', borderBottom: '1px solid #E5E3DC', padding: '0 20px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn btn-icon btn-sm" onClick={() => { setSidebarOpen(!sidebarOpen); setMobileOpen(!mobileOpen) }}>
              <Menu size={16} />
            </button>
            <PageTitle pathname={pathname} />
          </div>
          <div style={{ fontSize: '12px', color: '#888780' }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: '20px' }} className="animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}

function PageTitle({ pathname }: { pathname: string }) {
  const titles: Record<string, string> = {
    '/dashboard':     'Dashboard',
    '/producao':      'Produção do Dia',
    '/cardapio':      'Cardápio Semanal',
    '/preparacoes':   'Preparações',
    '/estoque':       'Controle de Estoque',
    '/compras':       'Lista de Compras',
    '/relatorios':    'Relatórios',
    '/configuracoes': 'Configurações',
  }
  return <span style={{ fontSize: '15px', fontWeight: 500 }}>{titles[pathname] ?? 'Residencial Amar'}</span>
}
