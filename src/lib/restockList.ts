import { useSyncExternalStore } from 'react'

// The restock list is a per-device scratch list (it isn't stored in Supabase),
// kept in localStorage so it survives navigating between tabs and reloads.

export interface RestockItem {
  productId: string
  name: string
  supplierName: string | null
  quantity: number
}

const STORAGE_KEY = 'restock-list'
const listeners = new Set<() => void>()

function read(): RestockItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as RestockItem[]) : []
  } catch {
    return []
  }
}

let items: RestockItem[] = read()

function write(next: RestockItem[]) {
  items = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // storage unavailable (private mode etc.) — keep the in-memory list
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useRestockList() {
  return useSyncExternalStore(subscribe, () => items)
}

// Adds the product, or replaces its quantity if it's already on the list.
export function upsertRestockItem(item: RestockItem) {
  const exists = items.some((i) => i.productId === item.productId)
  write(exists ? items.map((i) => (i.productId === item.productId ? item : i)) : [...items, item])
}

export function removeRestockItem(productId: string) {
  write(items.filter((i) => i.productId !== productId))
}

export function clearRestockList() {
  write([])
}

export function restockListAsText(list: RestockItem[]) {
  if (list.length === 0) return ''
  const groups = new Map<string, RestockItem[]>()
  for (const item of list) {
    const key = item.supplierName ?? 'No supplier'
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  const sections = [...groups.entries()].map(
    ([supplier, group]) => `${supplier}:\n${group.map((i) => `- ${i.name}: ${i.quantity}`).join('\n')}`
  )
  return `Restock list:\n\n${sections.join('\n\n')}`
}
