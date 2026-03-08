import { createPublicClient, http, formatUnits } from 'viem'
import { base, sepolia } from 'viem/chains'
import { SEPOLIA_ADDRESSES, BASE_ADDRESSES, ABIS } from './contracts'

// Determine network from environment
// NOTE: Contracts are on ETHEREUM Sepolia, not Base Sepolia!
const isMainnet = process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
const network = isMainnet ? base : sepolia
const addresses = isMainnet ? BASE_ADDRESSES : SEPOLIA_ADDRESSES

// Create public client for reading — retryCount: 0 to avoid hammering RPC on 429s
const rpcUrl = isMainnet 
  ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_BASE || 'BdgPEmQddox2due7mrt9J'}`
  : `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_ETH_SEPOLIA || 'BdgPEmQddox2due7mrt9J'}`

export const publicClient = createPublicClient({
  chain: network,
  transport: http(rpcUrl, { retryCount: 0 })
})

// Simple in-memory cache for getAllAgents to prevent repeated RPC fallback hits
let _agentsCache: { data: Agent[]; timestamp: number } | null = null
const AGENTS_CACHE_TTL = 60_000 // 60 seconds
let _fallbackCooldown = 0 // timestamp until which on-chain fallback is suppressed

export interface Agent {
  wallet: `0x${string}`
  token: `0x${string}`
  creator: `0x${string}`
  name: string
  symbol: string
  birthBlock: bigint
  creatorType?: 'human' | 'agent'
  nftId?: number
  immortalized?: boolean
  memoryCID?: string
  avatarCID?: string
  chainId?: number
  priceUsd?: number
  mcapUsd?: number
  volume24h?: number
  earnings?: number
  graduated?: boolean
  launchedAt?: string
}

export interface RecentSwap {
  type: 'buy' | 'sell'
  amount_eth: string
  amount_token: string
  wallet: string
  tx_hash: string
  timestamp: string
}

export interface AgentStats {
  price: number
  marketCap: number
  volume24h: number
  volumeTotal: number
  liquidity: number
  earnings: number
  supply: number
  graduated: boolean
  graduatedAt: string | null
  currentEpoch: number
  currentPosition: number
  priceChange24h: number
  txCount24h: number
  txCountTotal: number
  buys24h: number
  sells24h: number
  launchedAt: string | null
  ethPriceUsd: number
  recentSwaps: RecentSwap[]
  targetMcap: number
  poolId: string | null
  logoUrl: string | null
}

/**
 * Fetch all agents from claw.click backend (V4 tokenization feed)
 */
export async function getAllAgents(): Promise<Agent[]> {
  // Return cached data if still fresh
  if (_agentsCache && Date.now() - _agentsCache.timestamp < AGENTS_CACHE_TTL) {
    return _agentsCache.data
  }

  try {
    const CLAWCLICK_BACKEND_URL = 
      process.env.NEXT_PUBLIC_CLAWCLICK_BACKEND_URL || 
      'https://claw-click-backend-5157d572b2b6.herokuapp.com'

    // Fetch recent agents from claw.click backend
    // Backend tracks all TokenLaunched events from ClawclickFactory v4
    const response = await fetch(`${CLAWCLICK_BACKEND_URL}/api/agents/recent?limit=100`)
    
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }

    const data = await response.json()
    
    // Backend returns { agents: [...], eth_price_usd: number }
    const backendAgents = Array.isArray(data) ? data : (data.agents || [])
    
    if (backendAgents.length === 0) {
      console.log('No agents found in backend')
      return []
    }

    // Transform backend response to Agent format
    const agents: Agent[] = backendAgents.map((agent: any) => ({
      wallet: agent.agent_wallet as `0x${string}`,
      token: agent.address as `0x${string}`,
      creator: agent.creator as `0x${string}`,
      name: agent.name,
      symbol: agent.symbol,
      birthBlock: BigInt(0),
      creatorType: 'human',
      nftId: undefined,
      immortalized: true,
      memoryCID: undefined,
      avatarCID: agent.logo_url,
      chainId: agent.chain_id,
      priceUsd: agent.price_usd ? parseFloat(agent.price_usd) : undefined,
      mcapUsd: agent.mcap_usd ? parseFloat(agent.mcap_usd) : undefined,
      volume24h: agent.volume_24h ? parseFloat(agent.volume_24h) : undefined,
      earnings: agent.creator_earnings ? parseFloat(agent.creator_earnings) : undefined,
      graduated: !!agent.graduated,
      launchedAt: agent.launched_at || undefined,
    }))

    // Cache successful response
    _agentsCache = { data: agents, timestamp: Date.now() }
    return agents
  } catch (error) {
    console.error('Failed to fetch agents from backend:', error)
    
    // Return stale cache if available (better than hitting RPC)
    if (_agentsCache) {
      console.log('Using stale agents cache')
      return _agentsCache.data
    }

    // Fallback: Try querying Birth Certificate NFT — but only if cooldown expired
    if (Date.now() < _fallbackCooldown) {
      console.log('RPC fallback on cooldown, skipping')
      return []
    }

    try {
      const count = await publicClient.readContract({
        address: addresses.birthCertificate as `0x${string}`,
        abi: ABIS.AgentBirthCertificateNFT,
        functionName: 'totalAgents'
      })
      
      console.log(`Fallback: Found ${count} agents in Birth Certificate`)
      
      // TODO: Iterate and fetch agent details from Birth Certificate
      // For now, return empty array and let UI show "Create First Agent"
      return []
    } catch (fallbackError) {
      console.error('Fallback query failed:', fallbackError)
      // Set cooldown to prevent further RPC spam for 2 minutes
      _fallbackCooldown = Date.now() + 120_000
      return []
    }
  }
}

/**
 * Fetch all tokens/agents created by a specific wallet address
 */
export async function getAgentsByCreator(creatorWallet: string): Promise<Agent[]> {
  try {
    const CLAWCLICK_BACKEND_URL =
      process.env.NEXT_PUBLIC_CLAWCLICK_BACKEND_URL ||
      'https://claw-click-backend-5157d572b2b6.herokuapp.com'

    const response = await fetch(
      `${CLAWCLICK_BACKEND_URL}/api/tokens/by-creator/${creatorWallet}`
    )

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }

    const data = await response.json()
    const backendTokens = data.tokens || []

    return backendTokens.map((t: any) => ({
      wallet: (t.agent_wallet || '0x0000000000000000000000000000000000000000') as `0x${string}`,
      token: t.address as `0x${string}`,
      creator: t.creator as `0x${string}`,
      name: t.name,
      symbol: t.symbol,
      birthBlock: BigInt(0),
      immortalized: true,
      avatarCID: t.logo_url,
      chainId: t.chain_id,
      priceUsd: t.price_usd ? parseFloat(t.price_usd) : undefined,
      mcapUsd: t.mcap_usd ? parseFloat(t.mcap_usd) : undefined,
      volume24h: t.volume_24h ? parseFloat(t.volume_24h) : undefined,
      graduated: !!t.graduated,
      launchedAt: t.launched_at || undefined,
      isAgent: !!t.is_agent,
      launchType: t.launch_type,
    }))
  } catch (error) {
    console.error('Failed to fetch agents by creator:', error)
    return []
  }
}

/**
 * Get single agent by wallet address
 * Tries cached agents list first, then falls back to backend, then on-chain (with cooldown)
 */
export async function getAgentByWallet(wallet: `0x${string}`): Promise<Agent | null> {
  // Try cache first
  if (_agentsCache) {
    const cached = _agentsCache.data.find(a => a.wallet.toLowerCase() === wallet.toLowerCase())
    if (cached) return cached
  }

  // Try fetching all agents (which has its own cache)
  try {
    const agents = await getAllAgents()
    const found = agents.find(a => a.wallet.toLowerCase() === wallet.toLowerCase())
    if (found) return found
  } catch (_) {}

  // Last resort: direct on-chain call (respects cooldown)
  if (Date.now() < _fallbackCooldown) return null

  try {
    const agentData = await publicClient.readContract({
      address: addresses.clawclick.factory as `0x${string}`,
      abi: ABIS.AgentFactory,
      functionName: 'getAgent',
      args: [wallet]
    })

    return agentData as unknown as Agent
  } catch (error) {
    console.error('Failed to fetch agent:', error)
    return null
  }
}

/**
 * Get agent statistics (price, mcap, earnings, etc.) from claw.click backend
 * Backend tracks all V4 token data: price, MCAP, volume, etc.
 */
export async function getAgentStats(tokenAddress: `0x${string}`, agentWallet: `0x${string}`): Promise<AgentStats> {
  try {
    const CLAWCLICK_BACKEND_URL = 
      process.env.NEXT_PUBLIC_CLAWCLICK_BACKEND_URL || 
      'https://claw-click-backend-5157d572b2b6.herokuapp.com'

    // Fetch token stats from backend (singular /token/ endpoint)
    const response = await fetch(`${CLAWCLICK_BACKEND_URL}/api/token/${tokenAddress}`)
    
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }

    const data = await response.json()
    const t = data.token || {}

    // Derive epoch from mcap multiplier: 1x=E1, 2x=E2, 4x=E3, 8x=E4, 16x+=Graduated
    const currentMcap = parseFloat(t.current_mcap || '0')
    const targetMcap = parseFloat(t.target_mcap || '0')
    let computedEpoch = 1
    let computedGraduated = !!t.graduated
    if (targetMcap > 0 && currentMcap > 0) {
      const multiplier = currentMcap / targetMcap
      if (multiplier >= 16) {
        computedGraduated = true
        computedEpoch = 4
      } else if (multiplier >= 1) {
        // floor(log2(multiplier)) + 1: 1x→E1, 2x→E2, 4x→E3, 8x→E4
        computedEpoch = Math.min(4, Math.floor(Math.log2(multiplier)) + 1)
      }
    }

    // Backend tracks real-time data from Uniswap V4 pool via PoolManager events
    return {
      price: parseFloat(t.current_price || '0'),
      marketCap: currentMcap,
      volume24h: parseFloat(t.volume_24h || '0'),
      volumeTotal: parseFloat(t.volume_total || '0'),
      liquidity: parseFloat(t.liquidity || '0'), // TVL in pool
      earnings: parseFloat(t.creator_earnings || '0'), // Creator's 70% share of taxes
      supply: 1_000_000_000, // V4: Fixed 1B supply
      graduated: computedGraduated,
      graduatedAt: t.graduated_at || null,
      currentEpoch: computedEpoch,
      currentPosition: parseInt(t.current_position || '0', 10),
      priceChange24h: parseFloat(t.price_change_24h || '0'),
      txCount24h: parseInt(t.tx_count_24h || '0', 10),
      txCountTotal: parseInt(t.tx_count_total || '0', 10),
      buys24h: parseInt(t.buys_24h || '0', 10),
      sells24h: parseInt(t.sells_24h || '0', 10),
      launchedAt: t.launched_at || null,
      ethPriceUsd: parseFloat(data.eth_price_usd || '0'),
      recentSwaps: (data.recentSwaps || []).map((s: any) => ({
        type: s.type || (s.is_buy ? 'buy' : 'sell'),
        amount_eth: s.amount_eth || '0',
        amount_token: s.amount_token || '0',
        wallet: s.wallet || s.sender || '',
        tx_hash: s.tx_hash || '',
        timestamp: s.timestamp || s.created_at || '',
      })),
      targetMcap: parseFloat(t.target_mcap || '0'),
      poolId: t.pool_id || null,
      logoUrl: t.logo_url || null,
    }
  } catch (error) {
    console.error('Failed to fetch agent stats from backend:', error)
    
    // Fallback: Try reading token supply on-chain
    try {
      const supply = await publicClient.readContract({
        address: tokenAddress,
        abi: ABIS.ClawclickToken, // Use V4 token ABI
        functionName: 'totalSupply'
      })

      const supplyNum = Number(formatUnits(supply as bigint, 18))

      return {
        price: 0,
        marketCap: 0,
        volume24h: 0,
        volumeTotal: 0,
        liquidity: 0,
        earnings: 0,
        supply: supplyNum,
        graduated: false,
        graduatedAt: null,
        currentEpoch: 1,
        currentPosition: 0,
        priceChange24h: 0,
        txCount24h: 0,
        txCountTotal: 0,
        buys24h: 0,
        sells24h: 0,
        launchedAt: null,
        ethPriceUsd: 0,
        recentSwaps: [],
        targetMcap: 0,
        poolId: null,
        logoUrl: null,
      }
    } catch (fallbackError) {
      console.error('Fallback token query failed:', fallbackError)
      return {
        price: 0,
        marketCap: 0,
        volume24h: 0,
        volumeTotal: 0,
        liquidity: 0,
        earnings: 0,
        supply: 1_000_000_000,
        graduated: false,
        graduatedAt: null,
        currentEpoch: 1,
        currentPosition: 0,
        priceChange24h: 0,
        txCount24h: 0,
        txCountTotal: 0,
        buys24h: 0,
        sells24h: 0,
        launchedAt: null,
        ethPriceUsd: 0,
        recentSwaps: [],
        targetMcap: 0,
        poolId: null,
        logoUrl: null,
      }
    }
  }
}

/**
 * Get agent earnings from claw.click backend (V4 creator earnings)
 * Backend tracks creator's 70% share of epoch-based taxes
 */
export async function getAgentEarnings(tokenAddress: `0x${string}`): Promise<number> {
  try {
    const CLAWCLICK_BACKEND_URL = 
      process.env.NEXT_PUBLIC_CLAWCLICK_BACKEND_URL || 
      'https://claw-click-backend-5157d572b2b6.herokuapp.com'

    const response = await fetch(`${CLAWCLICK_BACKEND_URL}/api/token/${tokenAddress}`)
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }

    const data = await response.json()
    return parseFloat(data.token?.creator_earnings || '0')
  } catch (error) {
    console.error('Failed to fetch earnings from backend:', error)
    return 0
  }
}

/**
 * Get token price from claw.click backend (V4 live price from Uniswap pool)
 */
export async function getTokenPrice(tokenAddress: `0x${string}`): Promise<number> {
  try {
    const CLAWCLICK_BACKEND_URL = 
      process.env.NEXT_PUBLIC_CLAWCLICK_BACKEND_URL || 
      'https://claw-click-backend-5157d572b2b6.herokuapp.com'

    const response = await fetch(`${CLAWCLICK_BACKEND_URL}/api/token/${tokenAddress}`)
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }

    const data = await response.json()
    return parseFloat(data.token?.current_price || '0')
  } catch (error) {
    console.error('Failed to fetch token price from backend:', error)
    return 0
  }
}

/**
 * Index TokenLaunched events from ClawclickFactory (V4)
 * Note: This is now handled by the claw.click backend indexer.
 * Use getAllAgents() instead to fetch from backend API.
 */
export async function indexAgentEvents(fromBlock: bigint = BigInt(0)): Promise<Agent[]> {
  console.warn('indexAgentEvents is deprecated - use getAllAgents() to fetch from backend')
  return getAllAgents()
}
