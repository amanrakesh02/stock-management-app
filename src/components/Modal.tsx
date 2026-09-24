import type { ReactNode } from 'react'
import { ghostButtonClass } from '../lib/ui'

type Props = {
  title: string
  onClose: () => void
  children: ReactNode
}

export default function Modal({ title, onClose, children }: Props) {
  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-sm flex-col gap-3 overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {children}
        <button type="button" onClick={onClose} className={`self-center ${ghostButtonClass}`}>
          Cancel
        </button>
      </div>
    </div>
  )
}
