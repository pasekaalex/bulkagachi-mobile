import { useRef, useState, useEffect, useCallback } from 'react'
import { ThreeCanvas } from '../../components/three/ThreeCanvas'
import { BackButton } from '../../components/layout/BackButton'
import { GameOverScreen } from '../../components/ui/GameOverScreen'
import { HUD } from '../../components/ui/HUD'
import { AchievementToast } from '../../components/ui/AchievementToast'
import { StreetsOfSchmegEngine } from '../../engines/StreetsOfSchmegEngine'
import { checkAndUnlock, type AchievementDef } from '../../lib/achievements'
import { useScoreSubmission } from '../../hooks/useLeaderboard'

export default function StreetsOfSchmeg() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<StreetsOfSchmegEngine | null>(null)
  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover' | 'win' | 'levelcomplete'>('title')
  const [score, setScore] = useState(0)
  const [health, setHealth] = useState(100)
  const [combo, setCombo] = useState(0)
  const [wave, setWave] = useState(1)
  const [maxCombo, setMaxCombo] = useState(0)
  const [bossHealth, setBossHealth] = useState<{current: number, max: number} | null>(null)
  const [achievementQueue, setAchievementQueue] = useState<AchievementDef[]>([])
  const { submit, state: submitState, reset: resetSubmit, error: submitError, wallet } = useScoreSubmission()

  // Track max combo
  useEffect(() => {
    if (combo > maxCombo) setMaxCombo(combo)
  }, [combo, maxCombo])

  useEffect(() => {
    if (gameState !== 'gameover' && gameState !== 'win') return
    resetSubmit()
    const newlyUnlocked = checkAndUnlock([
      { id: 'schmeg_1000', condition: score >= 1000 },
      { id: 'schmeg_5000', condition: score >= 5000 },
      { id: 'schmeg_10combo', condition: maxCombo >= 10 },
      { id: 'schmeg_beatgame', condition: gameState === 'win' },
    ])
    if (newlyUnlocked.length > 0) setAchievementQueue((q) => [...q, ...newlyUnlocked])
  }, [gameState, score, maxCombo])

  useEffect(() => {
    if (!containerRef.current) return
    const engine = new StreetsOfSchmegEngine(containerRef.current, {
      onScoreChange: setScore,
      onStateChange: setGameState,
      onHealthChange: setHealth,
      onComboChange: setCombo,
      onWaveChange: setWave,
      onBossHealthChange: setBossHealth,
          })
    engineRef.current = engine
    engine.init()
    return () => engine.dispose()
  }, [])

  const handleStart = useCallback(() => {
    setMaxCombo(0)
    engineRef.current?.start()
  }, [])

  const handleRestart = useCallback(() => {
    setMaxCombo(0)
    engineRef.current?.restart()
  }, [])

  const handleSubmitScore = useCallback(() => {
    submit('schmeg', score, { combo: maxCombo, wave })
  }, [submit, score, maxCombo, wave])

  return (
    <ThreeCanvas ref={containerRef} letterboxed fullWidth>
      {gameState !== 'playing' && <BackButton />}
      {gameState === 'title' && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90">
          {/* Game Box Cover Art */}
          <div className="relative w-[280px] sm:w-[360px] aspect-[2/3] rounded-lg overflow-hidden shadow-[0_0_60px_rgba(155,77,202,0.5),0_0_100px_rgba(0,0,0,0.8)] pointer-events-none bg-transparent">
            <img 
              src="/images/coverstreets.png" 
              alt="Streets of Schmeg Cover"
              className="w-full h-full object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          
          {/* Start button */}
          <button
            type="button"
            onClick={handleStart}
            style={{ touchAction: 'manipulation' }}
            className="mt-10 px-10 py-4 bg-gradient-to-r from-gold-DEFAULT via-yellow-500 to-gold-dark border-4 border-purple-DEFAULT rounded-2xl text-black text-xl font-bold hover:scale-110 active:scale-95 transition-all animate-pulse-glow cursor-pointer shadow-[0_0_40px_rgba(255,215,0,0.4)] font-[family-name:var(--font-display)] select-none"
          >
            START GAME
          </button>
          
          {/* Instructions */}
          <div className="mt-4 text-center">
            <p className="text-sm text-white/70">🎮 Move • 👊 Attack • ⚡ Combos</p>
          </div>
        </div>
      )}
      {gameState === 'playing' && (
        <>
          <HUD items={[
            { label: 'Score', value: score },
          ]} />
          {/* Hearts Display */}
          <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => {
              const heartValue = (i + 1) * 10
              const isFull = health >= heartValue
              const isHalf = health >= heartValue - 5 && health < heartValue
              return (
                <img
                  key={i}
                  src={isFull ? '/images/heart.png' : isHalf ? '/images/heart-half.png' : '/images/heart.png'}
                  alt="heart"
                  className="w-6 h-6 md:w-8 md:h-8"
                  style={{ 
                    imageRendering: 'pixelated',
                    opacity: isFull || isHalf ? 1 : 0.2,
                    filter: isFull || isHalf ? 'none' : 'grayscale(100%)'
                  }}
                />
              )
            })}
          </div>
          {/* Boss Health Bar */}
          {bossHealth && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 w-64 md:w-96">
              <div className="text-center text-red-400 font-bold text-sm mb-1 drop-shadow-[0_0_5px_rgba(255,0,0,0.8)]">TANK BOSS</div>
              <div className="h-4 bg-gray-900/80 border-2 border-red-500 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300"
                  style={{ width: `${(bossHealth.current / bossHealth.max) * 100}%` }}
                />
              </div>
              <div className="text-center text-white/60 text-xs mt-1">{bossHealth.current} / {bossHealth.max} HP</div>
            </div>
          )}
          {combo > 1 && (
            <div className="absolute top-36 left-1/2 -translate-x-1/2 text-3xl font-bold text-yellow-400 animate-bounce drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">
              {combo}x COMBO!
            </div>
          )}
        </>
      )}
      {gameState === 'gameover' && (
        <GameOverScreen
          title="GAME OVER"
          score={score}
          stats={{
            'Max Combo': `${maxCombo}x`
          }}
          onRestart={handleRestart}
          gameName="STREETS OF SCHMEG"
          onSubmitScore={wallet ? handleSubmitScore : undefined}
          submitState={submitState}
          submitError={submitError}
        />
      )}
      {gameState === 'win' && (
        <GameOverScreen
          title="VICTORY!"
          score={score}
          stats={{
            'Max Combo': `${maxCombo}x`,
            'Status': 'Boss Defeated!'
          }}
          onRestart={handleRestart}
          gameName="STREETS OF SCHMEG"
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
