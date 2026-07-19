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
    if (error) {
      alert(error.message)
      return
    }
    setName('')
    setBarcode('')
    setReorderQty('0')
    load()
  }

  if (loading) return <p>Loading...</p>

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Products</h2>

      <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Product name"
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <input
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Barcode (optional)"
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <input
          type="number"
          value={reorderQty}
          onChange={(e) => setReorderQty(e.target.value)}
          placeholder="Reorder quantity"
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <button onClick={addProduct} className="rounded bg-slate-900 py-1.5 text-sm text-white">
          Add product
        </button>
      </div>

      <ul className="flex flex-col divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {products.map((p) => (
          <li key={p.id} className="flex justify-between px-3 py-2">
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-slate-500">
                {p.barcode || p.custom_code} · {p.supplier_name ?? 'no supplier'}
              </p>
            </div>
            <span className="text-sm">{p.total_stock} on hand</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
