import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useBulkBalance } from '../../hooks/useBulkBalance'

function formatBalance(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(0) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(0) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K'
  return n.toLocaleString()
}

export function WalletButton() {
  const { publicKey, disconnect, connecting } = useWallet()
  const { setVisible } = useWalletModal()
  const { balance, isHolder, loading } = useBulkBalance()

  if (!publicKey) {
    return (
      <button
        onClick={() => setVisible(true)}
        disabled={connecting}
        className="flex items-center justify-center gap-1 py-0.5 px-1 bg-gradient-to-br from-purple-DEFAULT to-purple-dark border border-gold-DEFAULT rounded-lg text-white font-bold text-xs font-[family-name:var(--font-display)] shadow-[0_0_10px_rgba(155,77,202,0.4)] transition-all cursor-pointer hover:scale-105 hover:shadow-[0_0_15px_rgba(155,77,202,0.6)]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M2 10h20" />
        </svg>
        {connecting ? '...' : '👛'}
      </button>
    )
  }

  const truncated = publicKey.toBase58().slice(0, 4) + '...' + publicKey.toBase58().slice(-4)

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-1 py-0.5 px-1 bg-bulk-bg/80 border border-purple-DEFAULT/60 rounded-lg text-white text-xs font-mono">
        <span className="text-green-400">●</span>
        <span>{truncated}</span>
        {loading ? (
          <span className="text-white/50">...</span>
        ) : balance !== null ? (
          <span className="text-gold-DEFAULT font-bold">{formatBalance(balance)}</span>
        ) : null}
      </div>
      <button
        onClick={() => disconnect()}
        className="py-0.5 px-1 bg-transparent border border-white/20 rounded text-white/50 text-[8px] cursor-pointer hover:border-white/50 hover:text-white transition-all"
      >
        ✕
      </button>
    </div>
  )
}
