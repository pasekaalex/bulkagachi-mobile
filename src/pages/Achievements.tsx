import { useState, useEffect } from 'react'
import { BackButton } from '../components/layout/BackButton'
import { ALL_ACHIEVEMENTS, getUnlocked, syncBulkagachi } from '../lib/achievements'

const GAME_EMOJIS: Record<string, string> = {
  'Bulk Runner': '🏃',
  'Super Bulk Bros': '🎮',
  'Flappy Bulk': '🐦',
  'Bulk Rampage': '👹',
  'Bulk Climb': '🧗',
   // 'Bulk Breaker': '🧱',
  'Bulkagachi': '🥚',
}

const GAME_COLORS: Record<string, string> = {
  'Bulk Runner': 'from-orange-500/20 to-red-500/20 border-orange-400/30',
  'Super Bulk Bros': 'from-yellow-500/20 to-amber-500/20 border-yellow-400/30',
  'Flappy Bulk': 'from-cyan-500/20 to-blue-500/20 border-cyan-400/30',
  'Bulk Rampage': 'from-red-600/20 to-rose-500/20 border-red-500/30',
  'Bulk Climb': 'from-emerald-500/20 to-green-500/20 border-emerald-400/30',
   // 'Bulk Breaker': 'from-pink-500/20 to-rose-400/20 border-pink-400/30',
  'Bulkagachi': 'from-purple-500/20 to-violet-500/20 border-purple-400/30',
}

const RARITY_COLORS: Record<number, { bg: string; border: string; glow: string; text: string }> = {
  0: { // Common
    bg: 'from-slate-500/10 to-slate-600/5',
    border: 'border-slate-500/20',
    glow: 'shadow-[0_0_15px_rgba(100,116,139,0.15)]',
    text: 'text-slate-400',
  },
  1: { // Uncommon
    bg: 'from-emerald-500/10 to-emerald-600/5',
    border: 'border-emerald-500/25',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    text: 'text-emerald-400',
  },
  2: { // Rare
    bg: 'from-blue-500/10 to-blue-600/5',
    border: 'border-blue-500/25',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.2)]',
    text: 'text-blue-400',
  },
  3: { // Epic
    bg: 'from-purple-500/10 to-purple-600/5',
    border: 'border-purple-500/30',
    glow: 'shadow-[0_0_25px_rgba(168,85,247,0.25)]',
    text: 'text-purple-400',
  },
  4: { // Legendary
    bg: 'from-yellow-500/15 to-amber-600/10',
    border: 'border-yellow-400/40',
    glow: 'shadow-[0_0_30px_rgba(251,191,36,0.3)]',
    text: 'text-yellow-400',
  },
}

// Determine rarity based on achievement description/difficulty
function getRarity(achievement: typeof ALL_ACHIEVEMENTS[0]): number {
  const desc = achievement.desc.toLowerCase()
  const title = achievement.title.toLowerCase()
  
  // Legendary achievements
  if (desc.includes('50') || desc.includes('1000') || desc.includes('25 times') || title.includes('god') || title.includes('maniac')) return 4
  // Epic achievements
  if (desc.includes('25') || desc.includes('500') || desc.includes('10 times') || desc.includes('wave 5') || desc.includes('20x')) return 3
  // Rare achievements
  if (desc.includes('2000') || desc.includes('wave 3') || desc.includes('5 times') || desc.includes('50 enemies')) return 2
  // Uncommon achievements
  if (desc.includes('100') || desc.includes('10') || desc.includes('5') || desc.includes('rampage')) return 1
  // Common
  return 0
}

export default function Achievements() {
  const [unlocked, setUnlocked] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // Sync Bulkagachi achievements from engine's localStorage
    try {
      const raw = localStorage.getItem('bulkagachi')
      if (raw) {
        const state = JSON.parse(raw)
        if (state.achievements) {
          syncBulkagachi(state.achievements)
        }
      }
    } catch { /* ignore */ }

    setUnlocked(getUnlocked())
  }, [])

  const unlockedCount = ALL_ACHIEVEMENTS.filter((a) => unlocked[a.id]).length
  const totalCount = ALL_ACHIEVEMENTS.length
  const progressPercent = Math.round((unlockedCount / totalCount) * 100)

  // Group by game
  const games = ['Bulk Runner', 'Super Bulk Bros', 'Flappy Bulk', 'Bulk Climb', 'Streets of Schmeg']
  const grouped = games.map((game) => ({
    game,
    achievements: ALL_ACHIEVEMENTS.filter((a) => a.game === game),
  }))

  // Calculate per-game progress
  const getGameProgress = (game: string) => {
    const gameAchievements = ALL_ACHIEVEMENTS.filter((a) => a.game === game)
    const gameUnlocked = gameAchievements.filter((a) => unlocked[a.id]).length
    return { total: gameAchievements.length, unlocked: gameUnlocked }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-[#0a0a12] via-[#1a1025] to-[#0d0d18] p-4 sm:p-6 lg:p-8">
      <BackButton />

      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-32 right-20 w-80 h-80 bg-gold-DEFAULT/5 rounded-full blur-3xl" />
        <div className="absolute bottom-32 left-20 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-900/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-3xl">
        {/* Main card */}
        <div className="bg-[#11111a]/80 backdrop-blur-2xl rounded-3xl border border-white/[0.08] shadow-[0_0_80px_rgba(0,0,0,0.6),0_0_30px_rgba(155,77,202,0.15)] overflow-hidden">
          
          {/* Header section */}
          <div className="relative px-6 sm:px-10 pt-10 pb-8 border-b border-white/[0.06]">
            {/* Glow effect behind title */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-gradient-to-b from-gold-DEFAULT/10 to-transparent rounded-full blur-3xl" />
            
            <h1 className="relative text-4xl sm:text-5xl font-bold text-center mb-2">
              <span className="bg-gradient-to-r from-gold-DEFAULT via-yellow-300 to-gold-DEFAULT bg-clip-text text-transparent font-[family-name:var(--font-display)] tracking-tight drop-shadow-[0_0_30px_rgba(255,215,0,0.3)]">
                ACHIEVEMENTS
              </span>
            </h1>
            <p className="text-center text-white/30 text-sm tracking-wider font-medium">
              Unlock them all to become the ultimate Bulk master
            </p>
          </div>

          <div className="px-4 sm:px-8 py-8 max-h-[75dvh] overflow-y-auto custom-scrollbar">
            
            {/* Progress bar - Enhanced */}
            <div className="mb-12 bg-[#0a0a12]/60 p-6 rounded-2xl border border-white/[0.06] shadow-inner">
              <div className="flex justify-between items-end mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-DEFAULT/20 to-gold-dark/20 border border-gold-DEFAULT/30 flex items-center justify-center text-xl">
                    🏆
                  </div>
                  <div>
                    <div className="text-[11px] text-white/30 font-bold tracking-[0.2em] uppercase">
                      Total Progress
                    </div>
                    <div className="text-xs text-white/50">
                      {unlockedCount} of {totalCount} unlocked
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gold-DEFAULT tracking-tight">
                    {progressPercent}%
                  </div>
                </div>
              </div>
              <div className="w-full h-4 bg-black/40 border border-white/[0.08] rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-gold-DEFAULT via-yellow-300 to-gold-dark rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(255,215,0,0.5)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              
              {/* Milestone markers */}
              <div className="flex justify-between mt-3 px-1">
                {[25, 50, 75, 100].map((milestone) => (
                  <div 
                    key={milestone} 
                    className={`flex flex-col items-center gap-1 ${progressPercent >= milestone ? 'opacity-100' : 'opacity-30'}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${progressPercent >= milestone ? 'bg-gold-DEFAULT shadow-[0_0_8px_rgba(255,215,0,0.8)]' : 'bg-white/20'}`} />
                    <span className="text-[9px] font-bold text-white/40">{milestone}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievement groups */}
            {grouped.map(({ game, achievements }) => {
              const progress = getGameProgress(game)
              const gameEmoji = GAME_EMOJIS[game] || '🎮'
              const gameColor = GAME_COLORS[game] || 'from-purple-500/20 to-purple-600/20 border-purple-400/30'
              
              return (
                <div key={game} className="mb-12">
                  {/* Section header */}
                  <div className="flex items-center gap-4 mb-5">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gameColor} border flex items-center justify-center text-xl shadow-lg`}>
                      {gameEmoji}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h2 className="text-sm font-bold text-white/80 tracking-[0.15em] font-[family-name:var(--font-display)] uppercase">
                          {game}
                        </h2>
                        <span className="text-xs font-bold text-white/30">
                          {progress.unlocked}/{progress.total}
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-gold-DEFAULT/60 to-gold-DEFAULT rounded-full transition-all duration-500"
                          style={{ width: `${(progress.unlocked / progress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className={`w-[1px] h-8 bg-gradient-to-b ${gameColor.split(' ')[0].replace('from-', 'from-').replace('/20', '/30')} to-transparent`} />
                  </div>

                  {/* Achievement cards grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {achievements.map((a) => {
                      const isUnlocked = !!unlocked[a.id]
                      const rarity = getRarity(a)
                      const rarityStyle = RARITY_COLORS[rarity]
                      
                      return (
                        <div
                          key={a.id}
                          className={`
                            group relative flex items-center gap-4 p-5 rounded-2xl border transition-all duration-300 overflow-hidden
                            ${isUnlocked 
                              ? `bg-gradient-to-br ${rarityStyle.bg} ${rarityStyle.border} ${rarityStyle.glow} border` 
                              : 'bg-white/[0.02] border-white/[0.05] opacity-50 grayscale'
                            }
                            ${!isUnlocked && 'hover:opacity-70 hover:grayscale-[0.5]'}
                          `}
                        >
                          {/* Shine effect for unlocked */}
                          {isUnlocked && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                          )}
                          
                          {/* Icon */}
                          <div className={`
                            relative w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0
                            ${isUnlocked 
                              ? 'bg-gradient-to-br from-gold-DEFAULT/30 to-gold-dark/30 border border-gold-DEFAULT/40 shadow-[0_0_15px_rgba(255,215,0,0.2)]' 
                              : 'bg-black/30 border border-white/[0.08]'
                            }
                          `}>
                            {isUnlocked ? a.icon : '🔒'}
                            
                            {/* Unlocked checkmark */}
                            {isUnlocked && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#11111a] flex items-center justify-center text-[10px]">
                                ✓
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-bold font-[family-name:var(--font-display)] tracking-tight mb-1 ${
                              isUnlocked ? rarityStyle.text : 'text-white/50'
                            }`}>
                              {a.title}
                            </div>
                            <div className={`text-[11px] leading-relaxed line-clamp-2 ${
                              isUnlocked ? 'text-white/50' : 'text-white/30 italic'
                            }`}>
                              {a.desc}
                            </div>
                          </div>

                          {/* Rarity indicator */}
                          {isUnlocked && (
                            <div className="hidden sm:flex flex-col items-end gap-1">
                              <div className={`
                                w-2 h-2 rounded-full 
                                ${rarity === 4 ? 'bg-yellow-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 
                                  rarity === 3 ? 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]' :
                                  rarity === 2 ? 'bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]' :
                                  rarity === 1 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]' :
                                  'bg-slate-400'}
                              `} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Footer info */}
            <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
              <p className="text-white/20 text-[11px] font-medium tracking-wider uppercase">
                Keep playing to unlock more achievements 🎮
              </p>
            </div>
          </div>
        </div>

        {/* Decorative corner accents */}
        <div className="absolute -top-1 -left-1 w-8 h-8 border-l-2 border-t-2 border-gold-DEFAULT/30 rounded-tl-2xl" />
        <div className="absolute -top-1 -right-1 w-8 h-8 border-r-2 border-t-2 border-gold-DEFAULT/30 rounded-tr-2xl" />
        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-l-2 border-b-2 border-gold-DEFAULT/30 rounded-bl-2xl" />
        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-r-2 border-b-2 border-gold-DEFAULT/30 rounded-br-2xl" />
      </div>
    </div>
  )
}
