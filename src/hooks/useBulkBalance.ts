import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { CONTRACT_ADDRESS, BULK_REQUIRED, SOLANA_RPC_URL } from '../constants'

const BULK_MINT = new PublicKey(CONTRACT_ADDRESS)
// pump.fun tokens use Token-2022
const TOKEN_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')

function getAssociatedTokenAddress(wallet: PublicKey, mint: PublicKey): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )
  return ata
}

async function fetchTokenBalance(walletAddress: PublicKey): Promise<number> {
  const ata = getAssociatedTokenAddress(walletAddress, BULK_MINT)

  const res = await fetch(SOLANA_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getTokenAccountBalance',
      params: [ata.toBase58()],
    }),
  })

  const json = await res.json()

  if (json.error) {
    // Account not found = no tokens
    console.log('[useBulkBalance] RPC error (likely no token account):', json.error.message)
    return 0
  }

  return json.result?.value?.uiAmount ?? 0
}

export function useBulkBalance() {
  const { publicKey } = useWallet()
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!publicKey) {
      setBalance(null)
      return
    }

    let cancelled = false
    setLoading(true)

    fetchTokenBalance(publicKey)
      .then((amount) => {
        if (cancelled) return
        console.log('[useBulkBalance] Balance for', publicKey.toBase58(), ':', amount)
        setBalance(amount)
      })
      .catch((err) => {
        console.error('[useBulkBalance] Fetch failed:', err)
        if (!cancelled) setBalance(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [publicKey])

  return {
    balance,
    isHolder: balance !== null && balance >= BULK_REQUIRED,
    loading,
  }
}
