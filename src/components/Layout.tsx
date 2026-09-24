import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const tabs = [
  // Products lives at / but its detail pages are under /products/:id
  { to: '/', label: 'Products', end: true, alsoActive: '/products/' },
  { to: '/scan', label: 'Restock', end: false },
  { to: '/delivery', label: 'Delivery', end: false },
  { to: '/expiry', label: 'Expiry', end: false },
  { to: '/suppliers', label: 'Suppliers', end: false },
]

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-10 bg-slate-900 shadow-sm">
        <header className="px-4 pt-4 pb-2">
          <h1 className="text-lg font-semibold tracking-tight text-white">Restock</h1>
        </header>
        <nav className="flex gap-0.5 overflow-x-auto px-3 pb-3 sm:gap-1 [scrollbar-width:none]">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) => {
                const active = isActive || (!!tab.alsoActive && pathname.startsWith(tab.alsoActive))
                return `shrink-0 rounded-full px-2 py-1.5 text-[13px] font-medium sm:px-3 sm:text-sm transition-colors ${
                  active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`
              }}
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
