import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const inputClass =
  'rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors'
const primaryButtonClass =
  'rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 active:bg-indigo-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButtonClass =
  'rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors'
const cardClass = 'flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm'
const labelClass = 'text-xs font-medium text-slate-500'

interface Supplier {
  id: string
  name: string
}

interface ProductOption {
  id: string
  name: string
  barcode: string | null
  custom_code: string | null
}

interface LineItem {
  key: string
  product: ProductOption | null
  quantity: string
  expiryDate: string
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function emptyLineItem(): LineItem {
  return { key: crypto.randomUUID(), product: null, quantity: '', expiryDate: '' }
}

function ProductPicker({
  value,
  onChange,
}: {
  value: ProductOption | null
  onChange: (product: ProductOption) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProductOption[]>([])
  const [searching, setSearching] = useState(false)

  const runSearch = async () => {
    const q = query.trim()
    if (!q) return
    setSearching(true)
    const { data, error } = await supabase
      .from('product_details')
      .select('id, name, barcode, custom_code')
      .or(`name.ilike.%${q}%,barcode.ilike.%${q}%,custom_code.ilike.%${q}%`)
      .eq('status', 'active')
      .order('name')
    setSearching(false)
    if (error) {
      console.error(error)
      return
    }
    setResults(data as ProductOption[])
  }

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
        <span className="font-medium text-slate-900">{value.name}</span>
        <button
          type="button"
          onClick={() => {
            onChange(null as unknown as ProductOption)
            setResults([])
            setQuery('')
          }}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          Change
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          placeholder="Search by name, barcode, or code"
          className={`flex-1 ${inputClass}`}
        />
        <button type="button" onClick={runSearch} className={secondaryButtonClass}>
          Search
        </button>
      </div>
      {searching && <p className="text-xs text-slate-500">Searching...</p>}
      {results.length > 0 && (
        <ul className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
          {results.map((p) => (
            <li
              key={p.id}
              onClick={() => {
                onChange(p)
                setResults([])
                setQuery('')
              }}
              className="cursor-pointer px-3 py-2 text-sm transition-colors hover:bg-slate-50"
            >
              <span className="font-medium text-slate-900">{p.name}</span>
              <span className="ml-1 text-xs text-slate-500">{p.barcode || p.custom_code}</span>
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
  const [deliveredAt, setDeliveredAt] = useState(today())
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLineItem()])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    supabase
      .from('suppliers')
      .select('id, name')
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
    setDeliveredAt(today())
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
      .insert({ supplier_id: supplierId, delivered_at: deliveredAt })
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
    setSubmitting(false)
    if (batchError) return setError(batchError.message)

    setSuccess(true)
    resetForm()
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold tracking-tight text-slate-900">Record Delivery</h2>

      {success && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
          Delivery recorded.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

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

            <ProductPicker value={item.product} onChange={(p) => updateLineItem(item.key, { product: p })} />

            <input
              type="number"
              value={item.quantity}
              onChange={(e) => updateLineItem(item.key, { quantity: e.target.value })}
              placeholder="Quantity received"
              className={inputClass}
            />
            <input
              type="date"
              value={item.expiryDate}
              onChange={(e) => updateLineItem(item.key, { expiryDate: e.target.value })}
              placeholder="Expiry date (optional)"
              className={inputClass}
            />
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
    </div>
  )
}
