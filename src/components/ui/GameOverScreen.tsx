import type { SubmitState } from '../../hooks/useLeaderboard'

interface GameOverScreenProps {
  title?: string
  score: number
  highScore?: number
  stats?: Record<string, string | number>
  onRestart: () => void
  gameName?: string
  onSubmitScore?: () => void
  submitState?: SubmitState
  submitError?: string
}

const submitLabels: Record<SubmitState, string> = {
  idle: 'SUBMIT SCORE',
  submitting: 'SUBMITTING...',
  submitted: 'SUBMITTED!',
  error: 'FAILED - CLICK TO RETRY',
}

export function GameOverScreen({
  title = 'GAME OVER',
  score,
  highScore,
  stats,
  onRestart,
  gameName,
  onSubmitScore,
  submitState = 'idle',
  submitError,
}: GameOverScreenProps) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="text-center animate-scale-in">
        <h1 className="text-4xl sm:text-5xl font-bold text-gold-DEFAULT text-shadow-gold mb-6 font-[family-name:var(--font-display)]">
          {title}
        </h1>
        <div className="bg-purple-darker/80 border border-purple-DEFAULT/50 rounded-xl p-6 mb-10 min-w-[250px]">
          <p className="text-2xl text-gold-DEFAULT font-bold mb-2">Score: {score}</p>
          {highScore !== undefined && (
            <p className="text-lg text-purple-DEFAULT">Best: {highScore}</p>
          )}
          {stats && Object.entries(stats).map(([key, value]) => (
            <p key={key} className="text-sm text-white/70 mt-1">{key}: {value}</p>
          ))}
        </div>
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onRestart}
            className="px-8 py-3 bg-gradient-to-r from-purple-DEFAULT to-purple-dark border-2 border-gold-DEFAULT rounded-xl text-white text-lg font-bold hover:scale-105 transition-transform animate-pulse-glow cursor-pointer"
          >
            PLAY AGAIN
          </button>
          {onSubmitScore && (
            <>
              <button
                onClick={submitState !== 'submitting' ? onSubmitScore : undefined}
                disabled={submitState === 'submitting'}
                className={`px-8 py-3 border-2 rounded-xl text-sm font-bold transition-transform cursor-pointer ${
                  submitState === 'submitted'
                    ? 'bg-gradient-to-r from-green-600 to-green-700 border-green-400 text-white'
                    : submitState === 'error'
                      ? 'bg-gradient-to-r from-red-600 to-red-700 border-red-400 text-white hover:scale-105'
                      : submitState === 'submitting'
                        ? 'bg-gradient-to-r from-gold-DEFAULT/60 to-gold-dark/60 border-gold-DEFAULT/60 text-black/60 animate-pulse'
                        : 'bg-gradient-to-r from-gold-DEFAULT to-gold-dark border-gold-DEFAULT text-black hover:scale-105'
                }`}
              >
                {submitLabels[submitState]}
              </button>
              {submitState === 'error' && submitError && (
                <p className="text-xs text-red-400 max-w-[250px]">{submitError}</p>
              )}
            </>
          )}
          {!onSubmitScore && gameName && (
            <p className="text-xs text-white/40">Connect wallet to submit score</p>
          )}
          {gameName && (
            <button
              onClick={() => {
                const statsText = stats
                  ? ' ' + Object.entries(stats).map(([k, v]) => `${k}: ${v}`).join(' | ')
                  : ''
                const text = `I scored ${score} in ${gameName}!${statsText}\n\n$BULK`
                const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://bulked.lol')}`
                window.open(url, '_blank', 'noopener,noreferrer')
              }}
              className="px-8 py-3 bg-gradient-to-r from-black to-neutral-800 border-2 border-white/30 rounded-xl text-white text-sm font-bold hover:scale-105 transition-transform cursor-pointer"
            >
              SHARE TO X
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
