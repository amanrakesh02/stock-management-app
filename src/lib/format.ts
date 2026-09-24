import type { Product } from './types'

// Double-quote a value for use inside a PostgREST `.or(...)` filter, so user
// input containing commas, dots or parentheses can't break the filter syntax.
export function pgQuote(value: string) {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

export function productSearchFilter(query: string) {
  const v = pgQuote(`%${query}%`)
  return `name.ilike.${v},barcode.ilike.${v},custom_code.ilike.${v}`
}

export function productCodeFilter(code: string) {
  const v = pgQuote(code)
  return `barcode.eq.${v},custom_code.eq.${v}`
}

export type StockStatus = 'out' | 'low' | 'ok'

// "Low" means below the product's reorder quantity; products with a reorder
// quantity of 0 are only flagged once they run out.
export function stockStatus(p: Pick<Product, 'total_stock' | 'reorder_quantity'>): StockStatus {
  if (p.total_stock <= 0) return 'out'
  if (p.reorder_quantity > 0 && p.total_stock < p.reorder_quantity) return 'low'
  return 'ok'
}

export const stockBadgeClass: Record<StockStatus, string> = {
  out: 'bg-red-100 text-red-700',
  low: 'bg-amber-100 text-amber-800',
  ok: 'bg-slate-100 text-slate-700',
}

export function productCode(p: Pick<Product, 'barcode' | 'custom_code'>) {
  return p.barcode || p.custom_code || 'no code'
}

// Local-time YYYY-MM-DD (toISOString would shift the date across midnight UTC).
export function isoDate(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(days: number, from = new Date()) {
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return d
}

// Whole days from today until a YYYY-MM-DD date (negative once it has passed).
export function daysUntil(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function expiryLabel(dateStr: string) {
  const days = daysUntil(dateStr)
  if (days < 0) return `Expired ${-days}d ago`
  if (days === 0) return 'Expires today'
  if (days === 1) return 'Expires tomorrow'
  return `Expires in ${days}d`
}

export function expiryBadgeClass(dateStr: string) {
  const days = daysUntil(dateStr)
  if (days < 0) return 'bg-red-100 text-red-700'
  if (days <= 7) return 'bg-amber-100 text-amber-800'
  return 'bg-slate-100 text-slate-700'
}
