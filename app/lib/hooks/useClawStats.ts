import { useState, useEffect } from 'react'
import { formatLargeNumber } from '../utils/formatNumber'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://claw-click-backend-5157d572b2b6.herokuapp.com'

export interface ClawStats {
  tokensLaunched: number
  totalVolume: string
  feesGenerated: string
  totalMarketCap: string
  isLoading: boolean
}

export function useClawStats() {
  const [stats, setStats] = useState<ClawStats>({
    tokensLaunched: 0,
    totalVolume: '$0',
    feesGenerated: '$0',
    totalMarketCap: '$0',
    isLoading: true,
  })

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchStats() {
    try {
      const res = await fetch(`${API_URL}/api/stats`)
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()

      const ethPrice = parseFloat(data.eth_price_usd || '0') || 2800
      const totalVolumeETH = parseFloat(data.total_volume_eth || '0')
      const totalFeesETH = parseFloat(data.total_fees_eth || '0')
      const totalMcapETH = parseFloat(data.total_market_cap_eth || '0')

      setStats({
        tokensLaunched: data.total_tokens || 0,
        totalVolume: formatLargeNumber(totalVolumeETH * ethPrice),
        feesGenerated: formatLargeNumber(totalFeesETH * ethPrice),
        totalMarketCap: formatLargeNumber(totalMcapETH * ethPrice),
        isLoading: false,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
      setStats(prev => ({ ...prev, isLoading: false }))
    }
  }

  return stats
}
