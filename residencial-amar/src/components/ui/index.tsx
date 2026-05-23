'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── MODAL ─────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const maxWidths = { sm: '400px', md: '520px', lg: '700px' }

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(44,44,42,0.5)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: maxWidths[size],
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: 'fadeIn 0.15s ease-out',
        }}
      >
        <div
          style={{
            padding: '20px 24px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 500 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#888780',
              display: 'flex',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>{children}</div>

        {footer && (
          <div
            style={{
              padding: '0 24px 20px',
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end',
              borderTop: '1px solid #E5E3DC',
              paddingTop: '16px',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ── CONFIRM DIALOG ────────────────────────────────────────────────────
interface ConfirmProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'Confirmar', danger = false, loading = false
}: ConfirmProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn btn-sm" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            className={cn('btn btn-sm', danger ? 'btn-danger' : 'btn-primary')}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Aguarde...' : confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ fontSize: '14px', color: '#5F5E5A' }}>{message}</p>
    </Modal>
  )
}

// ── BADGE ─────────────────────────────────────────────────────────────
interface BadgeProps {
  variant?: 'green' | 'amber' | 'red' | 'blue' | 'gray'
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'gray', children, className }: BadgeProps) {
  return (
    <span className={cn('badge', `badge-${variant}`, className)}>
      {children}
    </span>
  )
}

// ── ALERT ─────────────────────────────────────────────────────────────
interface AlertProps {
  variant?: 'green' | 'amber' | 'red' | 'blue'
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function Alert({ variant = 'amber', icon, children, className }: AlertProps) {
  return (
    <div className={cn('alert', `alert-${variant}`, className)}>
      {icon && <span style={{ flexShrink: 0, marginTop: '1px' }}>{icon}</span>}
      <div>{children}</div>
    </div>
  )
}

// ── PROGRESS BAR ──────────────────────────────────────────────────────
interface ProgressBarProps {
  value: number
  max?: number
  variant?: 'green' | 'amber' | 'red'
  height?: number
}

export function ProgressBar({ value, max = 100, variant = 'green', height = 6 }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="progress-bar" style={{ height }}>
      <div
        className={cn('progress-fill', `progress-${variant}`)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ── EMPTY STATE ───────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon = '📦', title, description, action }: EmptyStateProps) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: '#888780' }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>{icon}</div>
      <div style={{ fontSize: '15px', fontWeight: 500, color: '#5F5E5A', marginBottom: '4px' }}>
        {title}
      </div>
      {description && (
        <div style={{ fontSize: '13px', marginBottom: '20px' }}>{description}</div>
      )}
      {action}
    </div>
  )
}

// ── LOADING SPINNER ───────────────────────────────────────────────────
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: '2px solid #E5E3DC',
        borderTopColor: '#1D9E75',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        display: 'inline-block',
      }}
    />
  )
}

// ── SECTION HEADER ────────────────────────────────────────────────────
interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', gap: '12px' }}>
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: 500 }}>{title}</h2>
        {subtitle && (
          <p style={{ fontSize: '13px', color: '#888780', marginTop: '2px' }}>{subtitle}</p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  )
}

// ── METRIC CARD ───────────────────────────────────────────────────────
interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: React.ReactNode
  color?: string
  onClick?: () => void
}

export function MetricCard({ label, value, sub, icon, color, onClick }: MetricCardProps) {
  return (
    <div
      className="card-sm"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div
        style={{
          fontSize: '12px',
          color: '#888780',
          fontWeight: 500,
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {icon}
        {label}
      </div>
      <div style={{ fontSize: '26px', fontWeight: 500, color: color ?? '#2C2C2A', lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '12px', color: '#888780', marginTop: '4px' }}>{sub}</div>
      )}
    </div>
  )
}

// ── TABS ──────────────────────────────────────────────────────────────
interface TabsProps {
  tabs: { label: string; value: string }[]
  active: string
  onChange: (v: string) => void
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '2px',
        background: '#F1EFE8',
        borderRadius: '10px',
        padding: '3px',
        marginBottom: '20px',
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '7px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            cursor: 'pointer',
            fontWeight: 500,
            border: 'none',
            background: active === tab.value ? '#fff' : 'transparent',
            color: active === tab.value ? '#2C2C2A' : '#5F5E5A',
            boxShadow: active === tab.value ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ── WEEK SELECTOR ─────────────────────────────────────────────────────
interface WeekSelectorProps {
  active: number
  onChange: (week: number) => void
}

export function WeekSelector({ active, onChange }: WeekSelectorProps) {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {[1, 2, 3, 4, 5].map((w) => (
        <button
          key={w}
          onClick={() => onChange(w)}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            border: active === w ? 'none' : '1px solid #E5E3DC',
            background: active === w ? '#1D9E75' : '#fff',
            color: active === w ? '#fff' : '#5F5E5A',
            transition: 'all 0.15s',
          }}
        >
          Semana {w}
        </button>
      ))}
    </div>
  )
}
