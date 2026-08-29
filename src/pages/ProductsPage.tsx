import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import BarcodeScanner from '../components/BarcodeScanner'

const inputClass =
  'rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors'
const primaryButtonClass =
  'rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 active:bg-indigo-700 transition-colors'
const secondaryButtonClass =
  'rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors'
const ghostButtonClass = 'text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors'
const dangerButtonClass =
  'rounded-lg border border-red-200 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors'
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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [barcode, setBarcode] = useState('')
  const [reorderQty, setReorderQty] = useState('0')
  const [editing, setEditing] = useState<Product | null>(null)
  const [scanningFor, setScanningFor] = useState<'add' | 'edit' | null>(null)

  const load = () => {
    supabase
      .from('product_details')
      .select('*')
      .eq('status', 'active')
      .order('name')
      .then(({ data, error }) => {
        if (error) console.error(error)
        else setProducts(data as Product[])
        setLoading(false)
      })
  }

  useEffect(load, [])

  const addProduct = async () => {
    if (!name.trim()) return
    const { error } = await supabase.from('products').insert({
      name: name.trim(),
      barcode: barcode.trim() || null,
      reorder_quantity: Number(reorderQty) || 0,
    })
    if (error) return alert(error.message)
    setName('')
    setBarcode('')
    setReorderQty('0')
    load()
  }

  const saveEdit = async () => {
    if (!editing) return
    const { error } = await supabase
      .from('products')
      .update({
        name: editing.name,
        barcode: editing.barcode,
        reorder_quantity: editing.reorder_quantity,
      })
      .eq('id', editing.id)
    if (error) return alert(error.message)
    setEditing(null)
    load()
  }

  const discontinue = async () => {
    if (!editing) return
    const { error } = await supabase
      .from('products')
      .update({ status: 'discontinued' })
      .eq('id', editing.id)
    if (error) return alert(error.message)
    setEditing(null)
    load()
  }

  if (loading) return <p className="py-8 text-center text-sm text-slate-500">Loading...</p>

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold tracking-tight text-slate-900">Products</h2>

      <div className={cardClass}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" className={inputClass} />
        <div className="flex gap-2">
          <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Barcode (optional)" className={`flex-1 ${inputClass}`} />
          <button type="button" onClick={() => setScanningFor('add')} className={secondaryButtonClass}>Scan</button>
        </div>
        <input type="number" value={reorderQty} onChange={(e) => setReorderQty(e.target.value)} placeholder="Reorder quantity" className={inputClass} />
        <button onClick={addProduct} className={primaryButtonClass}>Add product</button>
      </div>

      <ul className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {products.map((p) => (
          <li key={p.id} onClick={() => setEditing(p)} className="flex cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-slate-50">
            <div>
              <p className="font-medium text-slate-900">{p.name}</p>
              <p className="text-xs text-slate-500">{p.barcode || p.custom_code} · {p.supplier_name ?? 'no supplier'}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{p.total_stock} on hand</span>
          </li>
        ))}
      </ul>

      {editing && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-xs flex-col gap-2 rounded-xl bg-white p-5 shadow-xl">
            <p className="text-sm font-semibold text-slate-900">Edit product</p>
            <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={inputClass} />
            <div className="flex gap-2">
              <input value={editing.barcode ?? ''} onChange={(e) => setEditing({ ...editing, barcode: e.target.value })} className={`flex-1 ${inputClass}`} />
              <button type="button" onClick={() => setScanningFor('edit')} className={secondaryButtonClass}>Scan</button>
            </div>
            <input type="number" value={editing.reorder_quantity} onChange={(e) => setEditing({ ...editing, reorder_quantity: Number(e.target.value) })} className={inputClass} />
            <button onClick={saveEdit} className={primaryButtonClass}>Save</button>
            <button onClick={discontinue} className={dangerButtonClass}>Mark discontinued</button>
            <button onClick={() => setEditing(null)} className={`self-center ${ghostButtonClass}`}>Cancel</button>
          </div>
        </div>
      )}
      {scanningFor && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-xs flex-col gap-3 rounded-xl bg-white p-5 shadow-xl">
            <p className="text-sm font-semibold text-slate-900">Scan barcode</p>
            <BarcodeScanner
              onScan={(code) => {
                if (scanningFor === 'add') {
                  setBarcode(code)
                } else if (scanningFor === 'edit' && editing) {
                  setEditing({ ...editing, barcode: code })
                }
                setScanningFor(null)
              }}
              onError={(msg) => {
                alert(msg)
                setScanningFor(null)
              }}
            />
            <button onClick={() => setScanningFor(null)} className={`self-center ${ghostButtonClass}`}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
