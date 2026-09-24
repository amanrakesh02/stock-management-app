import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import BarcodeScanner from '../components/BarcodeScanner'
import Modal from '../components/Modal'
import { friendlyProductError, productCode, stockBadgeClass, stockStatus } from '../lib/format'
import type { Product, Supplier } from '../lib/types'
import {
  cardClass,
  errorClass,
  inputClass,
  labelClass,
  listClass,
  pageTitleClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../lib/ui'

type Filter = 'all' | 'low' | 'out' | 'discontinued'

const filterLabels: Record<Filter, string> = {
  all: 'Active',
  low: 'Low',
  out: 'Out',
  discontinued: 'Discontinued',
}

function matchesFilter(p: Product, filter: Filter) {
  if (filter === 'discontinued') return p.status === 'discontinued'
  if (p.status !== 'active') return false
  if (filter === 'low') return stockStatus(p) === 'low'
  if (filter === 'out') return stockStatus(p) === 'out'
  return true
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [barcode, setBarcode] = useState('')
  const [customCode, setCustomCode] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [reorderQty, setReorderQty] = useState('0')
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = () => {
    supabase
      .from('product_details')
      .select('*')
      .order('name')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setProducts(data as Product[])
        setLoading(false)
      })
  }

  useEffect(() => {
    load()
    supabase
      .from('suppliers')
      .select('id, name, contact')
      .order('name')
      .then(({ data, error }) => {
        if (error) console.error(error)
        else setSuppliers(data as Supplier[])
      })
  }, [])

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, low: 0, out: 0, discontinued: 0 }
    for (const p of products) {
      for (const f of Object.keys(c) as Filter[]) if (matchesFilter(p, f)) c[f]++
    }
    return c
  }, [products])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter(
      (p) =>
        matchesFilter(p, filter) &&
        (!q || [p.name, p.barcode, p.custom_code].some((v) => v?.toLowerCase().includes(q)))
    )
  }, [products, filter, query])

  const addProduct = async () => {
    if (!name.trim()) return setError('Enter a product name.')
    setSaving(true)
    const { error } = await supabase.from('products').insert({
      name: name.trim(),
      barcode: barcode.trim() || null,
      custom_code: customCode.trim() || null,
      supplier_id: supplierId || null,
      reorder_quantity: Number(reorderQty) || 0,
    })
    setSaving(false)
    if (error) return setError(friendlyProductError(error))
    setError(null)
    setName('')
    setBarcode('')
    setCustomCode('')
    setReorderQty('0')
    setAdding(false)
    load()
  }

  if (loading) return <p className="py-8 text-center text-sm text-slate-500">Loading...</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className={pageTitleClass}>Products</h2>
        {!adding && (
          <button onClick={() => setAdding(true)} className={`${primaryButtonClass} px-3`}>
            + New product
          </button>
        )}
      </div>

      {error && <p className={errorClass}>{error}</p>}

      {adding && (
        <div className={cardClass}>
          <p className="text-sm font-semibold text-slate-900">New product</p>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" className={inputClass} />
          <div className="flex gap-2">
            <input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Barcode (optional)"
              className={`min-w-0 flex-1 ${inputClass}`}
            />
            <button type="button" onClick={() => setScanning(true)} className={secondaryButtonClass}>
              Scan
            </button>
          </div>
          <input
            value={customCode}
            onChange={(e) => setCustomCode(e.target.value)}
            placeholder="Custom code (optional, for items without a barcode)"
            className={inputClass}
          />
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputClass}>
            <option value="">No supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <label className={labelClass}>
            Reorder quantity
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={reorderQty}
              onChange={(e) => setReorderQty(e.target.value)}
              className={`mt-1 w-full ${inputClass}`}
            />
          </label>
          <button onClick={addProduct} disabled={saving} className={primaryButtonClass}>
            {saving ? 'Saving...' : 'Add product'}
          </button>
          <button onClick={() => setAdding(false)} className={`${secondaryButtonClass} py-2`}>
            Cancel
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name, barcode, or code"
          className={inputClass}
        />
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {(Object.keys(filterLabels) as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                filter === f
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {filterLabels[f]} <span className={filter === f ? 'text-indigo-200' : 'text-slate-400'}>{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-center text-sm text-slate-500">
          {products.length === 0 ? 'No products yet — add your first one above.' : 'No products match.'}
        </p>
      ) : (
        <ul className={listClass}>
          {visible.map((p) => {
            const status = stockStatus(p)
            return (
              <li key={p.id}>
                <Link
                  to={`/products/${p.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{p.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {productCode(p)} · {p.supplier_name ?? 'no supplier'}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      p.status === 'discontinued' ? stockBadgeClass.ok : stockBadgeClass[status]
                    }`}
                  >
                    {p.total_stock} on hand
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {scanning && (
        <Modal title="Scan barcode" onClose={() => setScanning(false)}>
          <BarcodeScanner
            onScan={(code) => {
              setBarcode(code)
              setScanning(false)
            }}
            onError={(msg) => {
              setError(msg)
              setScanning(false)
            }}
          />
        </Modal>
      )}
    </div>
  )
}
