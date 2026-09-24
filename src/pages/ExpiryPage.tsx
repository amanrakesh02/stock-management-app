import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { addDays, daysUntil, expiryBadgeClass, expiryLabel, isoDate } from '../lib/format'
import type { Batch } from '../lib/types'
import { errorClass, listClass, pageTitleClass, successClass } from '../lib/ui'

interface ExpiringBatch extends Batch {
  expiry_date: string
  products: { id: string; name: string; status: string } | null
}

const windows = [7, 30, 90] as const

export default function ExpiryPage() {
  const [windowDays, setWindowDays] = useState<(typeof windows)[number]>(30)
  const [batches, setBatches] = useState<ExpiringBatch[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('batches')
      .select('*, products(id, name, status)')
      .gt('quantity', 0)
      .not('expiry_date', 'is', null)
      .lte('expiry_date', isoDate(addDays(windowDays)))
      .order('expiry_date')
    if (error) return setError(error.message)
    setBatches(data as ExpiringBatch[])
  }, [windowDays])

  useEffect(() => {
    // load() only sets state after its awaited fetch resolves
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const writeOff = async (b: ExpiringBatch) => {
    const name = b.products?.name ?? 'this product'
    if (!confirm(`Write off ${b.quantity} × ${name}?`)) return
    setBusyId(b.id)
    setMessage(null)
    const { error } = await supabase.from('batches').update({ quantity: 0 }).eq('id', b.id)
    setBusyId(null)
    if (error) return setError(error.message)
    setError(null)
    setMessage(`Wrote off ${b.quantity} × ${name}.`)
    load()
  }

  const expired = batches?.filter((b) => daysUntil(b.expiry_date) < 0) ?? []
  const upcoming = batches?.filter((b) => daysUntil(b.expiry_date) >= 0) ?? []

  const renderList = (list: ExpiringBatch[]) => (
    <ul className={listClass}>
      {list.map((b) => (
        <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            {b.products ? (
              <Link to={`/products/${b.products.id}`} className="block truncate font-medium text-slate-900 hover:underline">
                {b.products.name}
              </Link>
            ) : (
              <p className="truncate font-medium text-slate-900">Unknown product</p>
            )}
            <p className="text-xs text-slate-500">
              {b.quantity} unit{b.quantity === 1 ? '' : 's'}
              {b.products?.status === 'discontinued' ? ' · discontinued' : ''}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${expiryBadgeClass(b.expiry_date)}`}>
              {expiryLabel(b.expiry_date)}
            </span>
            <button
              type="button"
              onClick={() => writeOff(b)}
              disabled={busyId === b.id}
              className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              Write off
            </button>
          </div>
        </li>
      ))}
    </ul>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className={pageTitleClass}>Expiry</h2>
        <div className="flex gap-1">
          {windows.map((w) => (
            <button
              key={w}
              onClick={() => setWindowDays(w)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                windowDays === w
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {w}d
            </button>
          ))}
        </div>
      </div>

      {message && <p className={successClass}>{message}</p>}
      {error && <p className={errorClass}>{error}</p>}

      {batches === null && !error && <p className="py-8 text-center text-sm text-slate-500">Loading...</p>}

      {batches && batches.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
          Nothing expires in the next {windowDays} days.
        </p>
      )}

      {expired.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-red-700">Expired ({expired.length})</h3>
          {renderList(expired)}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-slate-700">
            Expiring within {windowDays} days ({upcoming.length})
          </h3>
          {renderList(upcoming)}
        </div>
      )}
    </div>
  )
}
