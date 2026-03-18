import { useRef, useState, useEffect, useCallback } from 'react'
import { ThreeCanvas } from '../../components/three/ThreeCanvas'
import { BackButton } from '../../components/layout/BackButton'
import { TitleScreen } from '../../components/ui/TitleScreen'
import { GameOverScreen } from '../../components/ui/GameOverScreen'
import { HUD } from '../../components/ui/HUD'
import { AchievementToast } from '../../components/ui/AchievementToast'
import { BulkBreakerEngine } from '../../engines/BulkBreakerEngine'
import { checkAndUnlock, type AchievementDef } from '../../lib/achievements'
import { useScoreSubmission } from '../../hooks/useLeaderboard'

export default function BulkBreaker() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<BulkBreakerEngine | null>(null)
  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover' | 'win' | 'levelcomplete'>('title')
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lives, setLives] = useState(3)
  const [achievementQueue, setAchievementQueue] = useState<AchievementDef[]>([])
  const [personalBest, setPersonalBest] = useState(() => {
    const saved = localStorage.getItem('bulkbreaker_pb')
    return saved ? parseInt(saved, 10) : 0
  })
  const { submit, state: submitState, reset: resetSubmit, error: submitError, wallet } = useScoreSubmission()

  useEffect(() => {
    if (gameState !== 'gameover') return
    resetSubmit()

    if (score > personalBest) {
      setPersonalBest(score)
      localStorage.setItem('bulkbreaker_pb', score.toString())
    }

    const newlyUnlocked = checkAndUnlock([
      { id: 'breaker_first', condition: score >= 100 },
      { id: 'breaker_1000', condition: score >= 1000 },
      { id: 'breaker_5000', condition: score >= 5000 },
      { id: 'breaker_level5', condition: level >= 5 },
    ])
    if (newlyUnlocked.length > 0) setAchievementQueue((q) => [...q, ...newlyUnlocked])
  }, [gameState, score, personalBest, level])

  useEffect(() => {
    if (!containerRef.current) return
    const engine = new BulkBreakerEngine(containerRef.current, {
      onScoreChange: setScore,
      onStateChange: setGameState,
      onLevelChange: setLevel,
      onLivesChange: setLives,
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

  const handleEnd = useCallback(() => {
    engineRef.current?.stop()
  }, [])

  const handleSubmitScore = useCallback(() => {
    submit('breaker', score, { Level: level })
  }, [submit, score, level])

  return (
    <ThreeCanvas ref={containerRef} letterboxed fullWidth>
      {gameState !== 'playing' && <BackButton />}
      {gameState === 'title' && (
        <TitleScreen
          title="BULK BREAKER"
          subtitle="Smash all the bricks!"
          instructions={[
            'Move mouse/touch to control Bulk paddle',
            'Bounce the ball to break bricks',
            'Catch power-ups for bonuses!',
            ...(personalBest > 0 ? [`Personal Best: ${personalBest.toLocaleString()}`] : [])
          ]}
          onStart={handleStart}
        />
      )}
      {gameState === 'playing' && (
        <>
          <HUD items={[
            { label: 'Score', value: score },
            { label: 'Level', value: level },
            { label: 'Lives', value: lives },
          ]} />

          {/* Lives hearts */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <span className="text-red-500 text-xl">
              {'♥'.repeat(lives)}
            </span>
          </div>

          <button
            onClick={handleEnd}
            className="absolute top-4 left-4 z-20 px-3 py-1.5 bg-black/50 border border-white/20 rounded-lg text-white/60 text-xs font-bold hover:bg-black/70 hover:text-white/90 transition-all cursor-pointer"
          >
            END
          </button>
        </>
      )}
      {gameState === 'gameover' && (
        <GameOverScreen
          title="GAME OVER"
          score={score}
          stats={{
            'Level Reached': level,
            ...(score >= personalBest && score > 0 ? { '🎉 NEW BEST!': personalBest.toLocaleString() } : { 'Personal Best': personalBest.toLocaleString() })
          }}
          onRestart={handleRestart}
          gameName="BULK BREAKER"
          onSubmitScore={wallet ? handleSubmitScore : undefined}
          submitState={submitState}
          submitError={submitError}
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
