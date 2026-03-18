import { useState, useEffect } from 'react'
import { API_URLS } from '../constants'

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B'
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K'
  return num.toFixed(2)
}

interface MarketData {
  marketCap: string
  price: string
  volume24h: string
  priceChange24h: string
}

export function useMarketData(pollInterval = 30000): MarketData {
  const [data, setData] = useState<MarketData>({
    marketCap: '---',
    price: '---',
    volume24h: '---',
    priceChange24h: '---',
  })

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(API_URLS.dexScreener)
        const json = await response.json()
        if (json.pairs && json.pairs.length > 0) {
          const pair = json.pairs[0]
          setData({
            marketCap: formatNumber(pair.marketCap || pair.fdv || 0),
            price: pair.priceUsd ? `$${parseFloat(pair.priceUsd).toFixed(8)}` : '---',
            volume24h: pair.volume?.h24 ? formatNumber(pair.volume.h24) : '---',
            priceChange24h: pair.priceChange?.h24 ? `${pair.priceChange.h24 > 0 ? '+' : ''}${pair.priceChange.h24.toFixed(1)}%` : '---',
          })
        }
      } catch (err) {
        console.error('Error fetching market data:', err)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, pollInterval)
    return () => clearInterval(interval)
  }, [pollInterval])

  return data
}
