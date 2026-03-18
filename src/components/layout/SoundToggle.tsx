interface SoundToggleProps {
  soundOn: boolean
  onToggle: () => void
}

export function SoundToggle({ soundOn, onToggle }: SoundToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="fixed bottom-5 left-5 z-50 flex items-center gap-2 px-3 py-2 bg-purple-darker/80 border border-purple-DEFAULT/50 rounded-lg text-white text-xs font-bold backdrop-blur-sm hover:border-gold-DEFAULT/50 transition-all cursor-pointer"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        {soundOn ? (
          <>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </>
        ) : (
          <>
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </>
        )}
      </svg>
      <span className="hidden sm:inline">{soundOn ? 'SOUND ON' : 'SOUND OFF'}</span>
    </button>
  )
}
