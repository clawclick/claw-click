import { useState, useEffect } from 'react'
import { getChainDisplayName } from '../contracts'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://claw-click-backend-5157d572b2b6.herokuapp.com'

export interface TrendingToken {
  ticker: string
  change: string
  mcap: string
  chain: string
  address: string
  logoUrl: string | null
}

export function useTrendingTokens() {
  const [trending, setTrending] = useState<TrendingToken[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchTrending()
    const interval = setInterval(fetchTrending, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchTrending() {
    try {
      const res = await fetch(`${API_URL}/api/tokens/trending`)
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()
      const ethPrice = parseFloat(data.eth_price_usd || '0') || 2800

      const tokens: TrendingToken[] = (data.tokens || []).map((t: any) => {
        const priceChange = parseFloat(t.price_change_24h || '0')
        const changeStr = priceChange >= 0 ? `+${priceChange.toFixed(1)}%` : `${priceChange.toFixed(1)}%`
        const mcapETH = parseFloat(t.current_mcap || '0')

        return {
          ticker: `$${t.symbol}`,
          change: changeStr,
          mcap: `$${(mcapETH * ethPrice).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
          chain: getChainDisplayName(t.chain_id),
          address: t.address,
          logoUrl: t.logo_url || null,
        }
      })

      setTrending(tokens)
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching trending tokens:', error)
      setIsLoading(false)
    }
  }

  return { trending, isLoading }
}
