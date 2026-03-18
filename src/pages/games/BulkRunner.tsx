import { useRef, useState, useEffect, useCallback } from 'react'
import { ThreeCanvas } from '../../components/three/ThreeCanvas'
import { BackButton } from '../../components/layout/BackButton'

import { GameOverScreen } from '../../components/ui/GameOverScreen'
import { HUD } from '../../components/ui/HUD'
import { AchievementToast } from '../../components/ui/AchievementToast'
import { BulkRunnerEngine } from '../../engines/BulkRunnerEngine'
import { checkAndUnlock, type AchievementDef } from '../../lib/achievements'
import { useScoreSubmission } from '../../hooks/useLeaderboard'

export default function BulkRunner() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<BulkRunnerEngine | null>(null)
  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover' | 'win' | 'levelcomplete'>('title')
  const [score, setScore] = useState(0)
  const [orbs, setOrbs] = useState(0)
  const [distance, setDistance] = useState(0)
  const [rageMode, setRageMode] = useState(false)
  const [rageActivated, setRageActivated] = useState(false)
  const [achievementQueue, setAchievementQueue] = useState<AchievementDef[]>([])
  const { submit, state: submitState, reset: resetSubmit, wallet } = useScoreSubmission()

  // Track if rage mode was ever activated this game
  useEffect(() => {
    if (rageMode) setRageActivated(true)
  }, [rageMode])

  useEffect(() => {
    if (gameState !== 'gameover') return
    resetSubmit()
    const newlyUnlocked = checkAndUnlock([
      { id: 'runner_500', condition: distance >= 500 },
      { id: 'runner_2000', condition: distance >= 2000 },
      { id: 'runner_rage', condition: rageActivated },
    ])
    if (newlyUnlocked.length > 0) setAchievementQueue((q) => [...q, ...newlyUnlocked])
  }, [gameState, distance, rageActivated])

  useEffect(() => {
    if (!containerRef.current) return
    const engine = new BulkRunnerEngine(containerRef.current, {
      onScoreChange: setScore,
      onStateChange: setGameState,
      onOrbsChange: setOrbs,
      onDistanceChange: setDistance,
      onRageModeChange: setRageMode,
    })
    engineRef.current = engine
    engine.init()
    return () => engine.dispose()
  }, [])

  const handleStart = useCallback(() => {
    engineRef.current?.start()
  }, [])

  const handleRestart = useCallback(() => {
    setRageActivated(false)
    engineRef.current?.restart()
  }, [])

  const handleSubmitScore = useCallback(() => {
    submit('runner', score, { distance })
  }, [submit, score, distance])

  return (
    <ThreeCanvas ref={containerRef} letterboxed fullWidth>
      {gameState !== 'playing' && <BackButton />}
      {gameState === 'title' && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90">
          {/* Title at top */}
          <div className="text-center animate-fade-in-up mb-4">
            <h1 className="text-5xl sm:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-gold-DEFAULT via-yellow-400 to-yellow-600 text-shadow-gold mb-1 font-[family-name:var(--font-display)] drop-shadow-[0_0_30px_rgba(255,215,0,0.5)] animate-pulse">
              BULK RUNNER
            </h1>
            <p className="text-white/70 text-sm mt-2">Run through the night city!</p>
          </div>
          
          {/* Game Box Cover Art */}
          <div className="relative w-[280px] sm:w-[360px] aspect-[3/4] rounded-lg overflow-hidden shadow-[0_0_60px_rgba(155,77,202,0.5),0_0_100px_rgba(0,0,0,0.8)] pointer-events-none bg-transparent">
            <img 
              src="/images/coverrunner.png" 
              alt="Bulk Runner Cover"
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
          <div className="mt-4 text-center">
            <p className="text-sm text-white/70">🎮 Arrow keys / Swipe to change lanes</p>
            <p className="text-sm text-white/70">Space / Tap to jump</p>
          </div>
        </div>
      )}
      {gameState === 'playing' && (
        <HUD items={[
          { label: 'Score', value: score },
          { label: 'Schmeg', value: `${orbs}/20` },
          { label: 'Distance', value: `${distance}m` },
        ]} />
      )}
      {rageMode && gameState === 'playing' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 text-4xl font-bold text-purple-DEFAULT animate-pulse drop-shadow-[0_0_10px_rgba(155,48,255,1)]">
          RAGE MODE!
        </div>
      )}
      {gameState === 'gameover' && (
        <GameOverScreen
          title="GAME OVER"
          score={score}
          stats={{ Distance: `${distance}m` }}
          onRestart={handleRestart}
          gameName="BULK RUNNER"
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
