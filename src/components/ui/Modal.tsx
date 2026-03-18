import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full max-w-5xl bg-gradient-to-b from-purple-darkest to-purple-darker border-2 border-purple-DEFAULT rounded-2xl p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-2xl text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          &times;
        </button>
        <h2 className="text-xl font-bold text-gold-DEFAULT text-center mb-4 text-shadow-gold font-[family-name:var(--font-display)]">
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}
