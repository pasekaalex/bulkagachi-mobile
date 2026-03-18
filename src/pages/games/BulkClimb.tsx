import { useRef, useState, useEffect, useCallback } from 'react'
import { ThreeCanvas } from '../../components/three/ThreeCanvas'
import { BackButton } from '../../components/layout/BackButton'
import { GameOverScreen } from '../../components/ui/GameOverScreen'
import { HUD } from '../../components/ui/HUD'
import { AchievementToast } from '../../components/ui/AchievementToast'
import { BulkClimbEngine } from '../../engines/BulkClimbEngine'
import { checkAndUnlock, type AchievementDef } from '../../lib/achievements'
import { useScoreSubmission } from '../../hooks/useLeaderboard'

export default function BulkClimb() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<BulkClimbEngine | null>(null)
  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover' | 'win' | 'levelcomplete'>('title')
  const [score, setScore] = useState(0)
  const [height, setHeight] = useState(0)
  const [achievementQueue, setAchievementQueue] = useState<AchievementDef[]>([])
  const { submit, state: submitState, reset: resetSubmit, wallet } = useScoreSubmission()

  useEffect(() => {
    if (gameState !== 'gameover') return
    resetSubmit()
    const newlyUnlocked = checkAndUnlock([
      { id: 'climb_100', condition: height >= 100 },
      { id: 'climb_500', condition: height >= 500 },
      { id: 'climb_1000', condition: height >= 1000 },
    ])
    if (newlyUnlocked.length > 0) setAchievementQueue((q) => [...q, ...newlyUnlocked])
  }, [gameState, height])

  useEffect(() => {
    if (!containerRef.current) return
    const engine = new BulkClimbEngine(containerRef.current, {
      onScoreChange: setScore,
      onStateChange: setGameState,
      onHeightChange: setHeight,
    })
    engineRef.current = engine
    engine.init()
    return () => engine.dispose()
  }, [])

  const handleStart = useCallback(() => {
    engineRef.current?.start()
  }, [])

  const handleRestart = useCallback(() => {
    engineRef.current?.restart()
  }, [])

  const handleSubmitScore = useCallback(() => {
    submit('climb', score, { height })
  }, [submit, score, height])

  return (
    <ThreeCanvas ref={containerRef} letterboxed fullWidth>
      {gameState !== 'playing' && <BackButton />}
      {gameState === 'title' && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90">
          {/* Title at top */}
          <div className="text-center animate-fade-in-up mb-4">
            <h1 className="text-4xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-gold-DEFAULT via-yellow-400 to-yellow-600 text-shadow-gold mb-1 font-[family-name:var(--font-display)] drop-shadow-[0_0_30px_rgba(255,215,0,0.5)]">
              BULK
            </h1>
            <h1 className="text-5xl sm:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-purple-DEFAULT via-purple-400 to-purple-700 text-shadow-purple mb-1 font-[family-name:var(--font-display)] drop-shadow-[0_0_40px_rgba(155,77,202,0.6)] animate-pulse">
              CLIMB
            </h1>
            <p className="text-white/70 text-sm mt-2">Climb the skyscraper!</p>
          </div>
          
          {/* Game Box Cover Art */}
          <div className="relative w-[280px] sm:w-[360px] aspect-[3/4] rounded-lg overflow-hidden shadow-[0_0_60px_rgba(155,77,202,0.5),0_0_100px_rgba(0,0,0,0.8)] pointer-events-none bg-transparent">
            <img 
              src="/images/coverclimb.png" 
              alt="Bulk Climb Cover"
              className="w-full h-full object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          
          {/* Start button */}
          <button
            type="button"
            onClick={handleStart}
            style={{ touchAction: 'manipulation' }}
            className="mt-6 px-10 py-4 bg-gradient-to-r from-gold-DEFAULT via-yellow-500 to-gold-dark border-4 border-purple-DEFAULT rounded-2xl text-black text-xl font-bold hover:scale-110 active:scale-95 transition-all animate-pulse-glow cursor-pointer shadow-[0_0_40px_rgba(255,215,0,0.4)] font-[family-name:var(--font-display)] select-none"
          >
            START GAME
          </button>
          
          {/* Instructions */}
          <div className="mt-4 text-center max-w-md px-4">
            <p className="text-sm text-white/70">◀ ▶ Move • ⬆ Jump (double jump!)</p>
            <p className="text-xs text-white/50 mt-1">Land on platforms • Don&apos;t fall below the screen!</p>
          </div>
        </div>
      )}
      {gameState === 'playing' && (
        <HUD items={[
          { label: 'Score', value: score },
          { label: 'Height', value: `${height}m` },
        ]} />
      )}
      {gameState === 'gameover' && (
        <GameOverScreen
          title="GAME OVER"
          score={score}
          stats={{ Height: `${height}m` }}
          onRestart={handleRestart}
          gameName="BULK CLIMB"
          onSubmitScore={wallet ? handleSubmitScore : undefined}
          submitState={submitState}
        />
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
