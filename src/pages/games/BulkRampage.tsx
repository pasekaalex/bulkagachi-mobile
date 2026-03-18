import { useRef, useState, useEffect, useCallback } from 'react'
import { ThreeCanvas } from '../../components/three/ThreeCanvas'
import { BackButton } from '../../components/layout/BackButton'
import { TitleScreen } from '../../components/ui/TitleScreen'
import { GameOverScreen } from '../../components/ui/GameOverScreen'
import { AchievementToast } from '../../components/ui/AchievementToast'
import { BulkRampageEngine, type RampageCallbacks } from '../../engines/BulkRampageEngine'
import { checkAndUnlock, type AchievementDef } from '../../lib/achievements'
import { useScoreSubmission } from '../../hooks/useLeaderboard'

interface FloatingText {
  id: number
  x: number
  y: number
  text: string
  type: string
}

interface BossInfo {
  name: string
  healthPercent: number
}

interface PowerupState {
  active: boolean
  timer: number
}

interface WaveAnnouncementData {
  wave: number
  subtitle: string
}

interface AnnouncementData {
  id: number
  text: string
  type: string
}

let floatingTextId = 0
let announcementId = 0

export default function BulkRampage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<BulkRampageEngine | null>(null)
  const minimapRef = useRef<HTMLDivElement>(null)

  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover' | 'win' | 'levelcomplete'>('title')
  const [score, setScore] = useState(0)
  const [health, setHealth] = useState(100)
  const [maxHealth, setMaxHealth] = useState(100)
  const [rage, setRage] = useState(100)
  const [combo, setCombo] = useState(0)
  const [comboMultiplier, setComboMultiplier] = useState(1)
  const [wave, setWave] = useState(1)
  const [destruction, setDestruction] = useState(0)
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const [xpToLevel, setXpToLevel] = useState(100)
  const [wantedLevel, setWantedLevel] = useState(1)
  const [boss, setBoss] = useState<BossInfo | null>(null)
  const [powerups, setPowerups] = useState<Record<string, PowerupState>>({
    schmeg: { active: false, timer: 0 },
    speed: { active: false, timer: 0 },
    magnet: { active: false, timer: 0 },
    shield: { active: false, timer: 0 },
  })
  const [waveAnnouncement, setWaveAnnouncement] = useState<WaveAnnouncementData | null>(null)
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([])
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([])
  const [screenFlash, setScreenFlash] = useState<string | null>(null)
  const [totalKills, setTotalKills] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [destroyedBuildings, setDestroyedBuildings] = useState(0)
  const [achievementQueue, setAchievementQueue] = useState<AchievementDef[]>([])
  const { submit, state: submitState, reset: resetSubmit, wallet } = useScoreSubmission()

  useEffect(() => {
    if (gameState !== 'gameover') return
    resetSubmit()
    const newlyUnlocked = checkAndUnlock([
      { id: 'rampage_wave3', condition: wave >= 3 },
      { id: 'rampage_wave5', condition: wave >= 5 },
      { id: 'rampage_kills50', condition: totalKills >= 50 },
      { id: 'rampage_combo20', condition: maxCombo >= 20 },
    ])
    if (newlyUnlocked.length > 0) setAchievementQueue((q) => [...q, ...newlyUnlocked])
  }, [gameState, wave, totalKills, maxCombo])

  // Joystick state
  const joystickTouchIdRef = useRef<number | null>(null)
  const joystickCenterRef = useRef({ x: 0, y: 0 })

  // Camera touch state
  const cameraTouchIdRef = useRef<number | null>(null)
  const lastCameraTouchRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!containerRef.current) return

    const callbacks: RampageCallbacks = {
      onScoreChange: setScore,
      onStateChange: setGameState,
      onHealthChange: (h: number, mh: number) => {
        setHealth(h)
        setMaxHealth(mh)
      },
      onRageChange: setRage,
      onComboChange: (c: number, m: number) => {
        setCombo(c)
        setComboMultiplier(m)
      },
      onWaveChange: setWave,
      onDestructionChange: setDestruction,
      onLevelChange: setLevel,
      onXPChange: (x: number, xtl: number) => {
        setXp(x)
        setXpToLevel(xtl)
      },
      onWantedLevelChange: setWantedLevel,
      onBossChange: setBoss,
      onPowerupChange: (ps: Record<string, PowerupState>) => setPowerups({ ...ps }),
      onWaveAnnouncement: (w: number, sub: string) => {
        setWaveAnnouncement({ wave: w, subtitle: sub })
        setTimeout(() => setWaveAnnouncement(null), 3000)
      },
      onAnnouncement: (text: string, type: string) => {
        const id = ++announcementId
        setAnnouncements((prev) => [...prev, { id, text, type }])
        setTimeout(() => {
          setAnnouncements((prev) => prev.filter((a) => a.id !== id))
        }, 1500)
      },
      onFloatingText: (x: number, y: number, text: string, type: string) => {
        const id = ++floatingTextId
        setFloatingTexts((prev) => [...prev, { id, x, y, text, type }])
        setTimeout(() => {
          setFloatingTexts((prev) => prev.filter((ft) => ft.id !== id))
        }, 1000)
      },
      onScreenFlash: (type: string) => {
        setScreenFlash(type)
        setTimeout(() => setScreenFlash(null), 150)
      },
      onTotalKillsChange: setTotalKills,
      onMaxComboChange: setMaxCombo,
      onDestroyedBuildingsChange: setDestroyedBuildings,
    }

    const engine = new BulkRampageEngine(containerRef.current, callbacks)
    engineRef.current = engine
    engine.init()

    return () => engine.dispose()
  }, [])

  // Attach minimap canvas
  useEffect(() => {
    if (gameState !== 'playing') return
    const canvas = engineRef.current?.getMinimapCanvas()
    if (canvas && minimapRef.current) {
      minimapRef.current.innerHTML = ''
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      minimapRef.current.appendChild(canvas)
    }
  }, [gameState])

  const handleStart = useCallback(() => {
    engineRef.current?.start()
  }, [])

  const handleRestart = useCallback(() => {
    engineRef.current?.restart()
  }, [])

  const handleSubmitScore = useCallback(() => {
    submit('rampage', score, {
      wave,
      kills: totalKills,
      maxCombo,
      buildings: destroyedBuildings,
    })
  }, [submit, score, wave, totalKills, maxCombo, destroyedBuildings])

  // Mobile handlers
  const handleJoystickStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const touch = e.touches[0]
    if (!touch) return
    const rect = e.currentTarget.getBoundingClientRect()
    joystickCenterRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }
    joystickTouchIdRef.current = touch.identifier
  }, [])

  const handleJoystickMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (joystickTouchIdRef.current === null) return
    const touch = Array.from(e.touches).find(
      (t) => t.identifier === joystickTouchIdRef.current,
    )
    if (!touch) return

    const rect = e.currentTarget.getBoundingClientRect()
    const maxDist = rect.width / 2 - 25
    let dx = touch.clientX - joystickCenterRef.current.x
    let dy = touch.clientY - joystickCenterRef.current.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > maxDist) {
      dx = (dx / dist) * maxDist
      dy = (dy / dist) * maxDist
    }

    const normX = dx / maxDist
    const normY = dy / maxDist
    engineRef.current?.setMobileMovement(normX, normY)
  }, [])

  const handleJoystickEnd = useCallback((e: React.TouchEvent) => {
    const touch = Array.from(e.changedTouches).find(
      (t) => t.identifier === joystickTouchIdRef.current,
    )
    if (touch) {
      joystickTouchIdRef.current = null
      engineRef.current?.resetMobileMovement()
    }
  }, [])

  const handleCameraTouchStart = useCallback((e: React.TouchEvent) => {
    if (cameraTouchIdRef.current !== null) return
    const touch = e.touches[0]
    cameraTouchIdRef.current = touch.identifier
    lastCameraTouchRef.current = { x: touch.clientX, y: touch.clientY }
  }, [])

  const handleCameraTouchMove = useCallback((e: React.TouchEvent) => {
    if (cameraTouchIdRef.current === null) return
    const touch = Array.from(e.touches).find(
      (t) => t.identifier === cameraTouchIdRef.current,
    )
    if (!touch) return

    const dx = (touch.clientX - lastCameraTouchRef.current.x) / window.innerWidth * 2
    const dy = (touch.clientY - lastCameraTouchRef.current.y) / window.innerHeight * 2
    engineRef.current?.applyCameraOffset(dx, dy)

    lastCameraTouchRef.current = { x: touch.clientX, y: touch.clientY }
  }, [])

  const handleCameraTouchEnd = useCallback((e: React.TouchEvent) => {
    const touch = Array.from(e.changedTouches).find(
      (t) => t.identifier === cameraTouchIdRef.current,
    )
    if (touch) {
      cameraTouchIdRef.current = null
    }
  }, [])

  const healthPercent = maxHealth > 0 ? (health / maxHealth) * 100 : 0
  const xpPercent = xpToLevel > 0 ? (xp / xpToLevel) * 100 : 0

  const flashClasses: Record<string, string> = {
    damage: 'bg-red-500/50',
    schmeg: 'bg-gradient-to-br from-purple-500/50 to-pink-500/50',
    heal: 'bg-green-500/30',
    levelup: 'bg-cyan-500/50',
  }

  const floatingTextColors: Record<string, string> = {
    damage: 'text-red-500 text-xl',
    score: 'text-yellow-400 text-lg',
    combo: 'text-fuchsia-500 text-2xl',
    heal: 'text-green-400 text-xl',
    levelup: 'text-cyan-400 text-3xl',
  }

  return (
    <ThreeCanvas ref={containerRef}>
      {gameState !== 'playing' && <BackButton />}

      {/* ─── Title Screen ─── */}
      {gameState === 'title' && (
        <TitleScreen
          title="THE AMAZING BULK"
          subtitle="THE VIDEO GAME"
          instructions={[
            'WASD / Arrows to move',
            'Space / Click to smash',
            'Shift to rage mode',
            'E: Ground Pound, R: Taunt',
          ]}
          onStart={handleStart}
        />
      )}

      {/* ─── HUD - Playing State ─── */}
      {gameState === 'playing' && (
        <>
          {/* Top left: Score, Health, Rage, Destruction, XP */}
          <div className="absolute top-2 left-2 z-20 flex flex-col gap-1 pointer-events-none">
            <div className="bg-black/80 border border-purple-500 px-2 py-1 text-[10px] sm:text-xs shadow-[0_0_10px_rgba(155,48,255,0.5)]">
              <div className="text-white/70">SCORE</div>
              <div className="text-yellow-300 text-sm sm:text-base font-bold">
                {score.toLocaleString()}
              </div>
            </div>
            <div className="bg-black/80 border border-purple-500 px-2 py-1 text-[10px] sm:text-xs shadow-[0_0_10px_rgba(155,48,255,0.5)]">
              <div className="text-white/70">HEALTH</div>
              <div className="w-24 sm:w-36 h-3 bg-neutral-800 border border-neutral-600 mt-0.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-[width] duration-200"
                  style={{ width: `${healthPercent}%` }}
                />
              </div>
            </div>
            <div className="bg-black/80 border border-purple-500 px-2 py-1 text-[10px] sm:text-xs shadow-[0_0_10px_rgba(155,48,255,0.5)]">
              <div className="text-white/70">RAGE</div>
              <div className="w-24 sm:w-36 h-3 bg-neutral-800 border border-neutral-600 mt-0.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-fuchsia-500 transition-[width] duration-200"
                  style={{ width: `${rage}%` }}
                />
              </div>
            </div>
            <div className="bg-black/80 border border-purple-500 px-2 py-1 text-[10px] sm:text-xs shadow-[0_0_10px_rgba(155,48,255,0.5)]">
              <div className="text-white/70">DESTRUCTION</div>
              <div className="text-yellow-300 text-sm sm:text-base font-bold">{destruction}%</div>
            </div>
            <div className="bg-black/80 border border-purple-500 px-2 py-1 text-[10px] sm:text-xs shadow-[0_0_10px_rgba(155,48,255,0.5)]">
              <div className="text-white/70">XP</div>
              <div className="w-24 sm:w-36 h-3 bg-neutral-800 border border-neutral-600 mt-0.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-[width] duration-200"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Top center: Level */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none">
            <div className="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_10px_cyan]" style={{ fontFamily: 'var(--font-display), sans-serif' }}>
              LV {level}
            </div>
          </div>

          {/* Top right: Wanted stars */}
          <div className="absolute top-3 right-3 z-20 flex gap-1 pointer-events-none">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`text-xl transition-all duration-300 ${
                  star <= wantedLevel
                    ? 'opacity-100 animate-pulse'
                    : 'opacity-30 grayscale'
                }`}
              >
                *
              </span>
            ))}
          </div>

          {/* Center right: Combo */}
          {combo > 0 && (
            <div className="absolute top-1/2 right-4 -translate-y-1/2 z-20 text-right pointer-events-none animate-fade-in-up">
              <div
                className="text-4xl sm:text-5xl text-fuchsia-500 drop-shadow-[0_0_20px_fuchsia]"
                style={{ fontFamily: 'var(--font-display), sans-serif' }}
              >
                {combo}
              </div>
              <div className="text-sm text-yellow-300">COMBO!</div>
              <div className="text-lg text-green-400 drop-shadow-[0_0_10px_green]">
                x{comboMultiplier.toFixed(1)}
              </div>
            </div>
          )}

          {/* Wave Announcement */}
          {waveAnnouncement && (
            <div className="absolute top-[20%] left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none animate-scale-in">
              <div
                className="text-5xl sm:text-6xl text-red-500 drop-shadow-[0_0_30px_red]"
                style={{ fontFamily: 'var(--font-display), sans-serif' }}
              >
                WAVE {waveAnnouncement.wave}
              </div>
              <div className="text-xl text-white mt-2">{waveAnnouncement.subtitle}</div>
            </div>
          )}

          {/* Boss health bar */}
          {boss && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 w-[60%] max-w-md pointer-events-none">
              <div
                className="text-xl sm:text-2xl text-red-500 text-center mb-1 drop-shadow-[0_0_10px_red]"
                style={{ fontFamily: 'var(--font-display), sans-serif' }}
              >
                {boss.name}
              </div>
              <div className="w-full h-5 sm:h-6 bg-neutral-800 border-2 border-red-600">
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 transition-[width] duration-300"
                  style={{ width: `${boss.healthPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Bottom center: Powerup icons */}
          <div className="absolute bottom-14 sm:bottom-16 left-1/2 -translate-x-1/2 z-20 flex gap-2 pointer-events-none">
            {(['schmeg', 'speed', 'magnet', 'shield'] as const).map((key) => {
              const icons: Record<string, { emoji: string; color: string }> = {
                schmeg: { emoji: 'S', color: 'border-fuchsia-500' },
                speed: { emoji: 'Z', color: 'border-cyan-400' },
                magnet: { emoji: 'M', color: 'border-yellow-400' },
                shield: { emoji: 'D', color: 'border-green-400' },
              }
              const info = icons[key]
              const state = powerups[key]
              const isActive = state?.active
              return (
                <div
                  key={key}
                  className={`w-10 h-10 sm:w-12 sm:h-12 border-2 ${info.color} rounded-lg flex items-center justify-center text-lg relative ${
                    isActive ? 'opacity-100 shadow-lg' : 'opacity-30'
                  }`}
                >
                  {info.emoji}
                  {isActive && state.timer > 0 && (
                    <span className="absolute -bottom-4 text-[9px] text-white">
                      {Math.ceil(state.timer / 60)}s
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Bottom right: Minimap */}
          <div
            ref={minimapRef}
            className="absolute bottom-20 right-3 w-[100px] h-[100px] sm:w-[150px] sm:h-[150px] bg-black/70 border-2 border-purple-500 rounded overflow-hidden z-20 pointer-events-none"
          />

          {/* Bottom center: Controls hint (desktop only) */}
          <div className="hidden sm:block absolute bottom-2 left-1/2 -translate-x-1/2 z-20 bg-black/80 border border-purple-500 px-4 py-1.5 text-[10px] text-neutral-500 text-center pointer-events-none">
            WASD: MOVE | SPACE/CLICK: SMASH | SHIFT: RAGE | E: GROUND POUND | R: TAUNT
          </div>

          {/* Floating texts */}
          {floatingTexts.map((ft) => (
            <div
              key={ft.id}
              className={`absolute z-30 pointer-events-none animate-float-up ${floatingTextColors[ft.type] ?? 'text-white text-lg'}`}
              style={{
                left: ft.x,
                top: ft.y,
                fontFamily: 'var(--font-display), sans-serif',
                textShadow: '2px 2px 0 #000',
              }}
            >
              {ft.text}
            </div>
          ))}

          {/* Announcements */}
          {announcements.map((a) => (
            <div
              key={a.id}
              className="absolute top-[35%] left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-scale-in whitespace-nowrap"
              style={{
                fontFamily: 'var(--font-display), sans-serif',
                fontSize: '2rem',
                textShadow: '0 0 20px currentColor, 3px 3px 0 #000',
                color:
                  a.type === 'kill-streak'
                    ? '#ff6600'
                    : a.type === 'power-up'
                      ? '#00ffff'
                      : a.type === 'achievement'
                        ? '#ffd700'
                        : a.type === 'combo'
                          ? '#ff00ff'
                          : '#ffffff',
              }}
            >
              {a.text}
            </div>
          ))}

          {/* Screen flash */}
          {screenFlash && (
            <div
              className={`absolute inset-0 z-30 pointer-events-none animate-flash ${flashClasses[screenFlash] ?? ''}`}
            />
          )}

          {/* ─── Mobile Controls ─── */}
          {/* Camera touch area (upper portion, mobile only) */}
          <div
            className="absolute top-0 left-0 right-0 bottom-[180px] z-[998] touch-none sm:hidden"
            onTouchStart={handleCameraTouchStart}
            onTouchMove={handleCameraTouchMove}
            onTouchEnd={handleCameraTouchEnd}
            onTouchCancel={handleCameraTouchEnd}
          />

          {/* Joystick (bottom left, mobile only) */}
          <div
            className="absolute bottom-20 left-5 w-[150px] h-[150px] z-[1000] sm:hidden"
            onTouchStart={handleJoystickStart}
            onTouchMove={handleJoystickMove}
            onTouchEnd={handleJoystickEnd}
            onTouchCancel={handleJoystickEnd}
          >
            <div className="w-full h-full bg-black/85 border-4 border-purple-500 rounded-full shadow-[0_0_20px_rgba(155,48,255,0.8)] relative">
              <div className="absolute w-16 h-16 bg-purple-500 border-2 border-fuchsia-500 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_20px_rgba(255,0,255,0.9)]" />
            </div>
          </div>

          {/* Action buttons (bottom right, mobile only) */}
          <div className="absolute bottom-20 right-5 flex flex-col gap-3 z-[1000] sm:hidden">
            <button
              className="w-16 h-16 rounded-full border-3 flex items-center justify-center text-xl font-bold text-white bg-gradient-to-br from-red-600 to-orange-500 border-yellow-400 shadow-[0_0_25px_rgba(255,0,0,0.6)] active:scale-90 touch-manipulation"
              onTouchStart={(e) => {
                e.preventDefault()
                engineRef.current?.performSmash()
              }}
            >
              SMH
            </button>
            <button
              className="w-16 h-16 rounded-full border-3 flex items-center justify-center text-xl font-bold text-white bg-gradient-to-br from-purple-600 to-purple-900 border-fuchsia-500 shadow-[0_0_25px_rgba(155,48,255,0.6)] active:scale-90 touch-manipulation"
              onTouchStart={(e) => {
                e.preventDefault()
                engineRef.current?.performGroundPound()
              }}
            >
              GP
            </button>
            <button
              className="w-16 h-16 rounded-full border-3 flex items-center justify-center text-xl font-bold text-white bg-gradient-to-br from-green-500 to-green-700 border-green-300 shadow-[0_0_25px_rgba(0,255,0,0.6)] active:scale-90 touch-manipulation"
              onTouchStart={(e) => {
                e.preventDefault()
                engineRef.current?.performTaunt()
              }}
            >
              TNT
            </button>
            <button
              className="w-16 h-16 rounded-full border-3 flex items-center justify-center text-xl font-bold text-white bg-gradient-to-br from-fuchsia-500 to-purple-600 border-fuchsia-400 shadow-[0_0_25px_rgba(255,0,255,0.6)] active:scale-90 touch-manipulation"
              onTouchStart={(e) => {
                e.preventDefault()
                engineRef.current?.setRageMode(true)
              }}
              onTouchEnd={(e) => {
                e.preventDefault()
                engineRef.current?.setRageMode(false)
              }}
              onTouchCancel={(e) => {
                e.preventDefault()
                engineRef.current?.setRageMode(false)
              }}
            >
              RGE
            </button>
          </div>
        </>
      )}

      {/* ─── Game Over Screen ─── */}
      {gameState === 'gameover' && (
        <GameOverScreen
          title="BULK SMASHED!"
          score={score}
          stats={{
            'Wave Reached': wave,
            'Enemies Defeated': totalKills,
            'Max Combo': maxCombo,
            'Buildings Destroyed': destroyedBuildings,
          }}
          onRestart={handleRestart}
          gameName="BULK RAMPAGE"
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
