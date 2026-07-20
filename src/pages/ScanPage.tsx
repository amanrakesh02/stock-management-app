import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Product = {
  id: string
  name: string
  barcode: string | null
  custom_code: string | null
  reorder_quantity: number
  supplier_id: string | null
}

export default function ScanPage() {
  const [product, setProduct] = useState<Product | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Scan Product</h1>
      {/* scanner component goes here in Step 3 */}
      {error && <p className="text-red-600">{error}</p>}
      {product && <p>Found: {product.name}</p>}
    </div>
  )
}
