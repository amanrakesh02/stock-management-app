import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import ProductSearch from '../components/ProductSearch'
import { productCode, stockStatus } from '../lib/format'
import {
  clearRestockList,
  removeRestockItem,
  restockListAsText,
  upsertRestockItem,
  useRestockList,
} from '../lib/restockList'
import type { Product } from '../lib/types'
import {
  cardClass,
  errorClass,
  ghostButtonClass,
  inputClass,
  listClass,
  pageTitleClass,
  primaryButtonClass,
  secondaryButtonClass,
  successClass,
} from '../lib/ui'

export default function ScanPage() {
  const list = useRestockList()
  const [product, setProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState('0')
  // Bumped to remount ProductSearch, which reopens the camera for the next item.
  const [searchKey, setSearchKey] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [suggesting, setSuggesting] = useState(false)

  const selectProduct = (p: Product) => {
    const existing = list.find((item) => item.productId === p.id)
    setProduct(p)
    setQuantity(String(existing?.quantity ?? (p.reorder_quantity || 1)))
    setMessage(null)
    setError(null)
  }

  const nextItem = () => {
    setProduct(null)
    setSearchKey((k) => k + 1)
  }

  const addToList = () => {
    if (!product) return
    const qty = Number(quantity)
    if (!(qty > 0)) return setError('Enter a quantity greater than 0.')
    upsertRestockItem({
      productId: product.id,
      name: product.name,
      supplierName: product.supplier_name,
      quantity: qty,
    })
    setMessage(`${product.name} × ${qty} added to the list.`)
    nextItem()
  }

  const addLowStock = async () => {
    setSuggesting(true)
    setError(null)
    setMessage(null)
    const { data, error } = await supabase.from('product_details').select('*').eq('status', 'active').order('name')
    setSuggesting(false)
    if (error) return setError(error.message)
    const onList = new Set(list.map((item) => item.productId))
    const toAdd = (data as Product[]).filter((p) => stockStatus(p) !== 'ok' && !onList.has(p.id))
    for (const p of toAdd) {
      upsertRestockItem({
        productId: p.id,
        name: p.name,
        supplierName: p.supplier_name,
        quantity: p.reorder_quantity || 1,
      })
    }
    setMessage(
      toAdd.length === 0
        ? 'No other low or out-of-stock products.'
        : `Added ${toAdd.length} low or out-of-stock product${toAdd.length === 1 ? '' : 's'}.`
    )
  }

  const shareList = async () => {
    const text = restockListAsText(list)
    if (!text) return
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Restock list', text })
      } catch {
        // user cancelled the share sheet — nothing to do
      }
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setMessage('Restock list copied to clipboard.')
    } catch {
      setError('Could not share or copy the list.')
    }
  }

  const clearList = () => {
    if (confirm('Clear the whole restock list?')) clearRestockList()
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className={pageTitleClass}>Restock List</h2>

      {message && <p className={successClass}>{message}</p>}
      {error && <p className={errorClass}>{error}</p>}

      {product ? (
        <div className={cardClass}>
          <div>
            <p className="font-medium text-slate-900">{product.name}</p>
            <p className="text-xs text-slate-500">
              {productCode(product)} · {product.supplier_name ?? 'no supplier'} · {product.total_stock} on hand
            </p>
          </div>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addToList()}
            placeholder="Quantity to order"
            className={inputClass}
            autoFocus
          />
          <button onClick={addToList} className={primaryButtonClass}>
            {list.some((item) => item.productId === product.id) ? 'Update quantity' : 'Add to list'}
          </button>
          <button type="button" onClick={nextItem} className={`self-center ${ghostButtonClass}`}>
            Cancel
          </button>
        </div>
      ) : (
        <div className={cardClass}>
          <ProductSearch key={searchKey} inlineCamera onSelect={selectProduct} />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">
            On the list {list.length > 0 && <span className="text-slate-400">({list.length})</span>}
          </h3>
          <button
            type="button"
            onClick={addLowStock}
            disabled={suggesting}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
          >
            {suggesting ? 'Checking...' : '+ Add low stock'}
          </button>
        </div>

        {list.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            Scan or search for products to build a restock list.
          </p>
        ) : (
          <>
            <ul className={listClass}>
              {list.map((item) => (
                <li key={item.productId} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{item.name}</p>
                    <p className="truncate text-xs text-slate-500">{item.supplierName ?? 'No supplier'}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => upsertRestockItem({ ...item, quantity: Number(e.target.value) })}
                      aria-label={`Quantity of ${item.name}`}
                      className={`w-16 text-right ${inputClass}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeRestockItem(item.productId)}
                      aria-label={`Remove ${item.name}`}
                      className="px-1 text-lg leading-none text-slate-400 hover:text-red-600"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <button onClick={shareList} className={`${primaryButtonClass} px-3`}>
              Share list
            </button>
            <button onClick={clearList} className={`${secondaryButtonClass} py-2`}>
              Clear list
            </button>
          </>
        )}
      </div>
    </div>
  )
}
