import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { fetchProfile, setUsername as setUsernameApi } from '../lib/supabase'

export function useProfile() {
  const { publicKey } = useWallet()
  const [username, setUsernameState] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!publicKey) {
      setUsernameState(null)
      return
    }

    let cancelled = false
    setLoading(true)

    fetchProfile(publicKey.toBase58())
      .then((profile) => {
        if (cancelled) return
        setUsernameState(profile?.username ?? null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [publicKey])

  const setUsername = useCallback(
    async (name: string): Promise<{ success: boolean; error?: string }> => {
      if (!publicKey) return { success: false, error: 'No wallet connected' }
      const result = await setUsernameApi(publicKey.toBase58(), name)
      if (result.success) {
        setUsernameState(name)
      }
      return result
    },
    [publicKey],
  )

  return { username, loading, setUsername }
}
