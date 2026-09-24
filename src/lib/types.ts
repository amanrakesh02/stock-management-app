// Row shapes for the Supabase tables/views this app reads. The schema itself
// lives in Supabase — see CLAUDE.md for the full list of tables and columns.

export interface Supplier {
  id: string
  name: string
  contact: string | null
}

// A row of the `product_details` view (products + supplier_name + total_stock).
export interface Product {
  id: string
  name: string
  barcode: string | null
  custom_code: string | null
  supplier_id: string | null
  supplier_name: string | null
  total_stock: number
  reorder_quantity: number
  status: 'active' | 'discontinued'
}

// `batches.quantity` is the quantity still on hand for that batch: it starts at
// the amount delivered and is decremented when stock is removed or written off.
export interface Batch {
  id: string
  product_id: string
  delivery_id: string | null
  quantity: number
  expiry_date: string | null
  created_at: string
}
