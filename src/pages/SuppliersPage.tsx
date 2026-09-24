import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Modal from '../components/Modal'
import type { Supplier } from '../lib/types'
import {
  cardClass,
  dangerButtonClass,
  errorClass,
  inputClass,
  listClass,
  pageTitleClass,
  primaryButtonClass,
} from '../lib/ui'

interface SupplierRow extends Supplier {
  products: { count: number }[]
}

function contactHref(contact: string) {
  if (contact.includes('@')) return `mailto:${contact}`
  if (/^[+\d][\d\s()-]{5,}$/.test(contact)) return `tel:${contact.replace(/[^\d+]/g, '')}`
  return null
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [editing, setEditing] = useState<SupplierRow | null>(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    supabase
      .from('suppliers')
      .select('id, name, contact, products(count)')
      .order('name')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setSuppliers(data as SupplierRow[])
        setLoading(false)
      })
  }

  useEffect(load, [])

  const addSupplier = async () => {
    if (!name.trim()) return setError('Enter a supplier name.')
    setSaving(true)
    const { error } = await supabase.from('suppliers').insert({ name: name.trim(), contact: contact.trim() || null })
    setSaving(false)
    if (error) return setError(error.message)
    setError(null)
    setName('')
    setContact('')
    load()
  }

  const saveEdit = async () => {
    if (!editing) return
    if (!editing.name.trim()) return setError('Supplier name cannot be empty.')
    setSaving(true)
    const { error } = await supabase
      .from('suppliers')
      .update({ name: editing.name.trim(), contact: editing.contact?.trim() || null })
      .eq('id', editing.id)
    setSaving(false)
    if (error) return setError(error.message)
    setError(null)
    setEditing(null)
    load()
  }

  const deleteSupplier = async () => {
    if (!editing || !confirm(`Delete supplier "${editing.name}"?`)) return
    setSaving(true)
    const { error } = await supabase.from('suppliers').delete().eq('id', editing.id)
    setSaving(false)
    if (error) {
      // 23503 = foreign key violation: products or deliveries still reference it
      setError(
        error.code === '23503'
          ? `Can't delete "${editing.name}" while products or deliveries still reference it.`
          : error.message
      )
      setEditing(null)
      return
    }
    setError(null)
    setEditing(null)
    load()
  }

  if (loading) return <p className="py-8 text-center text-sm text-slate-500">Loading...</p>

  return (
    <div className="flex flex-col gap-6">
      <h2 className={pageTitleClass}>Suppliers</h2>

      {error && <p className={errorClass}>{error}</p>}

      <div className={cardClass}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Supplier name" className={inputClass} />
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Phone or email (optional)"
          className={inputClass}
        />
        <button onClick={addSupplier} disabled={saving} className={primaryButtonClass}>
          Add supplier
        </button>
      </div>

      {suppliers.length === 0 ? (
        <p className="text-center text-sm text-slate-500">No suppliers yet.</p>
      ) : (
        <ul className={listClass}>
          {suppliers.map((s) => {
            const href = s.contact ? contactHref(s.contact) : null
            const productCount = s.products[0]?.count ?? 0
            return (
              <li
                key={s.id}
                onClick={() => setEditing(s)}
                className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{s.name}</p>
                  {s.contact &&
                    (href ? (
                      <a
                        href={href}
                        onClick={(e) => e.stopPropagation()}
                        className="truncate text-xs text-indigo-600 hover:underline"
                      >
                        {s.contact}
                      </a>
                    ) : (
                      <p className="truncate text-xs text-slate-500">{s.contact}</p>
                    ))}
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {productCount} product{productCount === 1 ? '' : 's'}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {editing && (
        <Modal title="Edit supplier" onClose={() => setEditing(null)}>
          <input
            value={editing.name}
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            placeholder="Supplier name"
            className={inputClass}
          />
          <input
            value={editing.contact ?? ''}
            onChange={(e) => setEditing({ ...editing, contact: e.target.value })}
            placeholder="Phone or email (optional)"
            className={inputClass}
          />
          <button onClick={saveEdit} disabled={saving} className={primaryButtonClass}>
            Save
          </button>
          <button onClick={deleteSupplier} disabled={saving} className={dangerButtonClass}>
            Delete supplier
          </button>
        </Modal>
      )}
    </div>
  )
}
