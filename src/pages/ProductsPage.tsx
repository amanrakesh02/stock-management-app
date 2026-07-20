import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

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

  if (loading) return <p>Loading...</p>

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Products</h2>

      <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" className="rounded border border-slate-300 px-2 py-1 text-sm" />
        <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Barcode (optional)" className="rounded border border-slate-300 px-2 py-1 text-sm" />
        <input type="number" value={reorderQty} onChange={(e) => setReorderQty(e.target.value)} placeholder="Reorder quantity" className="rounded border border-slate-300 px-2 py-1 text-sm" />
        <button onClick={addProduct} className="rounded bg-slate-900 py-1.5 text-sm text-white">Add product</button>
      </div>

      <ul className="flex flex-col divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {products.map((p) => (
          <li key={p.id} onClick={() => setEditing(p)} className="flex cursor-pointer justify-between px-3 py-2">
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-slate-500">{p.barcode || p.custom_code} · {p.supplier_name ?? 'no supplier'}</p>
            </div>
            <span className="text-sm">{p.total_stock} on hand</span>
          </li>
        ))}
      </ul>

      {editing && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="flex w-72 flex-col gap-2 rounded-lg bg-white p-4">
            <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="rounded border border-slate-300 px-2 py-1 text-sm" />
            <input value={editing.barcode ?? ''} onChange={(e) => setEditing({ ...editing, barcode: e.target.value })} className="rounded border border-slate-300 px-2 py-1 text-sm" />
            <input type="number" value={editing.reorder_quantity} onChange={(e) => setEditing({ ...editing, reorder_quantity: Number(e.target.value) })} className="rounded border border-slate-300 px-2 py-1 text-sm" />
            <button onClick={saveEdit} className="rounded bg-slate-900 py-1.5 text-sm text-white">Save</button>
            <button onClick={discontinue} className="rounded border border-red-300 py-1.5 text-sm text-red-600">Mark discontinued</button>
            <button onClick={() => setEditing(null)} className="text-sm text-slate-500">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
