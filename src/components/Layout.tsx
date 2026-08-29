import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Products', end: true },
  { to: '/scan', label: 'Scan', end: false },
  { to: '/delivery', label: 'Delivery', end: false },
]

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-10 bg-slate-900 shadow-sm">
        <header className="px-4 pt-4 pb-2">
          <h1 className="text-lg font-semibold tracking-tight text-white">Restock</h1>
        </header>
        <nav className="flex gap-1 px-3 pb-3">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <main className="mx-auto max-w-md px-4 py-6">{children}</main>
    </div>
  )
}
