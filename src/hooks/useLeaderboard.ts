import { useState, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import {
  fetchLeaderboard,
  submitScore,
  type LeaderboardEntry,
} from '../lib/supabase'

export function useLeaderboard(game: string) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    const data = await fetchLeaderboard(game)
    setEntries(data)
    setLoading(false)
  }, [game])

  return { entries, loading, refresh }
}

export type SubmitState = 'idle' | 'submitting' | 'submitted' | 'error'

export function useScoreSubmission() {
  const { publicKey } = useWallet()
  const [state, setState] = useState<SubmitState>('idle')
  const [error, setError] = useState<string | undefined>(undefined)

  const submit = useCallback(
    async (
      game: string,
      score: number,
      stats?: Record<string, number | string>,
    ) => {
      if (!publicKey) {
        console.log('[Leaderboard] Cannot submit: no wallet connected')
        return
      }
      console.log('[Leaderboard] Submitting score:', { game, score, stats, wallet: publicKey.toBase58().slice(0, 8) + '...' })
      setState('submitting')
      setError(undefined)
      const result = await submitScore(
        publicKey.toBase58(),
        game,
        score,
        stats,
      )
      console.log('[Leaderboard] Submit result:', result)
      if (!result.success) {
        setState('error')
        setError(result.error || 'Unknown error')
      } else {
        setState('submitted')
        setError(undefined)
      }
    },
    [publicKey],
  )

  const reset = useCallback(() => {
    setState('idle')
    setError(undefined)
  }, [])

  return { submit, state, reset, error, wallet: publicKey?.toBase58() ?? null }
}
