import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

export interface LeaderboardEntry {
  wallet_address: string
  game: string
  score: number
  stats: Record<string, number | string>
  submitted_at: string
}

export async function fetchLeaderboard(
  game: string,
  limit = 50,
): Promise<LeaderboardEntry[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('leaderboard')
    .select('wallet_address, game, score, stats, submitted_at')
    .eq('game', game)
    .order('score', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to fetch leaderboard:', error)
    return []
  }
  return data ?? []
}

export async function submitScore(
  wallet: string,
  game: string,
  score: number,
  stats: Record<string, number | string> = {},
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.error('[Supabase] Not configured')
    return { success: false, error: 'Supabase not configured' }
  }
  console.log('[Supabase] Calling submit_score RPC:', { wallet: wallet.slice(0, 8) + '...', game, score, stats })
  const { error } = await supabase.rpc('submit_score', {
    p_wallet: wallet,
    p_game: game,
    p_score: score,
    p_stats: stats,
  })
  if (error) {
    console.error('[Supabase] submit_score error:', error)
    return { success: false, error: error.message }
  }
  console.log('[Supabase] submit_score success')
  return { success: true }
}

export async function fetchPlayerRank(
  wallet: string,
  game: string,
): Promise<number | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('leaderboard')
    .select('wallet_address, score')
    .eq('game', game)
    .order('score', { ascending: false })

  if (error || !data) return null
  const index = data.findIndex((e) => e.wallet_address === wallet)
  return index >= 0 ? index + 1 : null
}

// --- Profiles ---

export interface Profile {
  wallet_address: string
  username: string
}

export async function fetchProfile(wallet: string): Promise<Profile | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('wallet_address, username')
    .eq('wallet_address', wallet)
    .single()

  if (error || !data) return null
  return data
}

export async function fetchProfiles(wallets: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (!supabase || wallets.length === 0) return map
  const { data, error } = await supabase
    .from('profiles')
    .select('wallet_address, username')
    .in('wallet_address', wallets)

  if (error || !data) return map
  for (const row of data) {
    map.set(row.wallet_address, row.username)
  }
  return map
}

export async function setUsername(
  wallet: string,
  username: string,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not configured' }
  const { error } = await supabase.rpc('set_username', {
    p_wallet: wallet,
    p_username: username,
  })
  if (error) {
    console.error('Failed to set username:', error)
    return { success: false, error: error.message }
  }
  return { success: true }
}
