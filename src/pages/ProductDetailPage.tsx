import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import BarcodeScanner from '../components/BarcodeScanner'
import Modal from '../components/Modal'
import {
  expiryBadgeClass,
  expiryLabel,
  formatDate,
  friendlyProductError,
  stockBadgeClass,
  stockStatus,
} from '../lib/format'
import { upsertRestockItem, useRestockList } from '../lib/restockList'
import type { Batch, Product, Supplier } from '../lib/types'
import {
  cardClass,
  dangerButtonClass,
  errorClass,
  inputClass,
  labelClass,
  listClass,
  primaryButtonClass,
  secondaryButtonClass,
  successClass,
} from '../lib/ui'

interface BatchRow extends Batch {
  deliveries: { delivered_at: string; reference: string | null; suppliers: { name: string } | null } | null
}

// Take `amount` units out of the given batches, oldest expiry first.
function planRemoval(batches: BatchRow[], amount: number) {
  const plan: { id: string; quantity: number }[] = []
  let remaining = amount
  for (const b of batches) {
    if (remaining <= 0) break
    const take = Math.min(b.quantity, remaining)
    plan.push({ id: b.id, quantity: b.quantity - take })
    remaining -= take
  }
  return plan
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const restockList = useRestockList()
  const [product, setProduct] = useState<Product | null>(null)
  const [draft, setDraft] = useState<Product | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [batches, setBatches] = useState<BatchRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [removeQty, setRemoveQty] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    const [productRes, batchRes] = await Promise.all([
      supabase.from('product_details').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('batches')
        .select('*, deliveries(delivered_at, reference, suppliers(name))')
        .eq('product_id', id)
        .gt('quantity', 0)
        .order('expiry_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true }),
    ])
    setLoading(false)
    if (productRes.error) return setError(productRes.error.message)
    if (batchRes.error) return setError(batchRes.error.message)
    setProduct(productRes.data as Product | null)
    setDraft(productRes.data as Product | null)
    setBatches(batchRes.data as BatchRow[])
  }, [id])

  useEffect(() => {
    // load() only sets state after its awaited fetch resolves
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    supabase
      .from('suppliers')
      .select('id, name, contact')
      .order('name')
      .then(({ data, error }) => {
        if (error) console.error(error)
        else setSuppliers(data as Supplier[])
      })
  }, [load])

  const run = async (action: () => Promise<{ error: { code?: string; message: string } | null }>, done: string) => {
    setSaving(true)
    setError(null)
    setMessage(null)
    const { error } = await action()
    setSaving(false)
    if (error) {
      setError(friendlyProductError(error))
    } else {
      setMessage(done)
    }
    await load()
  }

  const saveEdit = () => {
    if (!draft) return
    if (!draft.name.trim()) return setError('Product name cannot be empty.')
    return run(
      async () =>
        supabase
          .from('products')
          .update({
            name: draft.name.trim(),
            barcode: draft.barcode?.trim() || null,
            custom_code: draft.custom_code?.trim() || null,
            supplier_id: draft.supplier_id || null,
            reorder_quantity: Number(draft.reorder_quantity) || 0,
          })
          .eq('id', draft.id),
      'Product saved.'
    )
  }

  const setStatus = (status: Product['status']) => {
    if (!product) return
    if (status === 'discontinued' && !confirm(`Mark "${product.name}" as discontinued?`)) return
    return run(
      async () => supabase.from('products').update({ status }).eq('id', product.id),
      status === 'active' ? 'Product reactivated.' : 'Product marked discontinued.'
    )
  }

  const removeStock = () => {
    const amount = Number(removeQty)
    if (!product || !(amount > 0)) return setError('Enter how many units to remove.')
    if (amount > product.total_stock) return setError(`Only ${product.total_stock} on hand.`)
    const plan = planRemoval(batches, amount)
    setRemoveQty('')
    return run(async () => {
      for (const step of plan) {
        const { error } = await supabase.from('batches').update({ quantity: step.quantity }).eq('id', step.id)
        if (error) return { error }
      }
      return { error: null }
    }, `Removed ${amount} from stock.`)
  }

  const writeOff = (batch: BatchRow) => {
    if (!confirm(`Write off ${batch.quantity} unit${batch.quantity === 1 ? '' : 's'} from this batch?`)) return
    return run(
      async () => supabase.from('batches').update({ quantity: 0 }).eq('id', batch.id),
      `Wrote off ${batch.quantity} unit${batch.quantity === 1 ? '' : 's'}.`
    )
  }

  const addToRestock = () => {
    if (!product) return
    upsertRestockItem({
      productId: product.id,
      name: product.name,
      supplierName: product.supplier_name,
      quantity: product.reorder_quantity || 1,
    })
    setMessage('Added to the restock list.')
  }

  if (loading) return <p className="py-8 text-center text-sm text-slate-500">Loading...</p>
  if (!product || !draft) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <p className="text-sm text-slate-500">{error ?? 'Product not found.'}</p>
        <Link to="/" className="text-sm font-medium text-indigo-600">
          ← Back to products
        </Link>
      </div>
    )
  }

  const status = stockStatus(product)
  const onRestockList = restockList.some((item) => item.productId === product.id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link to="/" className="text-sm font-medium text-indigo-600">
          ← Products
        </Link>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">{product.name}</h2>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
              product.status === 'discontinued' ? 'bg-slate-200 text-slate-600' : stockBadgeClass[status]
            }`}
          >
            {product.status === 'discontinued' ? 'Discontinued' : `${product.total_stock} on hand`}
          </span>
        </div>
      </div>

      {message && <p className={successClass}>{message}</p>}
      {error && <p className={errorClass}>{error}</p>}

      {product.status === 'active' && (
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Stock</p>
            <button
              type="button"
              onClick={addToRestock}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              {onRestockList ? 'On restock list ✓' : '+ Restock list'}
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={removeQty}
              onChange={(e) => setRemoveQty(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && removeStock()}
              placeholder="Units sold / used"
              className={`min-w-0 flex-1 ${inputClass}`}
            />
            <button
              type="button"
              onClick={removeStock}
              disabled={saving || product.total_stock <= 0}
              className={secondaryButtonClass}
            >
              Remove
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Removes from the batches expiring soonest first. Add stock by recording a delivery.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-slate-700">Batches on hand</h3>
        {batches.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            No stock on hand.
          </p>
        ) : (
          <ul className={listClass}>
            {batches.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {b.quantity} unit{b.quantity === 1 ? '' : 's'}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {b.deliveries
                      ? `Delivered ${formatDate(b.deliveries.delivered_at)}${
                          b.deliveries.suppliers ? ` · ${b.deliveries.suppliers.name}` : ''
                        }${b.deliveries.reference ? ` · ${b.deliveries.reference}` : ''}`
                      : `Added ${formatDate(b.created_at)}`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {b.expiry_date ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${expiryBadgeClass(b.expiry_date)}`}
                    >
                      {expiryLabel(b.expiry_date)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">No expiry</span>
                  )}
                  <button
                    type="button"
                    onClick={() => writeOff(b)}
                    disabled={saving}
                    className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    Write off
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={cardClass}>
        <p className="text-sm font-semibold text-slate-900">Details</p>
        <label className={labelClass}>
          Name
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className={`mt-1 w-full ${inputClass}`}
          />
        </label>
        <label className={labelClass}>
          Barcode
          <div className="mt-1 flex gap-2">
            <input
              value={draft.barcode ?? ''}
              onChange={(e) => setDraft({ ...draft, barcode: e.target.value })}
              className={`min-w-0 flex-1 ${inputClass}`}
            />
            <button type="button" onClick={() => setScanning(true)} className={secondaryButtonClass}>
              Scan
            </button>
          </div>
        </label>
        <label className={labelClass}>
          Custom code
          <input
            value={draft.custom_code ?? ''}
            onChange={(e) => setDraft({ ...draft, custom_code: e.target.value })}
            className={`mt-1 w-full ${inputClass}`}
          />
        </label>
        <label className={labelClass}>
          Supplier
          <select
            value={draft.supplier_id ?? ''}
            onChange={(e) => setDraft({ ...draft, supplier_id: e.target.value || null })}
            className={`mt-1 w-full ${inputClass}`}
          >
            <option value="">No supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Reorder quantity
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={draft.reorder_quantity}
            onChange={(e) => setDraft({ ...draft, reorder_quantity: Number(e.target.value) })}
            className={`mt-1 w-full ${inputClass}`}
          />
        </label>
        <button onClick={saveEdit} disabled={saving} className={primaryButtonClass}>
          Save changes
        </button>
        {product.status === 'active' ? (
          <button onClick={() => setStatus('discontinued')} disabled={saving} className={dangerButtonClass}>
            Mark discontinued
          </button>
        ) : (
          <button onClick={() => setStatus('active')} disabled={saving} className={`${secondaryButtonClass} py-2`}>
            Reactivate product
          </button>
        )}
      </div>

      {scanning && (
        <Modal title="Scan barcode" onClose={() => setScanning(false)}>
          <BarcodeScanner
            onScan={(code) => {
              setDraft({ ...draft, barcode: code })
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
