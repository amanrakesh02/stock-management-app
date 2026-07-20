import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 px-4 py-3">
        <h1 className="text-lg font-semibold text-white">Restock</h1>
      </header>
      <nav className="flex gap-4 bg-slate-800 px-4 py-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `text-sm ${isActive ? 'font-bold text-white' : 'text-slate-300'}`}
        >
          Products
        </NavLink>
        <NavLink
          to="/scan"
          className={({ isActive }) => `text-sm ${isActive ? 'font-bold text-white' : 'text-slate-300'}`}
        >
          Scan
        </NavLink>
      </nav>
      <main className="mx-auto max-w-md p-4">{children}</main>
    </div>
  )
}