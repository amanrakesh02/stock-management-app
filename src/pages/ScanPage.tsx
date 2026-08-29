import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import BarcodeScanner from '../components/BarcodeScanner'

const inputClass =
  'rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors'
const primaryButtonClass =
  'rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 active:bg-indigo-700 transition-colors'
const secondaryButtonClass =
  'rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors'
const ghostButtonClass = 'text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors'
const cardClass = 'flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm'

interface Product {
  id: string
  name: string
  barcode: string | null
  custom_code: string | null
  supplier_name: string | null
  total_stock: number
  reorder_quantity: number
  status: string
}

interface ListItem {
  product: Product
  quantity: number
}

export default function ScanPage() {
  const [scanning, setScanning] = useState(true)
  const [product, setProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState('0')
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  const [list, setList] = useState<ListItem[]>([])

  const selectProduct = (p: Product) => {
    setProduct(p)
    setQuantity(String(p.reorder_quantity))
    setError(null)
    setScanning(false)
    setSearchResults([])
    setSearchQuery('')
  }

  const lookupByCode = async (code: string) => {
    const { data, error } = await supabase
      .from('product_details')
      .select('*')
      .or(`barcode.eq.${code},custom_code.eq.${code}`)
      .eq('status', 'active')
      .maybeSingle()

    if (error) {
      setError(`Lookup failed: ${error.message}`)
      setScanning(false)
      return
    }
    if (!data) {
      setError('No matching product found. Try manual search below.')
      setScanning(false)
      return
    }
    selectProduct(data as Product)
  }

  const runSearch = async () => {
    const query = searchQuery.trim()
    if (!query) return
    setSearching(true)
    const { data, error } = await supabase
      .from('product_details')
      .select('*')
      .or(`name.ilike.%${query}%,barcode.ilike.%${query}%,custom_code.ilike.%${query}%`)
      .eq('status', 'active')
      .order('name')
    setSearching(false)
    if (error) {
      setError(`Search failed: ${error.message}`)
      return
    }
    setSearchResults(data as Product[])
  }

  const addToList = () => {
    if (!product) return
    const qty = Number(quantity) || 0
    setList((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        return prev.map((item) => (item.product.id === product.id ? { ...item, quantity: qty } : item))
      }
      return [...prev, { product, quantity: qty }]
    })
    setProduct(null)
    setQuantity('0')
    setScanning(true)
  }

  const removeFromList = (id: string) => {
    setList((prev) => prev.filter((item) => item.product.id !== id))
  }

  const listAsText = () => {
    if (list.length === 0) return ''
    const lines = list.map((item) => `- ${item.product.name}: ${item.quantity}`)
    return `Restock list:\n${lines.join('\n')}`
  }

  const shareList = async () => {
    const text = listAsText()
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
      alert('Restock list copied to clipboard')
    } catch {
      alert('Could not share or copy the list')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold tracking-tight text-slate-900">Scan Product</h2>

      {scanning && !product && (
        <div className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <BarcodeScanner
              onScan={(code) => {
                setScanning(false)
                lookupByCode(code)
              }}
              onError={(msg) => {
                setError(msg)
                setScanning(false)
              }}
            />
          </div>
          <button type="button" onClick={() => setScanning(false)} className={`self-center ${ghostButtonClass}`}>
            Enter manually instead
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!scanning && !product && (
        <div className={cardClass}>
          <div className="flex gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              placeholder="Search by name, barcode, or code"
              className={`flex-1 ${inputClass}`}
            />
            <button type="button" onClick={runSearch} className={primaryButtonClass + ' px-3'}>
              Search
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setError(null)
              setSearchResults([])
              setScanning(true)
            }}
            className={`self-center ${ghostButtonClass}`}
          >
            Back to camera
          </button>

          {searching && <p className="text-sm text-slate-500">Searching...</p>}

          {searchResults.length > 0 && (
            <ul className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
              {searchResults.map((p) => (
                <li
                  key={p.id}
                  onClick={() => selectProduct(p)}
                  className="flex cursor-pointer items-center justify-between px-3 py-2 transition-colors hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      {p.barcode || p.custom_code} · {p.supplier_name ?? 'no supplier'}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {p.total_stock} on hand
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {product && (
        <div className={cardClass}>
          <div>
            <p className="font-medium text-slate-900">{product.name}</p>
            <p className="text-xs text-slate-500">
              {product.barcode || product.custom_code} · {product.supplier_name ?? 'no supplier'} ·{' '}
              {product.total_stock} on hand
            </p>
          </div>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Quantity"
            className={inputClass}
          />
          <button onClick={addToList} className={primaryButtonClass}>
            Add to list
          </button>
          <button
            type="button"
            onClick={() => {
              setProduct(null)
              setScanning(true)
            }}
            className={`self-center ${ghostButtonClass}`}
          >
            Cancel
          </button>
        </div>
      )}

      {list.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-slate-700">Restock list</h3>
          <ul className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {list.map((item) => (
              <li key={item.product.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">{item.product.name}</p>
                  <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFromList(item.product.id)}
                  className="text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button onClick={shareList} className={secondaryButtonClass + ' py-2'}>
            Share list
          </button>
        </div>
      )}
    </div>
  )
}
