import { useRef, useState, useEffect, useCallback } from 'react'
import { BackButton } from '../../components/layout/BackButton'
import { WalletButton } from '../../components/ui/WalletButton'
import { useNavigate } from 'react-router'
import { useScoreSubmission } from '../../hooks/useLeaderboard'
import { useWallet } from '@solana/wallet-adapter-react'
import {
  BulkagachiEngine,
  type BulkagachiCallbacks,
  type CollectionStats,
  type AchievementDef,
  type PoopData,
} from '../../engines/BulkagachiEngine'
import { syncBulkagachi } from '../../lib/achievements'

const GROWTH_STAGE_EMOJI: Record<string, string> = {
  BABY: '\u{1F37C}',
  ADULT: '\u{1F4AA}',
  ELDER: '\u{1F474}',
}

const MOOD_CONFIG: Record<string, { emoji: string; text: string }> = {
  happy: { emoji: '\u{1F60A}', text: 'HAPPY' },
  ok: { emoji: '\u{1F610}', text: 'OKAY' },
  sad: { emoji: '\u{1F622}', text: 'SAD' },
  miserable: { emoji: '\u{1F62D}', text: 'MISERABLE' },
}

export default function Bulkagachi() {
  const [gameState, setGameState] = useState<'title' | 'playing'>('title')

  const sceneRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<BulkagachiEngine | null>(null)

  const handleStart = useCallback(() => {
    setGameState('playing')
  }, [])

  const [hunger, setHunger] = useState(100)
  const [happiness, setHappiness] = useState(100)
  const [cleanliness, setCleanliness] = useState(100)
  const [energy, setEnergy] = useState(100)
  const [mood, setMood] = useState<'happy' | 'ok' | 'sad' | 'miserable'>('happy')
  const [isGhostMode, setIsGhostMode] = useState(false)
  const [isSleeping, setIsSleeping] = useState(false)
  const [isSick, setIsSick] = useState(false)
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const [xpNeeded, setXpNeeded] = useState(75)
  const [showLevelModal, setShowLevelModal] = useState(false)
  const [showMoodGuideModal, setShowMoodGuideModal] = useState(false)
  const [ageString, setAgeString] = useState('0h')
  const [growthStage, setGrowthStage] = useState('BABY')
  const [evolutionPending, setEvolutionPending] = useState<{from: string, to: string} | null>(null)
  const [showTeenChoice, setShowTeenChoice] = useState(false)
  const [poops, setPoops] = useState<PoopData[]>([])
  const [combo, setCombo] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [musicEnabled, setMusicEnabled] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  const [showAchievementsModal, setShowAchievementsModal] = useState(false)
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [showTravelModal, setShowTravelModal] = useState(false)
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [showAgeProgressModal, setShowAgeProgressModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showGhostModeIntro, setShowGhostModeIntro] = useState(false)

  // Food icon based on growth stage
  const feedIcon = (growthStage === 'EGG' || growthStage === 'BABY') 
    ? 'url(/images/gachi-s/food-milk.png)' 
    : 'url(/images/gachi-s/food-hotdog.png)'

  // Wallet & navigation
  const navigate = useNavigate()
  const { publicKey } = useWallet()
  const { submit, state: submitState, error: submitError } = useScoreSubmission()
  
  const [achievements, setAchievements] = useState<Record<string, boolean>>({})
  const [achievementsList, setAchievementsList] = useState<AchievementDef[]>([])
  const [collection, setCollection] = useState<CollectionStats>({
    totalPlays: 0,
    totalFeeds: 0,
    totalCleans: 0,
    goldenPoopsFound: 0,
    maxCombo: 0,
    achievementCount: 0,
  })
  const [achievementToast, setAchievementToast] = useState<string | null>(null)

  useEffect(() => {
    if (gameState !== 'playing' || !sceneRef.current) return

    const callbacks: BulkagachiCallbacks = {
      onStatsChange: (h, ha, c, e) => {
        setHunger(h)
        setHappiness(ha)
        setCleanliness(c)
        setEnergy(e)
      },
      onMoodChange: setMood,
      onSleepChange: setIsSleeping,
      onGhostModeChange: setIsGhostMode,
      onSicknessChange: setIsSick,
      onLevelChange: (l, x, xn) => {
        setLevel(l)
        setXp(x)
        setXpNeeded(xn)
      },
      onAgeChange: setAgeString,
      onGrowthStageChange: setGrowthStage,
      onEvolutionReady: (from, to) => {
        // Special case: evolving to TEEN requires choice
        if (to === 'TEEN') {
          setShowTeenChoice(true)
        } else {
          setEvolutionPending({ from, to })
        }
      },
      onPoopCountChange: (c) => {
        setPoops(engineRef.current?.getPoops() || [])
      },
      onComboChange: setCombo,
      onMessageChange: setMessage,
      onAchievementUnlocked: (id, title) => {
        setAchievements(engineRef.current?.getAchievements() || {})
        syncBulkagachi({ [id]: true })
        setAchievementToast(title)
        setTimeout(() => setAchievementToast(null), 3000)
      },
      onCollectionChange: setCollection,
      onMusicEnabledChange: setMusicEnabled,
      onNotificationsEnabledChange: setNotificationsEnabled,
      onDeath: (ageMinutes: number) => {
        // Auto-submit score when Bulk becomes a ghost
        if (publicKey) {
          submit('bulkagachi', ageMinutes)
        }
      },
      onAutoSubmit: (ageMinutes: number) => {
        // Auto-submit every hour
        if (publicKey) {
          submit('bulkagachi', ageMinutes)
        }
      },
    }

    const engine = new BulkagachiEngine(sceneRef.current, callbacks)
    engineRef.current = engine
    engine.init()
    setAchievementsList(engine.getAchievementsList())
    setAchievements(engine.getAchievements())
    syncBulkagachi(engine.getAchievements())
    setPoops(engine.getPoops())

    return () => {
      engine.dispose()
      engineRef.current = null
    }
  }, [gameState])

  // Show ghost mode intro only the FIRST time becoming a ghost (not on reload)
  useEffect(() => {
    if (isGhostMode) {
      const hasSeenGhostIntro = localStorage.getItem('bulkagachi_ghost_intro_seen')
      if (!hasSeenGhostIntro) {
        setShowGhostModeIntro(true)
        localStorage.setItem('bulkagachi_ghost_intro_seen', 'true')
      }
    }
  }, [isGhostMode])

  const handleFeed = useCallback(() => {
    // Waking up from sleep early makes him mad!
    if (isSleeping) {
      engineRef.current?.toggleSleep()
      return
    }
    engineRef.current?.feedBulk()
  }, [isSleeping])
  const handlePlay = useCallback(() => {
    // Waking up from sleep early makes him mad!
    if (isSleeping) {
      engineRef.current?.toggleSleep()
      return
    }
    engineRef.current?.playWithBulk()
  }, [isSleeping])
  const handleClean = useCallback(() => {
    // Waking up from sleep early makes him mad!
    if (isSleeping) {
      engineRef.current?.toggleSleep()
      return
    }
    engineRef.current?.cleanBulk()
  }, [isSleeping])
  const handleMedicine = useCallback(() => {
    // Waking up from sleep early makes him mad!
    if (isSleeping) {
      engineRef.current?.toggleSleep()
      return
    }
    engineRef.current?.giveMedicine()
  }, [isSleeping])
  const handleSchmeg = useCallback(() => {
    // Waking up from sleep early makes him mad!
    if (isSleeping) {
      engineRef.current?.toggleSleep()
      return
    }
    engineRef.current?.drinkSchmeg()
  }, [isSleeping])
  const handleRest = useCallback(() => {
    // Waking up from sleep early makes him mad!
    if (isSleeping) {
      engineRef.current?.toggleSleep()
      return
    }
    engineRef.current?.restBulk()
  }, [isSleeping])
  const handleSleep = useCallback(() => engineRef.current?.toggleSleep(), [])
  const handleRevive = useCallback(() => engineRef.current?.reviveBulk(), [])
const handleFullReset = useCallback(() => {
    engineRef.current?.fullReset()
    setShowMenuModal(false)
  }, [])
  
  const handleChooseTeenGood = useCallback(() => {
    engineRef.current?.chooseTeenType('good')
    setShowTeenChoice(false)
  }, [])
  
  const handleChooseTeenBad = useCallback(() => {
    engineRef.current?.chooseTeenType('bad')
    setShowTeenChoice(false)
  }, [])
  const handleToggleMusic = useCallback(() => engineRef.current?.toggleMusic(), [])
  const handleRename = useCallback(() => {
    const newName = window.prompt('Enter a nickname for your Bulk:', engineRef.current?.getBulkName() || 'Bulk')
    if (newName && newName.trim()) {
      engineRef.current?.setBulkName(newName.trim())
    }
  }, [])
  
  const handleSubmitScore = useCallback(() => {
    if (!publicKey) {
      alert('Connect wallet first!')
      return
    }
    if (isGhostMode) {
      alert('Ghosts cannot submit!')
      return
    }
    const rawAge = engineRef.current?.getAgeInHours() || 0
    const ageMinutes = Math.floor(rawAge * 60)
    const bulkName = engineRef.current?.getBulkName() || publicKey.toBase58().slice(0, 8)
    
    if (submitState === 'error') {
      alert(`❌ Previous submit failed: ${submitError || 'Unknown error'}`)
    } else if (submitState === 'submitted') {
      alert(`✅ Already submitted! Age: ${Math.floor(ageMinutes / 60)}h ${ageMinutes % 60}m`)
    } else {
      submit('bulkagachi', ageMinutes, { name: bulkName, stage: growthStage, level: level })
    }
  }, [submit, publicKey, isGhostMode, growthStage, submitState, submitError])
  
  const handleViewLeaderboard = useCallback(() => {
    navigate('/leaderboard')
  }, [navigate])
  const [currentBg, setCurrentBg] = useState('cabin')
  
  const handleSetBackground = useCallback((bg: string) => {
    engineRef.current?.setBackground(bg)
    setCurrentBg(bg)
  }, [])
  const handleRequestNotifications = useCallback(() => engineRef.current?.requestNotifications(), [])
  const handlePlayWithToy = useCallback(() => {
    // Waking up from sleep early makes him mad!
    if (isSleeping) {
      engineRef.current?.toggleSleep()
      return
    }
    engineRef.current?.playWithToy()
  }, [isSleeping])

  const handleShowAchievements = useCallback(() => {
    setAchievements(engineRef.current?.getAchievements() || {})
    setShowAchievementsModal(true)
  }, [])

  const handleShowCollection = useCallback(() => {
    setShowMenuModal(false)
    setShowCollectionModal(true)
  }, [])

  const handleEvolve = useCallback(() => {
    engineRef.current?.confirmEvolution()
    setEvolutionPending(null)
  }, [])

  const handleCancelEvolve = useCallback(() => {
    engineRef.current?.cancelEvolution()
    setEvolutionPending(null)
  }, [])

  // Title screen
  if (gameState === 'title') {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #1a0a2e 100%)' }}>
        <BackButton />
        
        <div className="flex flex-col items-center gap-6">
          <h1 
            className="text-4xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-gold-DEFAULT via-yellow-400 to-yellow-600"
            style={{ fontFamily: "'Press Start 2P', monospace" }}
          >
            BULKAGACHI
          </h1>
          <p className="text-white/70 text-sm" style={{ fontFamily: "'Press Start 2P', monospace" }}>
            Care for your Bulk!
          </p>
          
          <button
            type="button"
            onClick={handleStart}
            className="mt-4 px-10 py-4 bg-gradient-to-r from-gold-DEFAULT via-yellow-500 to-gold-dark border-4 border-purple-DEFAULT rounded-2xl text-black text-xl font-bold hover:scale-110 transition-all"
            style={{ fontFamily: "'Press Start 2P', monospace" }}
          >
            START GAME
          </button>
        </div>
        
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>
      </div>
    )
  }

  // Playing state
  return (
    <div className="fixed inset-0 flex items-start justify-center pt-2" style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #1a0a2e 100%)' }}>
      <div className="absolute top-4 left-4 z-50"><BackButton /></div>

      <div
        className="flex flex-col justify-between relative overflow-hidden"
        style={{
          width: 'min(90vw, 900px)',
          height: '100dvh',
          maxHeight: '100dvh',
          background: '#0d0d0d',
          border: '4px solid #9b30ff',
          borderRadius: '20px',
        }}
      >
        {/* Title Bar */}
        <div
          className="text-center text-white font-bold"
          style={{
            background: 'linear-gradient(135deg, #9b30ff, #ff00ff)',
            padding: '10px',
            fontSize: 'clamp(0.8rem, 4vw, 1.2rem)',
            borderBottom: '3px solid #ff00ff',
            fontFamily: "'Press Start 2P', monospace",
          }}
        >
          BULKAGACHI
        </div>

        {/* Game Canvas - centered, fixed height on mobile */}
        
        {/* Top Info Bar - shown on both mobile and desktop */}
        <div 
          className="flex justify-between items-center px-3 py-2 mx-2 rounded-lg mb-1"
          style={{ 
            background: 'linear-gradient(135deg, rgba(45,27,78,0.9), rgba(26,10,46,0.9))',
            border: '2px solid #9b30ff',
          }}
        >
          <div className="flex items-center gap-2 md:gap-3">
            <div 
              className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full text-2xl md:text-3xl"
              style={{ 
                background: 'linear-gradient(135deg, #ff6b6b, #ee5a5a)',
                border: '2px solid #fff',
                cursor: 'pointer'
              }}
              onClick={() => setShowMoodGuideModal(true)}
            >
              {mood === 'happy' ? '😊' : mood === 'sad' ? '😢' : mood === 'miserable' ? '😭' : '😐'}
            </div>
            <div className="flex gap-2 md:gap-4 items-center">
              <div 
                className="flex items-center justify-center px-2 py-1 md:px-4 md:py-1 rounded cursor-pointer hover:scale-105 transition-transform"
                style={{ 
                  background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
                  border: '2px solid #fff'
                }}
                onClick={() => setShowLevelModal(true)}
              >
                <span className="text-black font-bold text-[10px] md:text-xs" style={{ fontFamily: "'Press Start 2P', monospace" }}>LV{level}</span>
              </div>
              <div 
                className="flex items-center justify-center px-4 py-2 md:px-8 md:py-2 rounded cursor-pointer hover:scale-105 transition-transform"
                style={{ 
                  background: isGhostMode ? 'linear-gradient(135deg, #666666, #444444)' : isSick ? 'linear-gradient(135deg, #4a7c23, #2d5016)' : 'linear-gradient(135deg, #9b30ff, #6600cc)',
                  border: isGhostMode ? '2px solid #999' : isSick ? '2px solid #6b8e23' : '2px solid #ff00ff'
                }}
                onClick={() => setShowAgeProgressModal(true)}
              >
                <span className="text-white text-[8px] md:text-[9px]" style={{ fontFamily: "'Press Start 2P', monospace", whiteSpace: 'nowrap' }}>
                  {isGhostMode ? 'GHOST' : growthStage} {isSick && '🤢'}{isSick && ' '}{evolutionPending && '👑'}
                </span>
              </div>
              <div className="hidden md:block">
                <WalletButton />
              </div>
              <button
                onClick={() => setShowMenuModal(true)}
                className="flex items-center justify-center px-4 py-2 md:px-6 md:py-2 rounded"
                style={{ 
                  background: 'linear-gradient(135deg, #9b30ff, #6600cc)',
                  border: '2px solid #fff'
                }}
              >
                <span className="text-white text-[7px] md:text-xs" style={{ fontFamily: "'Press Start 2P', monospace" }}>☰ MENU</span>
              </button>
            </div>
          </div>
          {/* Mobile wallet - shown only on mobile */}
          <div className="md:hidden">
            <WalletButton />
          </div>
        </div>
        
        <div ref={sceneRef} className="flex-1" />

        {/* Stats HUD - Retro Handheld Style */}
        <div
          className="p-2 md:p-4 mt-auto"
          style={{
            background: 'linear-gradient(to top, rgba(26,10,46,0.98) 60%, rgba(26,10,46,0))',
          }}
        >
          {/* Stats Row - stacked on mobile, side by side on desktop */}
          <div className="flex flex-col justify-center gap-1 mb-4 px-2" style={{ maxWidth: '340px', margin: '0 auto', width: '100%' }}>
            {/* Hunger */}
            <div 
              className="flex items-center gap-2 px-2 py-2 rounded-lg mx-1"
              style={{ 
                background: 'linear-gradient(135deg, #2d1b4e, #1a0a2e)',
                border: '2px solid #9b30ff',
                boxShadow: '0 0 10px rgba(155,48,255,0.3)'
              }}
            >
              <span className="text-xl">🍼</span>
              <div className="flex flex-col flex-1">
                <div className="text-[8px] text-purple-300" style={{ fontFamily: "'Press Start 2P', monospace" }}>HUNGER {Math.round(hunger)}%</div>
                <div className="w-full h-3 bg-black/50 rounded overflow-hidden">
                  <div 
                    className="h-full transition-all"
                    style={{ 
                      width: `${hunger}%`,
                      background: hunger > 60 ? '#4ade80' : hunger > 30 ? '#fbbf24' : '#ef4444',
                      boxShadow: `0 0 6px ${hunger > 60 ? '#4ade80' : hunger > 30 ? '#fbbf24' : '#ef4444'}`
                    }}
                  />
                </div>
              </div>
            </div>
            
            {/* Happiness */}
            <div 
              className="flex items-center gap-2 px-2 py-2 rounded-lg mx-1"
              style={{ 
                background: 'linear-gradient(135deg, #2d1b4e, #1a0a2e)',
                border: '2px solid #ff00ff',
                boxShadow: '0 0 10px rgba(255,0,255,0.3)'
              }}
            >
              <span className="text-xl">💖</span>
              <div className="flex flex-col flex-1">
                <div className="text-[8px] text-pink-300" style={{ fontFamily: "'Press Start 2P', monospace" }}>HAPPY {Math.round(happiness)}%</div>
                <div className="w-full h-3 bg-black/50 rounded overflow-hidden">
                  <div 
                    className="h-full transition-all"
                    style={{ 
                      width: `${happiness}%`,
                      background: happiness > 60 ? '#4ade80' : happiness > 30 ? '#fbbf24' : '#ef4444',
                      boxShadow: `0 0 6px ${happiness > 60 ? '#4ade80' : happiness > 30 ? '#fbbf24' : '#ef4444'}`
                    }}
                  />
                </div>
              </div>
            </div>
            
            {/* Cleanliness */}
            <div 
              className="flex items-center gap-2 px-2 py-2 rounded-lg mx-1"
              style={{ 
                background: 'linear-gradient(135deg, #2d1b4e, #1a0a2e)',
                border: '2px solid #00ffff',
                boxShadow: '0 0 10px rgba(0,255,255,0.3)'
              }}
            >
              <span className="text-xl">✨</span>
              <div className="flex flex-col flex-1">
                <div className="text-[8px] text-cyan-300" style={{ fontFamily: "'Press Start 2P', monospace" }}>CLEAN {Math.round(cleanliness)}%</div>
                <div className="w-full h-3 bg-black/50 rounded overflow-hidden">
                  <div 
                    className="h-full transition-all"
                    style={{ 
                      width: `${cleanliness}%`,
                      background: cleanliness > 60 ? '#4ade80' : cleanliness > 30 ? '#fbbf24' : '#ef4444',
                      boxShadow: `0 0 6px ${cleanliness > 60 ? '#4ade80' : cleanliness > 30 ? '#fbbf24' : '#ef4444'}`
                    }}
                  />
                </div>
              </div>
            </div>
            
            {/* Energy */}
            <div 
              className="flex items-center gap-2 px-2 py-2 rounded-lg mx-1"
              style={{ 
                background: 'linear-gradient(135deg, #2d1b4e, #1a0a2e)',
                border: '2px solid #fbbf24',
                boxShadow: '0 0 10px rgba(251,191,36,0.3)'
              }}
            >
              <span className="text-xl">⚡</span>
              <div className="flex flex-col flex-1">
                <div className="text-[8px] text-yellow-300" style={{ fontFamily: "'Press Start 2P', monospace" }}>ENERGY {Math.round(energy)}%</div>
                <div className="w-full h-3 bg-black/50 rounded overflow-hidden">
                  <div 
                    className="h-full transition-all"
                    style={{ 
                      width: `${energy}%`,
                      background: energy > 60 ? '#4ade80' : energy > 30 ? '#fbbf24' : '#ef4444',
                      boxShadow: `0 0 6px ${energy > 60 ? '#4ade80' : energy > 30 ? '#fbbf24' : '#ef4444'}`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons - 2x3 grid on desktop */}
          <div className="grid grid-cols-4 gap-1 md:gap-3 md:px-4">
            <button 
              onClick={handleFeed} 
              className="flex flex-col items-center gap-1 transition-transform hover:scale-110 active:scale-95"
            >
              <div 
                className="w-10 md:w-14 h-10 md:h-14 rounded-full"
                style={{ 
                  backgroundColor: '#ff6b6b',
                  backgroundImage: feedIcon,
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  border: '3px solid #fff',
                  boxShadow: '0 4px 15px rgba(255,107,107,0.5)'
                }}
              />
              <span className="text-white text-[6px] md:text-[8px]" style={{ fontFamily: "'Press Start 2P', monospace" }}>FEED</span>
            </button>
            
            <button 
              onClick={handlePlay} 
              className="flex flex-col items-center gap-1 transition-transform hover:scale-110 active:scale-95"
            >
              <div 
                className="w-10 md:w-14 h-10 md:h-14 flex items-center justify-center rounded-full"
                style={{ 
                  background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
                  border: '3px solid #fff',
                  boxShadow: '0 4px 15px rgba(255,215,0,0.5)'
                }}
              >
                <span className="text-2xl">🎾</span>
              </div>
              <span className="text-white text-[6px] md:text-[8px]" style={{ fontFamily: "'Press Start 2P', monospace" }}>PLAY</span>
            </button>
            
            <button 
              onClick={handleClean} 
              className="flex flex-col items-center gap-1 transition-transform hover:scale-110 active:scale-95"
            >
              <div 
                className="w-10 md:w-14 h-10 md:h-14 flex items-center justify-center rounded-full"
                style={{ 
                  background: 'linear-gradient(135deg, #00ffff, #00cccc)',
                  border: '3px solid #fff',
                  boxShadow: '0 4px 15px rgba(0,255,255,0.5)'
                }}
              >
                <span className="text-2xl">🧼</span>
              </div>
              <span className="text-white text-[6px] md:text-[8px]" style={{ fontFamily: "'Press Start 2P', monospace" }}>CLEAN</span>
            </button>
            
            <button 
              onClick={handleSleep} 
              className="flex flex-col items-center gap-1 transition-transform hover:scale-110 active:scale-95"
            >
              <div 
                className="w-10 md:w-14 h-10 md:h-14 flex items-center justify-center rounded-full"
                style={{ 
                  background: isSleeping ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'linear-gradient(135deg, #1e1b4b, #312e81)',
                  border: '3px solid #818cf8',
                  boxShadow: '0 4px 15px rgba(129, 140, 248, 0.5)'
                }}
              >
                <span className="text-2xl">{isSleeping ? '😴' : '💤'}</span>
              </div>
              <span className="text-white text-[6px] md:text-[8px]" style={{ fontFamily: "'Press Start 2P', monospace" }}>{isSleeping ? 'WAKE' : 'SLEEP'}</span>
            </button>
            
            <button 
              onClick={handleMedicine} 
              className="flex flex-col items-center gap-1 transition-transform hover:scale-110 active:scale-95"
            >
              <div 
                className="w-10 md:w-14 h-10 md:h-14 rounded-full"
                style={{ 
                  backgroundColor: '#10b981',
                  backgroundImage: 'url(/images/gachi-s/schmeg-shot.png)',
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  border: '3px solid #34d399',
                  boxShadow: '0 4px 15px rgba(52, 211, 153, 0.5)'
                }}
              />
              <span className="text-white text-[6px] md:text-[8px]" style={{ fontFamily: "'Press Start 2P', monospace" }}>MEDS</span>
            </button>
            
            <button 
              onClick={handleSchmeg} 
              className="flex flex-col items-center gap-1 transition-transform hover:scale-110 active:scale-95"
            >
              <div 
                className="w-10 md:w-14 h-10 md:h-14 flex items-center justify-center rounded-full"
                style={{ 
                  backgroundColor: '#ec4899',
                  backgroundImage: 'url(/images/gachi-s/schmeg-can.png)',
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  border: '3px solid #f472b6',
                  boxShadow: '0 4px 15px rgba(244, 114, 182, 0.5)'
                }}
              />
              <span className="text-white text-[6px] md:text-[8px]" style={{ fontFamily: "'Press Start 2P', monospace" }}>SCHMEG</span>
            </button>
            
            <button 
              onClick={handleRest} 
              className="flex flex-col items-center gap-1 transition-transform hover:scale-110 active:scale-95"
            >
              <div 
                className="w-10 md:w-14 h-10 md:h-14 flex items-center justify-center rounded-full"
                style={{ 
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  border: '3px solid #818cf8',
                  boxShadow: '0 4px 15px rgba(129, 140, 248, 0.5)'
                }}
              >
                <span className="text-2xl">🪑</span>
              </div>
              <span className="text-white text-[6px] md:text-[8px]" style={{ fontFamily: "'Press Start 2P', monospace" }}>REST</span>
            </button>
            
            <button 
              onClick={() => setShowTravelModal(true)} 
              className="flex flex-col items-center gap-1 transition-transform hover:scale-110 active:scale-95"
            >
              <div 
                className="w-10 md:w-14 h-10 md:h-14 flex items-center justify-center rounded-full"
                style={{ 
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  border: '3px solid #fbbf24',
                  boxShadow: '0 4px 15px rgba(251, 191, 36, 0.5)'
                }}
              >
                <span className="text-2xl">🌍</span>
              </div>
              <span className="text-white text-[6px] md:text-[8px]" style={{ fontFamily: "'Press Start 2P', monospace" }}>TRAVEL</span>
            </button>
          </div>
        </div>

        {/* Message Toast */}
        {message && (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold animate-bounce"
            style={{ fontFamily: "'Press Start 2P', monospace" }}
          >
            {message}
          </div>
        )}

        {/* Achievement Toast */}
        {achievementToast && (
          <div
            className="absolute top-20 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gold-DEFAULT to-yellow-500 text-black px-4 py-2 rounded-lg font-bold"
            style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.8rem' }}
          >
            {'\u{1F3C6}'} {achievementToast}!
          </div>
        )}

        {/* Evolution Overlay */}
        {evolutionPending && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-6 z-50">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">✨</div>
              <h2 className="text-yellow-400 text-2xl mb-2" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                WHAT?
              </h2>
              <p className="text-white text-sm" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                {evolutionPending.from} is evolving!
              </p>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={handleEvolve}
                className="px-8 py-4 bg-gradient-to-r from-purple-DEFAULT to-pink-500 text-white rounded-lg font-bold animate-pulse"
                style={{ fontFamily: "'Press Start 2P', monospace" }}
              >
                ✨ EVOLVE! ✨
              </button>
              <button
                onClick={handleCancelEvolve}
                className="px-6 py-4 bg-gray-600 text-white rounded-lg font-bold"
                style={{ fontFamily: "'Press Start 2P', monospace" }}
              >
                ⏰ WAIT
              </button>
            </div>
          </div>
        )}

        {/* Teen Choice Overlay */}
        {showTeenChoice && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-6 z-50">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">🤔</div>
              <h2 className="text-yellow-400 text-2xl mb-2" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                CHOOSE YOUR PATH
              </h2>
              <p className="text-white text-sm mb-6" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                Your Bulk is growing up!
              </p>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={handleChooseTeenGood}
                className="px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-bold flex flex-col items-center gap-2"
                style={{ fontFamily: "'Press Start 2P', monospace" }}
              >
                <span className="text-4xl">😇</span>
                <span className="text-sm">GOOD BOY</span>
              </button>
              <button
                onClick={handleChooseTeenBad}
                className="px-6 py-4 bg-gradient-to-r from-red-500 to-red-700 text-white rounded-lg font-bold flex flex-col items-center gap-2"
                style={{ fontFamily: "'Press Start 2P', monospace" }}
              >
                <span className="text-4xl">😈</span>
                <span className="text-sm">BAD BOY</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Menu Modal */}
      {showMenuModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowMenuModal(false)}>
          <div
            className="bg-gradient-to-b from-purple-darkest to-purple-darker border-2 border-purple-DEFAULT rounded-2xl p-6"
            style={{ minWidth: '320px', maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-white text-center mb-4" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '1rem' }}>MENU</h3>
            
            <div className="flex flex-col gap-4">
              <button onClick={() => { setShowMenuModal(false); setShowHelpModal(true); }} className="bg-blue-600/50 hover:bg-blue-600 text-white py-6 px-6 rounded-xl" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.8rem' }}>
                {'\u{2753}'} HELP
              </button>
              <button onClick={handleShowCollection} className="bg-purple-DEFAULT/50 hover:bg-purple-DEFAULT text-white py-6 px-6 rounded-xl" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.8rem' }}>
                {'\u{1F4D6}'} COLLECTION
              </button>
              <button onClick={() => { setShowMenuModal(false); handleShowAchievements(); }} className="bg-yellow-600/50 hover:bg-yellow-500 text-white py-6 px-6 rounded-xl" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.8rem' }}>
                {'\u{1F3C6}'} ACHIEVEMENTS
              </button>
              <button onClick={handleToggleMusic} className="bg-purple-DEFAULT/50 hover:bg-purple-DEFAULT text-white py-6 px-6 rounded-xl" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.8rem' }}>
                {'\u{1F3B5}'} MUSIC: {musicEnabled ? 'ON' : 'OFF'}
              </button>
              <button onClick={handleRename} className="bg-blue-600/50 hover:bg-blue-500 text-white py-6 px-6 rounded-xl" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.8rem' }}>
                📛 RENAME
              </button>
              <button onClick={handleSubmitScore} disabled={submitState === 'submitting'} className="bg-orange-600/50 hover:bg-orange-500 disabled:bg-gray-600 text-white py-6 px-6 rounded-xl" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.8rem' }}>
                📤 SUBMIT AGE {submitState === 'submitting' ? '...' : submitState === 'error' ? ' ❌' : submitState === 'submitted' ? ' ✅' : ''}
              </button>
              <button onClick={handleViewLeaderboard} className="bg-yellow-600/50 hover:bg-yellow-500 text-white py-6 px-6 rounded-xl" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.8rem' }}>
                🏆 LEADERBOARD
              </button>
              <div className="bg-gray-800/50 text-white py-3 px-4 rounded-xl text-xs text-center" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                ⏱️ PLAYED: {(() => {
                  const ms = engineRef.current?.getTotalTimePlayed() || 0
                  const hours = Math.floor(ms / 3600000)
                  const mins = Math.floor((ms % 3600000) / 60000)
                  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
                })()}
              </div>
              <button onClick={handleRequestNotifications} className="bg-purple-DEFAULT/50 hover:bg-purple-DEFAULT text-white py-6 px-6 rounded-xl" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.8rem' }}>
                {'\u{1F514}'} NOTIFICATIONS: {notificationsEnabled ? 'ON' : 'OFF'}
              </button>
              {isGhostMode && (
                <button onClick={() => {
                  engineRef.current?.fullReset()
                  setShowMenuModal(false)
                }} className="bg-purple-600/50 hover:bg-purple-500 text-white py-6 px-6 rounded-xl" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.8rem' }}>
                  👻 NEW BULK
                </button>
              )}
              <button onClick={() => setShowMenuModal(false)} className="bg-gray-600 hover:bg-gray-500 text-white py-6 px-6 rounded-xl" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.8rem' }}>
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Travel Modal */}
      {showTravelModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowTravelModal(false)}>
          <div
            className="bg-gradient-to-b from-purple-darkest to-purple-darker border-2 border-yellow-500 rounded-2xl p-6"
            style={{ minWidth: '320px' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-yellow-400 text-center mb-4" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.9rem' }}>🌍 TRAVEL</h3>
            <p className="text-gray-300 text-center text-xs mb-4" style={{ fontFamily: "'Press Start 2P', monospace" }}>CHOOSE YOUR DESTINATION</p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => { handleSetBackground('cabin'); setShowTravelModal(false); }} 
                className={`p-4 rounded-xl border-2 transition-transform hover:scale-105 ${currentBg === 'cabin' ? 'border-green-500 bg-green-900/50' : 'border-gray-600 bg-gray-800/50'}`}
              >
                <div className="text-3xl text-center mb-1">🏠</div>
                <div className="text-white text-center text-xs" style={{ fontFamily: "'Press Start 2P', monospace" }}>HOME</div>
                <div className="text-gray-400 text-[8px] text-center mt-1">Always available</div>
              </button>
              
              <button 
                onClick={() => { handleSetBackground('camp'); setShowTravelModal(false); }} 
                className={`p-4 rounded-xl border-2 transition-transform hover:scale-105 ${currentBg === 'camp' ? 'border-green-500 bg-green-900/50' : 'border-gray-600 bg-gray-800/50'}`}
              >
                <div className="text-3xl text-center mb-1">⛺</div>
                <div className="text-white text-center text-xs" style={{ fontFamily: "'Press Start 2P', monospace" }}>CAMPING</div>
                <div className="text-gray-400 text-[8px] text-center mt-1">Day & Night</div>
              </button>
              
              <button 
                onClick={() => { handleSetBackground('city'); setShowTravelModal(false); }} 
                className={`p-4 rounded-xl border-2 transition-transform hover:scale-105 ${currentBg === 'city' ? 'border-green-500 bg-green-900/50' : 'border-gray-600 bg-gray-800/50'}`}
              >
                <div className="text-3xl text-center mb-1">🏙️</div>
                <div className="text-white text-center text-xs" style={{ fontFamily: "'Press Start 2P', monospace" }}>CITY</div>
                <div className="text-gray-400 text-[8px] text-center mt-1">Day & Night</div>
              </button>
              
              <button 
                onClick={() => { handleSetBackground('beach'); setShowTravelModal(false); }} 
                disabled={new Date().getHours() >= 18 || new Date().getHours() < 6}
                className={`p-4 rounded-xl border-2 transition-transform hover:scale-105 ${new Date().getHours() >= 18 || new Date().getHours() < 6 ? 'opacity-50 cursor-not-allowed border-gray-700 bg-gray-900/50' : currentBg === 'beach' ? 'border-green-500 bg-green-900/50' : 'border-gray-600 bg-gray-800/50'}`}
              >
                <div className="text-3xl text-center mb-1">🏖️</div>
                <div className="text-white text-center text-xs" style={{ fontFamily: "'Press Start 2P', monospace" }}>BEACH</div>
                <div className="text-gray-400 text-[8px] text-center mt-1">Day only (6am-6pm)</div>
              </button>
              
              <button 
                onClick={() => { handleSetBackground('mountain'); setShowTravelModal(false); }} 
                disabled={new Date().getHours() >= 18 || new Date().getHours() < 6}
                className={`p-4 rounded-xl border-2 transition-transform hover:scale-105 ${new Date().getHours() >= 18 || new Date().getHours() < 6 ? 'opacity-50 cursor-not-allowed border-gray-700 bg-gray-900/50' : currentBg === 'mountain' ? 'border-green-500 bg-green-900/50' : 'border-gray-600 bg-gray-800/50'}`}
              >
                <div className="text-3xl text-center mb-1">🏔️</div>
                <div className="text-white text-center text-xs" style={{ fontFamily: "'Press Start 2P', monospace" }}>MOUNTAIN</div>
                <div className="text-gray-400 text-[8px] text-center mt-1">Day only (6am-6pm)</div>
              </button>
              
              {growthStage !== 'EGG' && growthStage !== 'BABY' && (
                <button 
                  onClick={() => { handleSetBackground('club'); setShowTravelModal(false); }} 
                  disabled={new Date().getHours() >= 2 && new Date().getHours() < 18}
                  className={`p-4 rounded-xl border-2 transition-transform hover:scale-105 ${(new Date().getHours() >= 2 && new Date().getHours() < 18) ? 'opacity-50 cursor-not-allowed border-gray-700 bg-gray-900/50' : currentBg === 'club' ? 'border-green-500 bg-green-900/50' : 'border-gray-600 bg-gray-800/50'}`}
                >
                  <div className="text-3xl text-center mb-1">🪩</div>
                  <div className="text-white text-center text-xs" style={{ fontFamily: "'Press Start 2P', monospace" }}>CLUB</div>
                  <div className="text-gray-400 text-[8px] text-center mt-1">6pm-2am • Teen+</div>
                </button>
              )}
              
              <button onClick={() => setShowTravelModal(false)} className="bg-gray-600 hover:bg-gray-500 text-white py-3 px-4 rounded-lg mt-2" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.6rem' }}>
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Achievements Modal */}
      {showAchievementsModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowAchievementsModal(false)}>
          <div
            className="bg-gradient-to-b from-purple-darkest to-purple-darker border-2 border-purple-DEFAULT rounded-2xl p-6 max-h-[80vh] overflow-y-auto"
            style={{ minWidth: '300px' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-white text-center mb-4" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.9rem' }}>{'\u{1F3C6}'} ACHIEVEMENTS</h3>
            
            <div className="grid grid-cols-2 gap-2">
              {achievementsList.map(a => (
                <div
                  key={a.id}
                  className="flex flex-col items-center p-2 rounded"
                  style={{
                    background: achievements[a.id] ? 'rgba(255,215,0,0.2)' : 'rgba(155,48,255,0.2)',
                    border: `2px solid ${achievements[a.id] ? '#ffd700' : '#9b30ff'}`,
                  }}
                >
                  <div style={{ fontSize: '1.5rem' }}>{achievements[a.id] ? a.icon : '\u{1F512}'}</div>
                  <div className="text-white text-center" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.4rem' }}>{a.title}</div>
                </div>
              ))}
            </div>
            
            <button onClick={() => setShowAchievementsModal(false)} className="w-full mt-4 bg-gray-600 hover:bg-gray-500 text-white py-3 px-4 rounded-lg" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.6rem' }}>
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* Collection Modal */}
      {showCollectionModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowCollectionModal(false)}>
          <div
            className="bg-gradient-to-b from-purple-darkest to-purple-darker border-2 border-purple-DEFAULT rounded-2xl p-6"
            style={{ minWidth: '280px' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-white text-center mb-4" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.9rem' }}>{'\u{1F4D6}'} COLLECTION</h3>
            
            <div className="text-white space-y-2" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.5rem' }}>
              <div>{'\u{1F3AE}'} PLAYS: {collection.totalPlays}</div>
              <div>{'\u{1F37C}'} FEEDS: {collection.totalFeeds}</div>
              <div>{'\u{1F9FC}'} CLEANS: {collection.totalCleans}</div>
              <div>{'\u{2728}'} GOLDEN POOPS: {collection.goldenPoopsFound}</div>
              <div>{'\u{1F525}'} MAX COMBO: {collection.maxCombo}x</div>
              <div>{'\u{1F3C6}'} ACHIEVEMENTS: {collection.achievementCount}/{achievementsList.length}</div>
            </div>
            
            <button onClick={() => setShowCollectionModal(false)} className="w-full mt-4 bg-gray-600 hover:bg-gray-500 text-white py-3 px-4 rounded-lg" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.6rem' }}>
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* Level Modal */}
      {showLevelModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowLevelModal(false)}>
          <div
            className="bg-gradient-to-b from-yellow-900 to-orange-900 border-2 border-yellow-500 rounded-2xl p-6"
            style={{ minWidth: '340px', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-yellow-400 text-center mb-4" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.9rem' }}>⭐ LEVEL {level}</h3>
            
            <div className="space-y-4 text-xs" style={{ fontFamily: "'Press Start 2P', monospace" }}>
              
              <div className="bg-yellow-800/50 p-3 rounded-lg">
                <div className="text-yellow-300 mb-2">{'\u{1F3AF}'} CURRENT STATUS</div>
                <div className="text-white space-y-1 text-[10px]">
                  <div>XP: {xp} / {xpNeeded}</div>
                  <div className="w-full bg-gray-700 rounded-full h-3 mt-2">
                    <div 
                      className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (xp / xpNeeded) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-800/50 p-3 rounded-lg">
                <div className="text-yellow-300 mb-2">{'\u{26A1}'} HOW TO GAIN XP</div>
                <div className="text-gray-300 space-y-1 text-[10px] leading-relaxed">
                  <div>- <span className="text-green-400">FEED</span> Bulk: +10 XP</div>
                  <div>- <span className="text-pink-400">PLAY</span> with Bulk: +15 XP</div>
                  <div>- <span className="text-cyan-400">CLEAN</span> Bulk: +10 XP</div>
                  <div>- <span className="text-purple-400">PET</span> Bulk: +5 XP</div>
                  <div className="mt-2 text-gray-400">- City location: +50% XP bonus!</div>
                  <div className="mt-1 text-gray-400">- Combo multiplier: more XP per action!</div>
                </div>
              </div>
              
              <div className="bg-yellow-800/50 p-3 rounded-lg">
                <div className="text-yellow-300 mb-2">{'\u{1F4CA}'} LEVEL BENEFITS</div>
                <div className="text-gray-300 space-y-1 text-[10px] leading-relaxed">
                  <div>- Higher level = more XP needed</div>
                  <div>- Formula: 50 + (level × 25) XP per level</div>
                  <div>- Level 5: "Growing Up" achievement</div>
                  <div>- Level 10: "Teen Bulk" achievement</div>
                  <div>- Level 25: "Bulk Adult" achievement</div>
                  <div>- Level 50: "Legendary Bulk" achievement</div>
                </div>
              </div>
              
              <button onClick={() => setShowLevelModal(false)} className="w-full mt-4 bg-yellow-600 hover:bg-yellow-500 text-white py-3 px-4 rounded-lg" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.6rem' }}>
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Age Progress Modal */}
      {showAgeProgressModal && (() => {
        const ageHours = engineRef.current?.getAgeInHours() || 0
        const isGhost = isGhostMode
        const ghostAgeHours = engineRef.current?.getGhostAgeHours() || 0
        const timeAsGhostHours = engineRef.current?.getTimeAsGhostHours() || 0
        const stage = growthStage
        const babyToTeen = 8 // hours
        const teenToAdult = 22 // hours (14 hours after choosing teen)
        const adultToElder = 96 // 4 days
        
        let progress = 0
        let nextStage = ''
        let nextMilestone = 0
        
        if (isGhost) {
          // Ghost mode - show age at death
          progress = 100
          nextStage = 'GHOST'
          nextMilestone = 0
        } else if (stage === 'BABY' || stage === 'GOOD_BOY' || stage === 'BAD_BOY') {
          // Show progress to ADULT (if baby/teen)
          if (stage === 'BABY') {
            progress = (ageHours / babyToTeen) * 100
            nextStage = 'TEEN'
            nextMilestone = babyToTeen
          } else {
            progress = ((ageHours - babyToTeen) / (teenToAdult - babyToTeen)) * 100
            nextStage = 'ADULT'
            nextMilestone = teenToAdult
          }
        } else if (stage === 'EGG') {
          // Egg phase - show egg timer
          progress = 0
          nextStage = 'EGG'
          nextMilestone = 0
        } else if (stage === 'ADULT') {
          progress = ((ageHours - teenToAdult) / (adultToElder - teenToAdult)) * 100
          nextStage = 'ELDER'
          nextMilestone = adultToElder
        } else {
          progress = 100
          nextStage = 'MAX'
          nextMilestone = 0
        }
        
        // Clamp progress to valid range
        progress = Math.max(0, Math.min(100, progress))
        
        const hoursLeft = nextMilestone > 0 ? Math.max(0, nextMilestone - ageHours).toFixed(1) : '0'
        const isEvolutionReady = evolutionPending !== null
        
        return (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowAgeProgressModal(false)}>
            <div
              className={`border-2 rounded-2xl p-6 ${isGhost ? 'bg-gradient-to-b from-gray-800 to-gray-900 border-gray-500' : isEvolutionReady ? 'bg-gradient-to-b from-purple-darkest to-purple-darker' : 'bg-gradient-to-b from-purple-900/50 to-purple-950/50'}`}
              style={{ 
                minWidth: '320px',
                borderColor: isEvolutionReady ? '#fbbf24' : (isGhost ? '#6b7280' : '#9b30ff'),
                boxShadow: isEvolutionReady ? '0 0 20px #fbbf24, 0 0 40px #fbbf24' : 'none',
                animation: isEvolutionReady ? 'pulse 1s infinite' : 'none'
              }}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-white text-center mb-4" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.9rem' }}>{isGhost ? '👻' : '\u{1F451}'} {isGhost ? 'GHOST MODE' : 'AGE PROGRESS'}</h3>
              
              <div className="space-y-4 mb-6">
                {isGhost ? (
                  // Ghost mode display
                  <div className="text-center">
                    <div className="text-gray-400 text-xs mb-2" style={{ fontFamily: "'Press Start 2P', monospace" }}>BULK LIVED FOR</div>
                    <div className="text-white text-2xl mb-2" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                      {ghostAgeHours.toFixed(1)}h
                    </div>
                    <div className="text-gray-500 text-xs" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                      before becoming a ghost
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="text-gray-400 text-xs mb-2" style={{ fontFamily: "'Press Start 2P', monospace" }}>NOW A GHOST FOR</div>
                      <div className="text-purple-400 text-xl" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                        {timeAsGhostHours.toFixed(1)}h
                      </div>
                    </div>
                  </div>
                ) : (
                  // Normal display
                  <>
                  {isEvolutionReady && (
                    <div className="text-center bg-yellow-600/20 border border-yellow-500 rounded-lg py-2 animate-pulse">
                      <div className="text-yellow-400 text-xs" style={{ fontFamily: "'Press Start 2P', monospace" }}>✨ {evolutionPending?.to} READY! ✨</div>
                    </div>
                  )}
                  
                  {!isEvolutionReady && (
                    <button 
                      onClick={() => engineRef.current?.tryEvolve()} 
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg text-xs"
                      style={{ fontFamily: "'Press Start 2P', monospace" }}
                    >
                      CHECK EVOLUTION
                    </button>
                  )}
                  
                  <div className="text-center">
                    <div className="text-purple-300 text-xs mb-1" style={{ fontFamily: "'Press Start 2P', monospace" }}>CURRENT STAGE</div>
                    <div className="text-white text-xl" style={{ fontFamily: "'Press Start 2P', monospace", color: stage === 'BABY' ? '#60a5fa' : stage === 'GOOD_BOY' || stage === 'BAD_BOY' ? '#a78bfa' : stage === 'ADULT' ? '#f472b6' : '#fbbf24' }}>{stage}</div>
                    <div className="text-gray-400 text-xs mt-1" style={{ fontFamily: "'Press Start 2P', monospace" }}>{engineRef.current?.getBulkName() || 'Bulk'}</div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-purple-300" style={{ fontFamily: "'Press Start 2P', monospace" }}>PROGRESS</span>
                      <span className="text-white" style={{ fontFamily: "'Press Start 2P', monospace" }}>{Math.min(100, progress).toFixed(0)}%</span>
                    </div>
                    <div className="h-4 bg-purple-900 rounded-full overflow-hidden border border-purple-600">
                      <div 
                        className="h-full transition-all duration-500"
                        style={{ 
                          width: `${Math.min(100, progress)}%`,
                          background: stage === 'EGG' ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' : stage === 'BABY' ? 'linear-gradient(90deg, #60a5fa, #a78bfa)' : stage === 'GOOD_BOY' || stage === 'BAD_BOY' ? 'linear-gradient(90deg, #a78bfa, #f472b6)' : stage === 'ADULT' ? 'linear-gradient(90deg, #f472b6, #fbbf24)' : 'linear-gradient(90deg, #fbbf24, #ffd700)'
                        }}
                      />
                    </div>
                  </div>
                  
                  {nextStage === 'EGG' && (
                    <div className="text-center">
                      <div className="text-yellow-300 text-xs mb-1" style={{ fontFamily: "'Press Start 2P', monospace" }}>STILL AN EGG</div>
                      <div className="text-white text-lg" style={{ fontFamily: "'Press Start 2P', monospace", color: '#fbbf24' }}>🥚</div>
                      <div className="text-gray-400 text-xs mt-1" style={{ fontFamily: "'Press Start 2P', monospace" }}>Pet to hatch!</div>
                    </div>
                  )}
                  
                  {nextStage !== 'EGG' && nextStage !== 'MAX' && (
                    <div className="text-center">
                      <div className="text-purple-300 text-xs mb-1" style={{ fontFamily: "'Press Start 2P', monospace" }}>NEXT STAGE</div>
                      <div className="text-white text-lg" style={{ fontFamily: "'Press Start 2P', monospace", color: '#a78bfa' }}>{nextStage}</div>
                      <div className="text-gray-400 text-xs mt-1" style={{ fontFamily: "'Press Start 2P', monospace" }}>{hoursLeft}h remaining</div>
                    </div>
                  )}
                  
                  {nextStage === 'MAX' && (
                    <div className="text-center">
                      <div className="text-yellow-400 text-lg" style={{ fontFamily: "'Press Start 2P', monospace" }}>{'\u{1F451}'} MAX LEVEL!</div>
                    </div>
                  )}
                  
                  <div className="text-center pt-2 border-t border-purple-800">
                    <div className="text-gray-400 text-[10px]" style={{ fontFamily: "'Press Start 2P', monospace" }}>AGE: {ageString}</div>
                  </div>
                  </>
                )}
              </div>
              
              <button onClick={() => setShowAgeProgressModal(false)} className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 px-4 rounded-lg" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.6rem' }}>
                CLOSE
              </button>
            </div>
          </div>
        )
      })()}

      {/* Help Modal */}

      {/* Mood Guide Modal */}
      {showMoodGuideModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowMoodGuideModal(false)}>
          <div className="bg-gradient-to-b from-orange-900 to-orange-950 border-2 border-orange-400 rounded-2xl p-4" style={{ minWidth: '340px' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-orange-400 text-center mb-4" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.8rem' }}>😀 MOOD GUIDE</h3>
            <div className="space-y-2 text-xs">
              <div className="bg-green-900/50 p-3 rounded"><span className="text-green-400 font-bold text-sm">😊 HAPPY</span> - All stats above 70%</div>
              <div className="bg-yellow-900/50 p-3 rounded"><span className="text-yellow-400 font-bold text-sm">😐 OKAY</span> - Stats between 50-70%</div>
              <div className="bg-orange-900/50 p-3 rounded"><span className="text-orange-400 font-bold text-sm">😢 SAD</span> - Any stat below 50%</div>
              <div className="bg-red-900/50 p-3 rounded"><span className="text-red-400 font-bold text-sm">😭 MISERABLE</span> - Average below 40%</div>
              <div className="bg-purple-900/50 p-3 rounded"><span className="text-purple-400 font-bold text-sm">😴 TIRED</span> - Energy below 20%</div>
              <div className="bg-gray-800/50 p-3 rounded"><span className="text-gray-400 font-bold text-sm">🤒 SICK</span> - Needs medicine</div>
            </div>
            <button onClick={() => setShowMoodGuideModal(false)} className="w-full mt-4 bg-orange-600 text-white py-2 rounded" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.7rem' }}>CLOSE</button>
          </div>
        </div>
      )}

      {showHelpModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowHelpModal(false)}>
          <div
            className="bg-gradient-to-b from-blue-900 to-blue-950 border-2 border-blue-400 rounded-2xl p-4"
            style={{ minWidth: '340px', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-white text-center mb-4" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.8rem' }}>{'\u{2753}'} HOW TO PLAY</h3>
            
            <div className="space-y-4 text-xs" style={{ fontFamily: "'Press Start 2P', monospace" }}>
              
              <div className="bg-blue-800/50 p-3 rounded-lg">
                <div className="text-blue-300 mb-2">{'\u{1F4CB}'} BUTTONS</div>
                <div className="text-gray-300 space-y-1 text-[10px] leading-relaxed">
                  <div><span className="text-pink-400">PET</span> - Tap Bulk to pet (+10 happiness)</div>
                  <div><span className="text-yellow-400">FEED</span> - Give food (+30 hunger)</div>
                  <div><span className="text-green-400">CLEAN</span> - Remove all poop (+40 clean)</div>
                  <div><span className="text-pink-400">PLAY</span> - Toy game (+happiness, -8 energy)</div>
                  <div><span className="text-purple-400">SCHMEG</span> - Energy drink (+30 energy, 5min cooldown)</div>
                  <div><span className="text-indigo-400">REST</span> - Quick rest (+10 energy, 30s cooldown)</div>
                  <div><span className="text-blue-400">SLEEP</span> - Toggle sleep mode (regen energy)</div>
                  <div><span className="text-red-400">MEDICINE</span> - Cure sickness (if sick)</div>
                </div>
              </div>

              <div className="bg-yellow-800/50 p-3 rounded-lg">
                <div className="text-yellow-300 mb-2">🥚 THE EGG</div>
                <div className="text-gray-300 space-y-1 text-[10px] leading-relaxed">
                  <div>New games start as an egg!</div>
                  <div><span className="text-pink-400">PET</span> - Tap egg to reduce hatch time</div>
                  <div>Each pet reduces timer by 1 second!</div>
                  <div>Hatches in ~60 minutes without pets</div>
                  <div>10 rapid pets = roll animation!</div>
                </div>
              </div>
              
              <div className="bg-blue-800/50 p-3 rounded-lg">
                <div className="text-blue-300 mb-2">{'\u{1F4CA}'} STAT DECAY</div>
                <div className="text-gray-300 space-y-1 text-[10px] leading-relaxed">
                  <div><span className="text-red-400">HUNGER</span> - Empty in ~15 hours</div>
                  <div><span className="text-yellow-400">HAPPINESS</span> - Empty in ~14 hours</div>
                  <div><span className="text-cyan-400">CLEANLINESS</span> - Empty in ~36 hours</div>
                  <div><span className="text-green-400">ENERGY</span> - Empty in ~16 hours</div>
                  <div className="text-gray-500 mt-1">Night time (6pm-6am) slows decay!</div>
                </div>
              </div>
              
              <div className="bg-blue-800/50 p-3 rounded-lg">
                <div className="text-blue-300 mb-2">{'\u{1F451}'} GROWTH STAGES</div>
                <div className="text-gray-300 space-y-1 text-[10px] leading-relaxed">
                  <div><span className="text-blue-400">BABY</span> - 0-8 hours</div>
                  <div><span className="text-purple-400">GOOD BOY / BAD BOY</span> - 8-22 hours (choose your path!)</div>
                  <div><span className="text-pink-400">ADULT</span> - 22-96 hours (4 days)</div>
                  <div><span className="text-yellow-400">ELDER</span> - 96+ hours (lives forever!)</div>
                  <div className="text-gray-500 mt-1">Press EVOLVE button to evolve!</div>
                </div>
              </div>
              
              <div className="bg-purple-800/50 p-3 rounded-lg">
                <div className="text-purple-300 mb-2">{'\u{1F451}'} TEEN PATH</div>
                <div className="text-gray-300 space-y-1 text-[10px] leading-relaxed">
                  <div>At 8 hours, your Bulk becomes a TEEN!</div>
                  <div className="mt-2">Path is randomly assigned at birth:</div>
                  <div><span className="text-green-400">😇 GOOD BOY</span> - Well behaved, earns bonus happiness</div>
                  <div><span className="text-red-400">😈 BAD BOY</span> - Rebellious, earns bonus XP</div>
                  <div className="text-gray-500 mt-1">Fate decides your Bulk's personality!</div>
                </div>
              </div>
              
              <div className="bg-blue-800/50 p-3 rounded-lg">
                <div className="text-blue-300 mb-2">{'\u{1F30D}'} LOCATIONS</div>
                <div className="text-gray-300 space-y-1 text-[10px] leading-relaxed">
                  <div><span className="text-yellow-600">CABIN</span> - Home base (no weather)</div>
                  <div><span className="text-green-400">CAMP</span> - Peaceful, more sickness risk</div>
                  <div><span className="text-gray-400">CITY</span> - Fun! +50% XP, drains energy fast</div>
                  <div><span className="text-cyan-400">BEACH</span> - Relaxing, slower energy drain</div>
                  <div><span className="text-blue-400">MOUNTAIN</span> - Most peaceful, slow decay</div>
                  <div><span className="text-pink-400">🪩 CLUB</span> - Opens 6pm-2am, Teen+ only!</div>
                  <div className="text-gray-500 mt-1">Travel to unlock achievements!</div>
                </div>
              </div>
              
              <div className="bg-blue-800/50 p-3 rounded-lg">
                <div className="text-blue-300 mb-2">{'\u{26A1}'} WEATHER EFFECTS</div>
                <div className="text-gray-300 space-y-1 text-[10px] leading-relaxed">
                  <div><span className="text-yellow-400">SUNNY</span> - +3 happiness</div>
                  <div><span className="text-blue-400">RAIN</span> - -5 happiness</div>
                  <div><span className="text-purple-400">STORM</span> - -5 happiness</div>
                  <div><span className="text-white">SNOW</span> - -3 happiness</div>
                </div>
              </div>
              
              <div className="bg-yellow-800/50 p-3 rounded-lg">
                <div className="text-yellow-300 mb-2">{'\u{2728}'} COMBO SYSTEM</div>
                <div className="text-gray-300 space-y-1 text-[10px] leading-relaxed">
                  <div>Quick actions build combo!</div>
                  <div>- Each pet/feed/clean = +1 combo</div>
                  <div>- Combo gives bonus XP</div>
                  <div>- Combo resets after 5 seconds</div>
                  <div>- Higher combo = more XP!</div>
                </div>
              </div>
              
              <div className="bg-blue-800/50 p-3 rounded-lg">
                <div className="text-blue-300 mb-2">{'\u{1F3AF}'} TIPS & TRICKS</div>
                <div className="text-gray-300 space-y-1 text-[10px] leading-relaxed">
                  <div>- Keep stats above 50 for best mood</div>
                  <div>- Low stats = sad Bulk!</div>
                  <div>- Poop makes happiness decay faster</div>
                  <div>- 5+ poops = Bulk refuses actions</div>
                  <div>- Camp has 2x sickness chance (bugs)</div>
                  <div>- City gives +50% XP but drains fast</div>
                  <div>- Sleep at night for 3x energy regen</div>
                  <div>- Use schmeg for quick energy boost</div>
                  <div>- Rebirth keeps level & achievements!</div>
                </div>
              </div>
              
              <div className="bg-red-800/50 p-3 rounded-lg">
                <div className="text-red-300 mb-2">{'\u{26A0}'} DANGERS</div>
                <div className="text-gray-300 space-y-1 text-[10px] leading-relaxed">
                  <div>- Hunger at 0 = death (becomes ghost!)</div>
                  <div>- 5+ poops = Bulk refuses actions</div>
                  <div>- Low happiness = sad sprite</div>
                  <div>- Low cleanliness = Bulk gets sick</div>
                  <div>- No energy = can't play</div>
                  <div>- Being sick stops growth!</div>
                </div>
              </div>
              
              {isGhostMode && (
              <div className="bg-purple-800/50 p-3 rounded-lg">
                <div className="text-purple-300 mb-2">{'\u{1F480}'} GHOST MODE</div>
                <div className="text-gray-300 space-y-1 text-[10px] leading-relaxed">
                  <div>You are now a ghost! Here's how it works:</div>
                  <div>- No hunger needed (stays full)</div>
                  <div>- Cleanliness doesn't decay</div>
                  <div>- Lives in the cemetery (tomb)</div>
                  <div>- Only visits City/Camp at night</div>
                  <div>- Naps automatically 11am-2pm</div>
                  <div>- Auto-sleeps when energy = 0</div>
                  <div>- Wake at 25% energy to interact</div>
                  <div>- Happiness still decays!</div>
                  <div>- Tap "NEW BULK" to start fresh</div>
                  <div>- Or use REVIVE to bring back to life</div>
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <button onClick={() => { engineRef.current?.fullReset(); setShowHelpModal(false); }} className="text-red-400 hover:text-red-300 text-xs" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                      🔄 RESET ALL
                    </button>
                  </div>
                </div>
              </div>
              )}
              
            </div>
            
            <button onClick={() => setShowHelpModal(false)} className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white py-4 px-6 rounded-lg text-lg" style={{ fontFamily: "'Press Start 2P', monospace" }}>
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* Ghost Mode Intro Modal */}
      {showGhostModeIntro && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div
            className="bg-gradient-to-b from-gray-800 to-gray-900 border-2 border-gray-600 rounded-2xl p-6 text-center"
            style={{ minWidth: '320px', maxWidth: '90vw' }}
          >
            <div className="text-6xl mb-4">👻</div>
            <h3 className="text-white mb-4" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '1rem' }}>SORRY, YOUR BULK HAS DIED</h3>
            
            <div className="text-gray-300 text-xs mb-6 space-y-2 text-left" style={{ fontFamily: "'Press Start 2P', monospace" }}>
              <p>Your Bulk has passed on to the afterlife...</p>
              <p className="mt-4">In <span className="text-purple-400">Ghost Mode</span>:</p>
              <ul className="text-gray-400 text-[10px] space-y-1 ml-2">
                <li>• Bulk becomes a ghost 👻</li>
                <li>• Lives in the cemetery ⚰️</li>
                <li>• No hunger needed (stays full)</li>
                <li>• Can visit City or Camp at night</li>
                <li>• Feels spooky and nostalgic...</li>
              </ul>
            </div>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  setShowGhostModeIntro(false)
                  engineRef.current?.fullReset()
                  setIsGhostMode(false)
                  setGrowthStage('BABY')
                }} 
                className="bg-red-600 hover:bg-red-500 text-white py-3 px-4 rounded-lg"
                style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.6rem' }}
              >
                🔄 START FRESH (RESET)
              </button>
              <button 
                onClick={() => setShowGhostModeIntro(false)} 
                className="bg-purple-600 hover:bg-purple-500 text-white py-3 px-4 rounded-lg"
                style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.6rem' }}
              >
                👻 EXPLORE GHOST MODE
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>
    </div>
  )
}
