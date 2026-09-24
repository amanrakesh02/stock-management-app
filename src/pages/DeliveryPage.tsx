import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import ProductSearch from '../components/ProductSearch'
import { isoDate, productCode } from '../lib/format'
import type { Product, Supplier } from '../lib/types'
import {
  cardClass,
  errorClass,
  inputClass,
  labelClass,
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

export default function DeliveryPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [deliveredAt, setDeliveredAt] = useState(isoDate())
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLineItem()])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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
      <h2 className={pageTitleClass}>Record Delivery</h2>

      {success && (
        <p className={successClass}>
          Delivery recorded.
        </p>
      )}
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
