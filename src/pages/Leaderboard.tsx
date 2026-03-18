import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { BackButton } from '../components/layout/BackButton'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { fetchProfiles } from '../lib/supabase'

const GAMES = [
  { key: 'bulkagachi', label: 'BULKAGACHI', emoji: '🥚' },
  { key: 'runner', label: 'BULK RUNNER', emoji: '🏃' },
  { key: 'bros', label: 'SUPER BULK BROS', emoji: '🎮' },
  { key: 'schmeg', label: 'STREETS OF SCHMEG', emoji: '👊' },
  { key: 'flappy', label: 'FLAPPY BULK', emoji: '🐦' },
  { key: 'climb', label: 'BULK CLIMB', emoji: '🧗' },
  // { key: 'breaker', label: 'BULK BREAKER', emoji: '🧱' },
  { key: 'rampage', label: 'BULK RAMPAGE', emoji: '👹' },
] as const

const RANK_COLORS = [
  'from-yellow-400 via-yellow-300 to-yellow-500', // Gold
  'from-slate-300 via-slate-200 to-slate-400',     // Silver
  'from-amber-600 via-amber-500 to-amber-700',     // Bronze
]

const RANK_BG_COLORS = [
  'bg-yellow-500/10 border-yellow-400/30',   // Gold
  'bg-slate-400/10 border-slate-300/30',     // Silver
  'bg-amber-700/10 border-amber-600/30',     // Bronze
]

function truncateWallet(address: string): string {
  if (address.length <= 8) return address
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatScore(score: number, game: string): string {
  if (game === 'bulkagachi') {
    // Score is in minutes
    const days = Math.floor(score / 1440)  // 60 * 24
    const hours = Math.floor((score % 1440) / 60)
    const minutes = score % 60
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }
  return score.toLocaleString()
}

function getRankIcon(rank: number): string {
  if (rank === 1) return '👑'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return rank.toString()
}

export default function Leaderboard() {
  const navigate = useNavigate()
  const [activeGame, setActiveGame] = useState<string>('bulkagachi')
  const { entries, loading, refresh } = useLeaderboard(activeGame)
  const { publicKey } = useWallet()
  const walletAddress = publicKey?.toBase58() ?? null
  const [usernames, setUsernames] = useState<Map<string, string>>(new Map())

  const activeGameData = GAMES.find(g => g.key === activeGame)

  useEffect(() => {
    refresh()
  }, [activeGame, refresh])

  useEffect(() => {
    if (entries.length === 0) return
    const wallets = entries.map((e) => e.wallet_address)
    fetchProfiles(wallets).then(setUsernames)
  }, [entries])

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-[#0a0a12] via-[#1a1025] to-[#0d0d18] p-4 sm:p-6 lg:p-8">
      <button onClick={() => navigate("/games/bulkagachi")} className="absolute top-4 left-4 z-50 bg-purple-600 text-white px-4 py-2 rounded-lg">← Back</button>

      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gold-DEFAULT/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-900/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-3xl">
        {/* Main card */}
        <div className="bg-[#11111a]/80 backdrop-blur-2xl rounded-3xl border border-white/[0.08] shadow-[0_0_80px_rgba(0,0,0,0.6),0_0_30px_rgba(155,77,202,0.15)] overflow-hidden">
          
          {/* Header section */}
          <div className="relative px-6 sm:px-10 pt-10 pb-8 border-b border-white/[0.06]">
            {/* Glow effect behind title */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-gradient-to-b from-purple-500/10 to-transparent rounded-full blur-3xl" />
            
            <h1 className="relative text-4xl sm:text-5xl font-bold text-center mb-2">
              <span className="bg-gradient-to-r from-gold-DEFAULT via-yellow-300 to-gold-DEFAULT bg-clip-text text-transparent font-[family-name:var(--font-display)] tracking-tight drop-shadow-[0_0_30px_rgba(255,215,0,0.3)]">
                LEADERBOARD
              </span>
            </h1>
            <p className="text-center text-white/30 text-sm tracking-wider font-medium">
              {activeGameData?.emoji} {activeGameData?.label}
            </p>
          </div>

          <div className="px-4 sm:px-8 py-8 max-h-[75dvh] overflow-y-auto custom-scrollbar">
            
            {/* Game tabs - Redesigned */}
            <div className="mb-10">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                {GAMES.map((game) => {
                  const isActive = activeGame === game.key
                  return (
                    <button
                      key={game.key}
                      onClick={() => setActiveGame(game.key)}
                      className={`
                        relative px-2 sm:px-3 py-3 sm:py-4 rounded-xl font-bold transition-all duration-300 cursor-pointer
                        flex flex-col items-center gap-1.5
                        ${isActive 
                          ? 'bg-gradient-to-b from-purple-500/20 to-purple-900/20 text-white shadow-[0_0_20px_rgba(155,77,202,0.3)] border border-purple-400/30 scale-105' 
                          : 'bg-white/[0.03] text-white/40 hover:text-white/70 hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08]'
                        }
                      `}
                    >
                      <span className="text-xl sm:text-2xl">{game.emoji}</span>
                      <span className="text-[9px] sm:text-[10px] uppercase tracking-wider leading-tight text-center">
                        {game.label.replace('BULK ', '').replace('SUPER ', '').replace(' BROS', '')}
                      </span>
                      {isActive && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent rounded-full" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Leaderboard table */}
            <div className="bg-[#0a0a12]/60 border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="grid grid-cols-[3.5rem_1fr_5.5rem_4rem] sm:grid-cols-[4rem_1fr_7rem_7rem_6rem] gap-3 px-4 sm:px-6 py-5 border-b border-white/[0.06] bg-white/[0.02]">
                <div className="text-[11px] text-white/25 font-bold tracking-[0.25em] uppercase flex items-center">Rank</div>
                <div className="text-[11px] text-white/25 font-bold tracking-[0.25em] uppercase flex items-center">Player</div>
                <div className="text-[11px] text-white/25 font-bold tracking-[0.25em] uppercase flex items-center justify-end">Score</div>
                <div className="text-[11px] text-white/25 font-bold tracking-[0.25em] uppercase items-center justify-end hidden sm:flex">Stats</div>
                <div className="text-[11px] text-white/25 font-bold tracking-[0.25em] uppercase flex items-center justify-end">Date</div>
              </div>

              {/* Loading state */}
              {loading && (
                <div className="px-6 py-20 text-center">
                  <div className="inline-flex items-center gap-3 text-white/30">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-purple-400 rounded-full animate-spin" />
                    <span className="text-sm font-bold tracking-widest uppercase">Loading Scores</span>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!loading && entries.length === 0 && (
                <div className="px-6 py-20 text-center">
                  <div className="text-4xl mb-4">🏆</div>
                  <p className="text-white/40 text-sm font-medium">
                    No scores yet. Be the first to claim the top spot!
                  </p>
                </div>
              )}

              {/* Entries */}
              {!loading && entries.map((entry, i) => {
                const rank = i + 1
                const isCurrentUser = walletAddress === entry.wallet_address
                const isTop3 = rank <= 3
                const rankColor = RANK_COLORS[rank - 1] || ''
                const rankBgColor = RANK_BG_COLORS[rank - 1] || ''

                const statsStr = entry.stats
                  ? (() => {
                      const parts = []
                      if (entry.stats.level) parts.push(`Lv${entry.stats.level}`)
                      if (entry.stats.stage) parts.push(entry.stats.stage)
                      return parts.join(' • ')
                    })()
                  : ''

                return (
                  <div
                    key={entry.wallet_address}
                    className={`
                      grid grid-cols-[3.5rem_1fr_5.5rem_4rem] sm:grid-cols-[4rem_1fr_7rem_7rem_6rem] 
                      gap-3 px-4 sm:px-6 py-5 border-b border-white/[0.04] 
                      transition-all duration-300
                      ${isCurrentUser
                        ? 'bg-purple-500/10 border-l-[3px] border-l-purple-400 shadow-[inset_0_0_30px_rgba(155,77,202,0.1)]'
                        : isTop3
                          ? `${rankBgColor} border-l-[3px]`
                          : 'hover:bg-white/[0.02]'
                      }
                      ${isTop3 ? 'border-l-' + (rank === 1 ? 'yellow-400' : rank === 2 ? 'slate-300' : 'amber-600') : ''}
                    `}
                  >
                    {/* Rank */}
                    <div className="flex items-center">
                      {isTop3 ? (
                        <div className={`
                          w-9 h-9 rounded-xl flex items-center justify-center text-lg
                          bg-gradient-to-br ${rankColor} shadow-lg
                        `}>
                          {getRankIcon(rank)}
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white/30 bg-white/[0.03] border border-white/[0.06]">
                          {rank}
                        </div>
                      )}
                    </div>

                    {/* Player */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="truncate flex-1">
                        {usernames.get(entry.wallet_address) ? (
                          <span className={`font-bold font-[family-name:var(--font-display)] tracking-tight text-base ${
                            isCurrentUser ? 'text-purple-300' : isTop3 ? 'text-white' : 'text-white/80'
                          }`}>
                            {usernames.get(entry.wallet_address)}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-white/50">{truncateWallet(entry.wallet_address)}</span>
                        )}
                      </div>
                      {isCurrentUser && (
                        <span className="shrink-0 text-[9px] px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 font-bold uppercase tracking-wider border border-purple-400/20">
                          YOU
                        </span>
                      )}
                    </div>

                    {/* Score */}
                    <div className={`text-right font-bold text-base flex items-center justify-end tracking-tight ${
                      isTop3 
                        ? rank === 1 ? 'text-yellow-300' : rank === 2 ? 'text-slate-200' : 'text-amber-400'
                        : 'text-white/90'
                    }`}>
                      {formatScore(entry.score, activeGame)}
                    </div>

                    {/* Stats - hidden on mobile */}
                    <div className="text-right text-white/25 text-xs truncate hidden sm:flex items-center justify-end font-mono">
                      {statsStr || '—'}
                    </div>

                    {/* Date */}
                    <div className="text-right text-white/20 text-[11px] flex items-center justify-end font-mono">
                      {formatDate(entry.submitted_at)}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer info */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-white/20">
              {!walletAddress ? (
                <p className="text-[11px] font-medium tracking-wider uppercase">
                  Connect wallet to submit your scores ⚡
                </p>
              ) : (
                <p className="text-[11px] font-medium tracking-wider uppercase">
                  Showing top {entries.length} scores
                </p>
              )}
              <button 
                onClick={refresh}
                className="text-[11px] font-medium tracking-wider uppercase hover:text-white/40 transition-colors cursor-pointer flex items-center gap-2"
              >
                <span>🔄</span> Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Decorative corner accents */}
        <div className="absolute -top-1 -left-1 w-8 h-8 border-l-2 border-t-2 border-purple-500/30 rounded-tl-2xl" />
        <div className="absolute -top-1 -right-1 w-8 h-8 border-r-2 border-t-2 border-purple-500/30 rounded-tr-2xl" />
        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-l-2 border-b-2 border-purple-500/30 rounded-bl-2xl" />
        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-r-2 border-b-2 border-purple-500/30 rounded-br-2xl" />
      </div>
    </div>
  )
}
