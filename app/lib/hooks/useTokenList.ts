import { useState, useEffect, useCallback } from 'react'
import { getExplorerLink } from '../contracts'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://claw-click-backend-5157d572b2b6.herokuapp.com'

export interface TokenData {
  name: string
  symbol: string
  token: string
  poolId: string
  creator: string
  beneficiary: string
  agentWallet: string
  targetMcapETH: string
  createdAt: number
  createdBlock: number
  launchType: 'DIRECT' | 'AGENT' // DIRECT = claws.fun immortal agent, AGENT = claw.click hook token
  
  // Live stats
  price: string
  mcap: string
  mcapUSD: string
  vol24h: string
  change24h: string
  currentEpoch: number
  currentTax: number
  isGraduated: boolean
  txCount: number
  buyCount: number
  sellCount: number
  
  // Links
  chartUrl: string
  scanUrl: string
  hot: boolean
  chain: string
  logoUrl: string | null
  bannerUrl: string | null
}

export type TokenSort = 'new' | 'hot' | 'mcap' | 'volume' | 'volume_total'

export function useTokenList(options?: {
  sort?: TokenSort
  limit?: number
  offset?: number
  search?: string
  graduated?: boolean
}) {
  const [tokens, setTokens] = useState<TokenData[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const sort = options?.sort || 'new'
  const limit = options?.limit || 50
  const offset = options?.offset || 0
  const search = options?.search || ''
  const graduated = options?.graduated

  const fetchTokens = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        sort,
        limit: String(limit),
        offset: String(offset),
      })
      if (search) params.set('search', search)
      if (graduated !== undefined) params.set('graduated', String(graduated))

      const res = await fetch(`${API_URL}/api/tokens?${params}`)
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()
      const ethPrice = parseFloat(data.eth_price_usd || '0') || 2800

      const tokensData: TokenData[] = (data.tokens || []).map((t: any) => {
        const mcapETH = parseFloat(t.current_mcap || '0')
        const pricePerToken = mcapETH / 1_000_000_000
        const vol24hETH = parseFloat(t.volume_24h || '0')
        const priceChange = parseFloat(t.price_change_24h || '0')
        const changeStr = priceChange >= 0 ? `+${priceChange.toFixed(1)}%` : `${priceChange.toFixed(1)}%`

        return {
          name: t.name,
          symbol: t.symbol,
          token: t.address,
          poolId: '',
          creator: t.creator,
          beneficiary: t.beneficiary || '',
          agentWallet: '',
          targetMcapETH: t.target_mcap || '0',
          createdAt: t.launched_at ? Math.floor(new Date(t.launched_at).getTime() / 1000) : 0,
          createdBlock: 0,
          // launchType: 0 = DIRECT (claws.fun immortal), 1 = AGENT (claw.click hook)
          launchType: (t.launch_type === 0 || t.launch_type === 'DIRECT') ? 'DIRECT' : 'AGENT',

          price: `$${(pricePerToken * ethPrice).toFixed(6)}`,
          mcap: `${mcapETH.toFixed(4)} ETH`,
          mcapUSD: `$${(mcapETH * ethPrice).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
          vol24h: `$${(vol24hETH * ethPrice).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
          change24h: changeStr,
          currentEpoch: t.current_epoch || 0,
          currentTax: 0,
          isGraduated: t.graduated || false,
          txCount: parseInt(t.tx_count_24h || '0') + parseInt(t.tx_count_total || '0'),
          buyCount: parseInt(t.buys_24h || '0'),
          sellCount: parseInt(t.sells_24h || '0'),

          chartUrl: '#',
          scanUrl: getExplorerLink('token', t.address),
          hot: parseInt(t.tx_count_24h || '0') > 100,
          chain: 'SEPOLIA',
          logoUrl: t.logo_url || null,
          bannerUrl: t.banner_url || null,
        }
      })

      setTokens(tokensData)
      setTotal(data.total || 0)
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching tokens:', error)
      setIsLoading(false)
    }
  }, [sort, limit, offset, search, graduated])

  useEffect(() => {
    fetchTokens()
    const interval = setInterval(fetchTokens, 30000)
    return () => clearInterval(interval)
  }, [fetchTokens])

  return { tokens, total, isLoading, refresh: fetchTokens }
}
