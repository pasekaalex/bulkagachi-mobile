import { useNavigate } from 'react-router-dom'

export function BackButton() {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate('/')}
      className="fixed top-4 left-4 z-50 flex items-center gap-1.5 px-4 py-2 bg-purple-darker/80 border border-purple-DEFAULT/50 rounded-xl text-gold-DEFAULT text-sm font-bold font-[family-name:var(--font-display)] tracking-wider backdrop-blur-sm hover:bg-purple-dark/80 hover:border-gold-DEFAULT/50 hover:shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all cursor-pointer"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      BACK
    </button>
  )
}
