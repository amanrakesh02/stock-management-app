import type { ReactNode } from 'react'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 px-4 py-3">
        <h1 className="text-lg font-semibold text-white">Restock</h1>
      </header>
      <main className="mx-auto max-w-md p-4">{children}</main>
    </div>
  )
}
