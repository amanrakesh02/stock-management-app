import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { productCode, productCodeFilter, productSearchFilter, stockBadgeClass, stockStatus } from '../lib/format'
import type { Product } from '../lib/types'
import { ghostButtonClass, inputClass, primaryButtonClass, secondaryButtonClass } from '../lib/ui'
import BarcodeScanner from './BarcodeScanner'
import Modal from './Modal'

type Props = {
  onSelect: (product: Product) => void
  // Show the camera inline above the search box, open by default (Scan tab),
  // instead of in a modal behind the Scan button.
  inlineCamera?: boolean
}

// Search active products by name/barcode/custom code, or scan a barcode.
export default function ProductSearch({ onSelect, inlineCamera = false }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [scanning, setScanning] = useState(inlineCamera)
  const [error, setError] = useState<string | null>(null)

  const select = (p: Product) => {
    setResults(null)
    setQuery('')
    setError(null)
    onSelect(p)
  }

  const runSearch = async () => {
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setError(null)
    const { data, error } = await supabase
      .from('product_details')
      .select('*')
      .or(productSearchFilter(q))
      .eq('status', 'active')
      .order('name')
      .limit(50)
    setSearching(false)
    if (error) return setError(`Search failed: ${error.message}`)
    setResults(data as Product[])
  }

  const lookupByCode = async (code: string) => {
    setError(null)
    const { data, error } = await supabase
      .from('product_details')
      .select('*')
      .or(productCodeFilter(code))
      .eq('status', 'active')
      .limit(1)
    if (error) return setError(`Lookup failed: ${error.message}`)
    if (!data || data.length === 0) {
      setQuery(code)
      return setError(`No active product with code ${code}. Try searching by name.`)
    }
    select(data[0] as Product)
  }

  const scanner = (
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
  )

  return (
    <div className="flex flex-col gap-2">
      {scanning && inlineCamera && (
        <div className="flex flex-col gap-2">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-2">
            {scanner}
          </div>
          <button type="button" onClick={() => setScanning(false)} className={`self-center ${ghostButtonClass}`}>
            Close camera
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          placeholder="Search by name, barcode, or code"
          className={`min-w-0 flex-1 ${inputClass}`}
        />
        <button type="button" onClick={runSearch} className={`${primaryButtonClass} px-3`}>
          Search
        </button>
        <button type="button" onClick={() => setScanning(true)} className={secondaryButtonClass}>
          Scan
        </button>
      </div>

      {searching && <p className="text-xs text-slate-500">Searching...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {results && !searching && results.length === 0 && (
        <p className="text-xs text-slate-500">No active products match "{query}".</p>
      )}
      {results && results.length > 0 && (
        <ul className="flex max-h-72 flex-col divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
          {results.map((p) => (
            <li
              key={p.id}
              onClick={() => select(p)}
              className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 transition-colors hover:bg-slate-50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{p.name}</p>
                <p className="truncate text-xs text-slate-500">
                  {productCode(p)} · {p.supplier_name ?? 'no supplier'}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${stockBadgeClass[stockStatus(p)]}`}
              >
                {p.total_stock} on hand
              </span>
            </li>
          ))}
        </ul>
      )}

      {scanning && !inlineCamera && (
        <Modal title="Scan barcode" onClose={() => setScanning(false)}>
          {scanner}
        </Modal>
      )}
    </div>
  )
}
