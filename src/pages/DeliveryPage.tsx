import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import ProductSearch from '../components/ProductSearch'
import { formatDate, isoDate, productCode } from '../lib/format'
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
  successClass,
} from '../lib/ui'

interface LineItem {
  key: string
  product: Product | null
  quantity: string
  expiryDate: string
}

function emptyLineItem(): LineItem {
  return { key: crypto.randomUUID(), product: null, quantity: '', expiryDate: '' }
}

interface DeliveryRow {
  id: string
  delivered_at: string
  reference: string | null
  suppliers: { name: string } | null
  batches: { id: string; quantity: number; expiry_date: string | null; products: { name: string } | null }[]
}

function DeliveryHistory() {
  const [deliveries, setDeliveries] = useState<DeliveryRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('deliveries')
      .select('id, delivered_at, reference, suppliers(name), batches(id, quantity, expiry_date, products(name))')
      .order('delivered_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setDeliveries(data as unknown as DeliveryRow[])
      })
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-slate-700">Recent deliveries</h3>
      {error && <p className={errorClass}>{error}</p>}
      {deliveries === null && !error && <p className="text-sm text-slate-500">Loading...</p>}
      {deliveries?.length === 0 && <p className="text-sm text-slate-500">No deliveries recorded yet.</p>}
      {deliveries && deliveries.length > 0 && (
        <ul className={listClass}>
          {deliveries.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{d.suppliers?.name ?? 'Unknown supplier'}</p>
                  <p className="truncate text-xs text-slate-500">
                    {formatDate(d.delivered_at)}
                    {d.reference ? ` · ${d.reference}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-slate-500">
                  {d.batches.length} item{d.batches.length === 1 ? '' : 's'} {expanded === d.id ? '▴' : '▾'}
                </span>
              </button>
              {expanded === d.id && (
                <ul className="flex flex-col gap-1 bg-slate-50 px-4 py-2">
                  {d.batches.map((b) => (
                    <li key={b.id} className="flex justify-between gap-3 text-xs text-slate-600">
                      <span className="truncate">{b.products?.name ?? 'Unknown product'}</span>
                      <span className="shrink-0">
                        {b.quantity > 0 ? `${b.quantity} left` : 'used up'}
                        {b.expiry_date ? ` · exp ${formatDate(b.expiry_date)}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function DeliveryPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [deliveredAt, setDeliveredAt] = useState(isoDate())
  const [reference, setReference] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLineItem()])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  // Bumped after each saved delivery so the history list refetches.
  const [historyKey, setHistoryKey] = useState(0)

  useEffect(() => {
    supabase
      .from('suppliers')
      .select('id, name, contact')
      .order('name')
      .then(({ data, error }) => {
        if (error) console.error(error)
        else setSuppliers(data as Supplier[])
      })
  }, [])

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => setSuccess(false), 3000)
    return () => clearTimeout(timer)
  }, [success])

  const updateLineItem = (key: string, patch: Partial<LineItem>) => {
    setLineItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  const removeLineItem = (key: string) => {
    setLineItems((prev) => (prev.length > 1 ? prev.filter((item) => item.key !== key) : prev))
  }

  const resetForm = () => {
    setSupplierId('')
    setDeliveredAt(isoDate())
    setReference('')
    setLineItems([emptyLineItem()])
  }

  const submit = async () => {
    setError(null)
    if (!supplierId) return setError('Select a supplier.')
    if (!deliveredAt) return setError('Enter a delivery date.')

    const validItems = lineItems.filter((item) => item.product && Number(item.quantity) > 0)
    if (validItems.length === 0) return setError('Add at least one line item with a product and quantity.')
    if (validItems.length !== lineItems.length) {
      return setError('Every line item needs a product and a quantity greater than 0.')
    }

    setSubmitting(true)
    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .insert({ supplier_id: supplierId, delivered_at: deliveredAt, reference: reference.trim() || null })
      .select('id')
      .single()

    if (deliveryError || !delivery) {
      setSubmitting(false)
      return setError(deliveryError?.message ?? 'Failed to create delivery.')
    }

    const batchRows = validItems.map((item) => ({
      product_id: item.product!.id,
      delivery_id: delivery.id,
      quantity: Number(item.quantity),
      expiry_date: item.expiryDate || null,
    }))

    const { error: batchError } = await supabase.from('batches').insert(batchRows)
    if (batchError) {
      // don't leave an empty delivery behind if its items failed to save
      await supabase.from('deliveries').delete().eq('id', delivery.id)
      setSubmitting(false)
      return setError(batchError.message)
    }

    setSubmitting(false)
    setSuccess(true)
    setHistoryKey((k) => k + 1)
    resetForm()
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className={pageTitleClass}>Record Delivery</h2>

      {success && <p className={successClass}>Delivery recorded.</p>}
      {error && <p className={errorClass}>{error}</p>}

      <div className={cardClass}>
        <label className={labelClass}>Supplier</label>
        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className={inputClass}
        >
          <option value="">Select a supplier</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <label className={labelClass}>Delivery date</label>
        <input
          type="date"
          value={deliveredAt}
          onChange={(e) => setDeliveredAt(e.target.value)}
          className={inputClass}
        />

        <label className={labelClass}>Reference / invoice no. (optional)</label>
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="e.g. INV-1042"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-3">
        {lineItems.map((item, i) => (
          <div key={item.key} className={cardClass}>
            <div className="flex items-center justify-between">
              <p className={labelClass}>Item {i + 1}</p>
              {lineItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLineItem(item.key)}
                  className="text-xs font-medium text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>

            {item.product ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{item.product.name}</p>
                  <p className="truncate text-xs text-slate-500">{productCode(item.product)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateLineItem(item.key, { product: null })}
                  className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Change
                </button>
              </div>
            ) : (
              <ProductSearch onSelect={(p) => updateLineItem(item.key, { product: p })} />
            )}

            <div className="flex gap-2">
              <label className={`flex-1 ${labelClass}`}>
                Quantity received
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateLineItem(item.key, { quantity: e.target.value })}
                  className={`mt-1 w-full ${inputClass}`}
                />
              </label>
              <label className={`flex-1 ${labelClass}`}>
                Expiry (optional)
                <input
                  type="date"
                  value={item.expiryDate}
                  onChange={(e) => updateLineItem(item.key, { expiryDate: e.target.value })}
                  className={`mt-1 w-full ${inputClass}`}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setLineItems((prev) => [...prev, emptyLineItem()])}
        className={secondaryButtonClass + ' py-2'}
      >
        Add line item
      </button>

      <button onClick={submit} disabled={submitting} className={primaryButtonClass}>
        {submitting ? 'Saving...' : 'Save delivery'}
      </button>

      <DeliveryHistory key={historyKey} />
    </div>
  )
}
