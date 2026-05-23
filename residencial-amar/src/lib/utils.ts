import { type ClassValue, clsx } from 'clsx'
import { format, differenceInDays, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Produto } from '@/types'

// ── CSS ───────────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// ── DATAS ─────────────────────────────────────────────────────────────
export function formatDate(date: string | Date, fmt = 'dd/MM/yyyy') {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: ptBR })
}

export function formatDateTime(date: string | Date) {
  return formatDate(date, "dd/MM/yyyy 'às' HH:mm")
}

export function getDiasParaVencer(validade?: string): number | null {
  if (!validade) return null
  return differenceInDays(parseISO(validade), new Date())
}

export function getStatusValidade(validade?: string): 'ok' | 'vencendo' | 'vencido' {
  const dias = getDiasParaVencer(validade)
  if (dias === null) return 'ok'
  if (dias < 0) return 'vencido'
  if (dias <= 5) return 'vencendo'
  return 'ok'
}

// ── ESTOQUE ───────────────────────────────────────────────────────────
export function getStatusEstoque(produto: Produto): 'ok' | 'baixo' | 'critico' {
  const ratio = produto.quantidade_atual / produto.estoque_minimo
  if (ratio <= 0.5) return 'critico'
  if (ratio < 1) return 'baixo'
  return 'ok'
}

export function getPorcentagemEstoque(produto: Produto): number {
  if (produto.estoque_minimo === 0) return 100
  return Math.min(100, Math.round((produto.quantidade_atual / (produto.estoque_minimo * 1.5)) * 100))
}

// ── CÁLCULOS ──────────────────────────────────────────────────────────
export function calcularQuantidadeTotal(
  quantidadePorIdoso: number,
  numIdosos: number,
  margemSeguranca: number = 10,
  fatorCorrecao: number = 1.0
): number {
  const base = quantidadePorIdoso * numIdosos * fatorCorrecao
  const comMargem = base * (1 + margemSeguranca / 100)
  return Math.ceil(comMargem * 10) / 10
}

export function calcularQuantidadeSemanal(diaria: number, diasSemana = 7): number {
  return diaria * diasSemana
}

// ── FORMATAÇÃO ────────────────────────────────────────────────────────
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatQtd(value: number, unidade: string): string {
  const rounded = Math.round(value * 100) / 100
  return `${rounded} ${unidade}`
}

// ── SEMANA DO CARDÁPIO ────────────────────────────────────────────────
// A semana do cardápio (1–5) é calculada com base no dia do mês
export function getSemanaCardapio(date: Date = new Date()): number {
  const diaDoMes = date.getDate()
  const semana = Math.ceil(diaDoMes / 7)
  return Math.min(semana, 5)
}

// Dia da semana: 0=Segunda … 6=Domingo (diferente do JS que começa no domingo)
export function getDiaSemanaCardapio(date: Date = new Date()): number {
  const jsDay = date.getDay() // 0=Domingo, 1=Segunda...
  return jsDay === 0 ? 6 : jsDay - 1
}

// ── CORES POR CATEGORIA ───────────────────────────────────────────────
export const CATEGORIA_COLORS: Record<string, string> = {
  hortifruti: 'bg-green-100 text-green-800',
  carnes: 'bg-red-100 text-red-800',
  congelados: 'bg-blue-100 text-blue-800',
  secos: 'bg-amber-100 text-amber-800',
  laticinios: 'bg-sky-100 text-sky-800',
  padaria: 'bg-orange-100 text-orange-800',
  limpeza: 'bg-purple-100 text-purple-800',
  bebidas: 'bg-cyan-100 text-cyan-800',
  descartaveis: 'bg-gray-100 text-gray-800',
  outros: 'bg-gray-100 text-gray-700',
}

// ── ÍCONES POR REFEIÇÃO ───────────────────────────────────────────────
export const REFEICAO_ICONS: Record<string, string> = {
  cafe_manha: '☕',
  colacao: '🍎',
  almoco: '🍽️',
  lanche_tarde: '🥗',
  jantar: '🥣',
  ceia: '🌙',
}

// ── SLUGIFY ───────────────────────────────────────────────────────────
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim()
}
