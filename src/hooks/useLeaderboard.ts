import { useState, useCallback } from 'react'

// Stub - leaderboard removed for mobile

export type SubmitState = 'idle' | 'submitting' | 'submitted' | 'error'

export function useScoreSubmission() {
  const [state, setState] = useState<SubmitState>('idle')
  
  const submit = useCallback(async (game: string, score: number, stats?: Record<string, unknown>) => {
    console.log('[Leaderboard] Disabled - no wallet')
    setState('idle')
  }, [])
  
  const reset = useCallback(() => {
    setState('idle')
  }, [])
  
  return { 
    submit, 
    state, 
    reset, 
    error: null as string | null,
    wallet: undefined as string | null | undefined
  }
}

export type LeaderboardEntry = {
  wallet_address: string
  score: number
  name?: string
  stage?: string
  stats?: Record<string, unknown>
  submitted_at?: string
}

export function useLeaderboard(game: string) {
  return { 
    entries: [] as LeaderboardEntry[], 
    loading: false, 
    refresh: () => {},
    wallet: undefined as string | null | undefined
  }
}
