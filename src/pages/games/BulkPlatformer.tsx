import { useRef, useState, useEffect, useCallback } from 'react'
import { ThreeCanvas } from '../../components/three/ThreeCanvas'
import { BackButton } from '../../components/layout/BackButton'
import { GameOverScreen } from '../../components/ui/GameOverScreen'
import { AchievementToast } from '../../components/ui/AchievementToast'
import { BulkPlatformerEngine } from '../../engines/BulkPlatformerEngine'
import { checkAndUnlock, type AchievementDef } from '../../lib/achievements'
import { useScoreSubmission } from '../../hooks/useLeaderboard'

const WORLD_NAMES = ['Grasslands', 'Desert', 'Countryside', 'City', 'Moon', 'Dark Fortress']

export default function BulkPlatformer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<BulkPlatformerEngine | null>(null)
  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover' | 'win' | 'levelcomplete'>('title')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [schmegCount, setSchmegCount] = useState(0)
  const [currentWorld, setCurrentWorld] = useState(1)
  const [progress, setProgress] = useState(0)
  const isGauntletMode = currentWorld === 99
  const [achievementQueue, setAchievementQueue] = useState<AchievementDef[]>([])
  const { submit, state: submitState, reset: resetSubmit, error: submitError, wallet } = useScoreSubmission()

  useEffect(() => {
    if (gameState !== 'gameover' && gameState !== 'win') return
    resetSubmit()
    const newlyUnlocked = checkAndUnlock([
      { id: 'platformer_first', condition: score >= 100 },
      { id: 'platformer_1000', condition: score >= 1000 },
      { id: 'platformer_5000', condition: score >= 5000 },
      { id: 'platformer_world2', condition: currentWorld >= 2 },
      { id: 'platformer_world3', condition: currentWorld >= 3 },
      { id: 'platformer_world4', condition: currentWorld >= 4 },
      { id: 'platformer_world5', condition: currentWorld >= 5 },
      { id: 'platformer_world6', condition: currentWorld >= 6 },
      { id: 'platformer_secret', condition: currentWorld >= 7 },
      { id: 'platformer_win', condition: gameState === 'win' },
    ])
    if (newlyUnlocked.length > 0) setAchievementQueue((q) => [...q, ...newlyUnlocked])
  }, [gameState, score, currentWorld])

  useEffect(() => {
    if (!containerRef.current) return
    const engine = new BulkPlatformerEngine(containerRef.current, {
      onScoreChange: setScore,
      onStateChange: setGameState,
      onWaveChange: setCurrentWorld,
      onLivesChange: setLives,
      onSchmegChange: setSchmegCount,
      onProgressChange: (p) => setProgress(p.percent),
    })
    engineRef.current = engine
    engine.init()
    return () => engine.dispose()
  }, [])

  const handleStart = useCallback(() => engineRef.current?.start(), [])
  const handleStartGauntlet = useCallback(() => engineRef.current?.startGauntlet(), [])
  const handleRestart = useCallback(() => engineRef.current?.restart(), [])
  const handleSubmitScore = useCallback(() => {
    submit('bros', score, { World: currentWorld })
  }, [submit, score, currentWorld])

  return (
    <ThreeCanvas ref={containerRef} letterboxed fullWidth>
      {gameState !== 'playing' && gameState !== 'levelcomplete' && <BackButton />}
      {gameState === 'title' && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90">
          {/* Title at top */}
          <div className="text-center animate-fade-in-up mb-4">
            <h1 className="text-4xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-gold-DEFAULT via-yellow-400 to-yellow-600 text-shadow-gold mb-1 font-[family-name:var(--font-display)] drop-shadow-[0_0_30px_rgba(255,215,0,0.5)]">
              SUPER BULK
            </h1>
            <h1 className="text-5xl sm:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-purple-DEFAULT via-purple-400 to-purple-700 text-shadow-purple mb-1 font-[family-name:var(--font-display)] drop-shadow-[0_0_40px_rgba(155,77,202,0.6)] animate-pulse">
              BROS
            </h1>
            <p className="text-white/70 text-sm mt-2">6 worlds to conquer! Defeat the Dark Bulk!</p>
          </div>
          
          {/* Game Box Cover Art */}
          <div className="relative w-[280px] sm:w-[360px] aspect-[3/4] rounded-lg overflow-hidden shadow-[0_0_60px_rgba(155,77,202,0.5),0_0_100px_rgba(0,0,0,0.8)] pointer-events-none bg-transparent">
            <img 
              src="/images/coverbros.png" 
              alt="Super Bulk Bros Cover"
              className="w-full h-full object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          
          {/* Buttons - vertical on mobile, side-by-side on desktop */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mt-4">
            {/* Start button */}
            <button
              type="button"
              onClick={handleStart}
              style={{ touchAction: 'manipulation' }}
              className="px-10 py-4 bg-gradient-to-r from-gold-DEFAULT via-yellow-500 to-gold-dark border-4 border-purple-DEFAULT rounded-2xl text-black text-xl font-bold hover:scale-110 active:scale-95 transition-all animate-pulse-glow cursor-pointer shadow-[0_0_40px_rgba(255,215,0,0.4)] font-[family-name:var(--font-display)] select-none"
            >
              START GAME
            </button>

            {/* Gauntlet Mode button */}
            <button
              type="button"
              onClick={handleStartGauntlet}
              style={{ touchAction: 'manipulation' }}
              className="px-8 py-3 bg-gradient-to-r from-red-800 via-red-600 to-red-900 border-4 border-red-400 rounded-2xl text-white text-lg font-bold hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-[0_0_30px_rgba(255,0,0,0.4)] font-[family-name:var(--font-display)] select-none"
            >
              ☠️ GAUNTLET MODE
            </button>

          </div>
          
          {/* Instructions */}
          <div className="mt-4 text-center max-w-md px-4">
            <p className="text-sm text-white/70">🎮 Arrow keys/WASD • Space to jump • Z/X to shoot orb</p>
            <p className="text-xs text-white/50 mt-1">Mobile: Left side move • Right side jump & shoot</p>
          </div>
        </div>
      )}
      {gameState === 'playing' && (
        <>
        {isGauntletMode ? (
        // Gauntlet HUD: just timer + lives
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1">
          <div className="text-xl sm:text-2xl font-bold text-red-400 text-shadow-gold">☠️ GAUNTLET</div>
          <div className="text-3xl sm:text-4xl font-bold text-white font-mono">{score.toFixed(2)}s</div>
        </div>
        ) : (
        // Normal HUD - larger and centered
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
          <div className="text-base sm:text-lg font-bold text-shadow-gold">
            <span className="text-gold-DEFAULT">World {currentWorld}: </span>
            <span className="text-white">{WORLD_NAMES[currentWorld - 1] || ''}</span>
          </div>
          <div className="flex items-center gap-2">
            {Array.from({ length: lives }).map((_, i) => (
              <img
                key={i}
                src="/images/heart.png"
                alt="♥"
                className="w-8 h-8 sm:w-10 sm:h-10"
                style={{ imageRendering: 'pixelated' }}
              />
            ))}
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <img
                key={i}
                src="/images/schmeg.png"
                alt="schmeg"
                className="w-5 h-5 sm:w-6 sm:h-6 transition-opacity"
                style={{ imageRendering: 'pixelated', opacity: i < schmegCount ? 1 : 0.2 }}
              />
            ))}
          </div>
          <div className="text-sm sm:text-base font-bold text-shadow-gold">
            <span className="text-gold-DEFAULT">Score: </span>
            <span className="text-white">{score}</span>
          </div>
          {/* Progress bar */}
          <div className="w-32 sm:w-48 h-3 bg-gray-800 rounded-full overflow-hidden border-2 border-gray-600">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-100"
              style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
            />
          </div>
        </div>
        )}
        </>
      )}
      {gameState === 'levelcomplete' && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="text-center">
            <div className="text-5xl font-bold text-yellow-400 animate-pulse drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]">
              WORLD {currentWorld} COMPLETE!
            </div>
            <div className="text-xl text-white mt-4 opacity-80">
              {currentWorld < 6 ? `Next: ${WORLD_NAMES[currentWorld]} ...` : 'Final world cleared!'}
            </div>
          </div>
        </div>
      )}
      {gameState === 'gameover' && (
        <GameOverScreen
          title="GAME OVER"
          score={score}
          stats={{ World: currentWorld }}
          onRestart={handleRestart}
          gameName="SUPER BULK BROS"
          onSubmitScore={wallet ? handleSubmitScore : undefined}
          submitState={submitState}
          submitError={submitError}
        />
      )}
      {gameState === 'win' && isGauntletMode && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/95">
          <h1 className="text-5xl font-bold text-red-400 font-[family-name:var(--font-display)] mb-2">GAUNTLET CLEAR</h1>
          <div className="text-6xl font-bold text-white font-mono mb-1">{score.toFixed(2)}s</div>
          <div className="text-white/50 text-sm mb-6">Best time is saved locally</div>
          <button
            type="button"
            onClick={handleStartGauntlet}
            style={{ touchAction: 'manipulation' }}
            className="px-8 py-3 bg-gradient-to-r from-red-800 via-red-600 to-red-900 border-4 border-red-400 rounded-2xl text-white text-lg font-bold hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-[0_0_30px_rgba(255,0,0,0.4)] font-[family-name:var(--font-display)] select-none"
          >
            TRY AGAIN
          </button>
          <button
            type="button"
            onClick={handleRestart}
            className="mt-3 text-white/50 text-sm underline cursor-pointer"
          >
            Back to menu
          </button>
        </div>
      )}
      {gameState === 'win' && !isGauntletMode && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90">
          {/* Victory Title */}
          <div className="text-center animate-fade-in-up mb-4">
            <h1 className="text-4xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-gold-DEFAULT via-yellow-400 to-yellow-600 text-shadow-gold mb-1 font-[family-name:var(--font-display)] drop-shadow-[0_0_30px_rgba(255,215,0,0.5)]">
              YOU WIN!
            </h1>
            <h2 className="text-3xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-green-400 via-green-500 to-green-700 mb-2 font-[family-name:var(--font-display)] drop-shadow-[0_0_40px_rgba(74,222,128,0.6)] animate-pulse">
              DARK BULK DEFEATED!
            </h2>
            <p className="text-white/70 text-sm mt-2">All 6 worlds conquered!</p>
          </div>
          
          {/* Score Display */}
          <div className="text-center mb-6">
            <div className="text-6xl font-bold text-yellow-400 drop-shadow-[0_0_20px_rgba(255,215,0,0.5)]">
              {score.toLocaleString()}
            </div>
            <div className="text-white/60 text-sm">Final Score</div>
          </div>
          
          {/* Buttons */}
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={handleRestart}
              style={{ touchAction: 'manipulation' }}
              className="px-10 py-4 bg-gradient-to-r from-gold-DEFAULT via-yellow-500 to-gold-dark border-4 border-purple-DEFAULT rounded-2xl text-black text-xl font-bold hover:scale-110 active:scale-95 transition-all animate-pulse-glow cursor-pointer shadow-[0_0_40px_rgba(255,215,0,0.4)] font-[family-name:var(--font-display)] select-none"
            >
              PLAY AGAIN
            </button>
            
            {wallet && (
              <button
                type="button"
                onClick={handleSubmitScore}
                disabled={submitState === 'submitting' || submitState === 'submitted'}
                style={{ touchAction: 'manipulation' }}
                className="px-8 py-3 bg-gradient-to-r from-green-500 via-green-600 to-green-700 border-4 border-green-400 rounded-2xl text-white text-lg font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-[0_0_30px_rgba(74,222,128,0.4)] font-[family-name:var(--font-display)] select-none disabled:opacity-50"
              >
                {submitState === 'submitting' ? 'Submitting...' : 
                 submitState === 'submitted' ? 'Score Saved!' : 
                 submitState === 'error' ? 'Try Again' : 'Submit Score'}
              </button>
            )}
            
            {submitError && (
              <p className="text-red-400 text-sm text-center">{submitError}</p>
            )}
          </div>
        </div>
      )}
      {achievementQueue.length > 0 && (
        <AchievementToast
          achievement={achievementQueue[0]}
          onDone={() => setAchievementQueue((q) => q.slice(1))}
        />
      )}
    </ThreeCanvas>
  )
}

// Mobile Control Panel Component - rendered via portal in engine
