'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { usePublicClient, useAccount, useReadContract } from 'wagmi'
import { createPublicClient, http } from 'viem'
import { base, sepolia } from 'viem/chains'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { getAllAgents, getAgentStats, getAgentEarnings, Agent, AgentStats } from '../../../../lib/agents'
import { SEPOLIA_ADDRESSES, BASE_ADDRESSES, ABIS } from '../../../../lib/contracts'
import FUNLANQRCode from '../../../components/FUNLANQRCode'
import { apiUrl, clawsFunApiUrl } from '../../../../lib/api'
import { analyzeGrid, hasLobster } from '../../../../lib/funlanQR'
import { getNFTidForAgent, linkNFTidToAgent, unlinkAgent } from '../../../../lib/nftidLinkage'
import { CLAWD_NFT_ADDRESS, CLAWD_NFT_ABI } from '../../../../lib/contracts/clawdNFT'
import NFTidCompositor from '../../../../components/NFTidCompositor'
import IDIcon from '../../../../components/icons/IDIcon'
import { parseTraits, validateTraits } from '../../../../lib/utils/traitParser'

interface BirthCertData {
  nftId: number
  name: string
  wallet: string
  tokenAddress: string
  creator: string
  memoryCID: string
  avatarCID: string
  birthTimestamp: number
  immortalized: boolean
  spawnedAgents: number
}

interface MemoryEntry {
  timestamp: bigint
  ipfsCID: string
  fullText: string
  contentHash: `0x${string}`
}

interface SessionListItem {
  id: number
  agentName: string
  status: string
  isActive: boolean
  isExpired: boolean
  gpuType: string
  numGpus: number
  cpuCores: number
  memoryGb: number
  costPerHour: number
  createdAt: number
  expiresAt: number
  timeRemaining: number
}

export default function AgentDashboard({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'memory' | 'sessions' | 'token'>('overview')
  const [agent, setAgent] = useState<Agent | null>(null)
  const [stats, setStats] = useState<AgentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessions, setSessions] = useState<SessionListItem[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [birthCert, setBirthCert] = useState<BirthCertData | null>(null)
  const [hasNFT, setHasNFT] = useState<boolean | null>(null) // null = loading
  const [memories, setMemories] = useState<MemoryEntry[]>([])
  const [memoriesLoading, setMemoriesLoading] = useState(false)
  const [memoryCount, setMemoryCount] = useState<number>(0)
  const publicClient = usePublicClient()
  
  // NFTid linkage state
  const { address: connectedAddress } = useAccount()
  const [linkedNFTid, setLinkedNFTid] = useState<number | null>(null)
  const [linkedNFTidTraits, setLinkedNFTidTraits] = useState<any>(null)
  const [ownedNFTids, setOwnedNFTids] = useState<number[]>([])
  const [selectedNFTid, setSelectedNFTid] = useState<number | null>(null)
  const [isAgentOwner, setIsAgentOwner] = useState(false)
  const [loadingNFTid, setLoadingNFTid] = useState(true)

  const connectedChainId = publicClient?.chain?.id
  const isMainnet = connectedChainId === 8453 || process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
  const addresses = isMainnet ? BASE_ADDRESSES : SEPOLIA_ADDRESSES

  // Explorer URL based on the agent's chain, not the connected wallet
  const agentChainId = agent?.chainId
  const agentIsBase = agentChainId === 8453 || (!agentChainId && isMainnet)
  const explorerBase = agentIsBase ? 'https://basescan.org' : 'https://sepolia.etherscan.io'
  const explorerName = agentIsBase ? 'Basescan' : 'Etherscan'
  const chain = agentIsBase ? 'Base' : 'Ethereum Sepolia'

  // Create a public client for the agent's chain (not the connected wallet's chain)
  // This ensures birth cert queries hit the correct chain's RPC
  const agentAddresses = useMemo(() => agentIsBase ? BASE_ADDRESSES : SEPOLIA_ADDRESSES, [agentIsBase])
  const agentClient = useMemo(() => {
    const agentChain = agentIsBase ? base : sepolia
    const rpcUrl = agentIsBase
      ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_BASE || 'BdgPEmQddox2due7mrt9J'}`
      : `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_ETH_SEPOLIA || 'BdgPEmQddox2due7mrt9J'}`
    return createPublicClient({
      chain: agentChain,
      transport: http(rpcUrl, { retryCount: 1, retryDelay: 2000 }),
      batch: { multicall: true },
    })
  }, [agentIsBase])

  // Fetch agent data on mount
  useEffect(() => {
    async function loadAgent() {
      try {
        setLoading(true)
        setError(null)

        // Fetch all agents and find the one matching the ID
        const agents = await getAllAgents()
        const foundAgent = agents.find(a => 
          a.wallet.toLowerCase() === params.id.toLowerCase() ||
          a.token.toLowerCase() === params.id.toLowerCase()
        )

        if (!foundAgent) {
          setError('Agent not found on-chain')
          return
        }

        setAgent(foundAgent)

        // Fetch stats
        const agentStats = await getAgentStats(foundAgent.token, foundAgent.wallet)
        setStats(agentStats)

        // Batch: check birth cert NFT + memory count in parallel (single multicall)
        try {
          const [nftId, memCount] = await Promise.all([
            agentClient.readContract({
              address: agentAddresses.birthCertificate as `0x${string}`,
              abi: ABIS.AgentBirthCertificateNFT,
              functionName: 'nftByWallet',
              args: [foundAgent.wallet],
            }) as Promise<bigint>,
            agentClient.readContract({
              address: agentAddresses.memoryStorage as `0x${string}`,
              abi: ABIS.MemoryStorage,
              functionName: 'getMemoryCount',
              args: [foundAgent.wallet],
            }).then(c => Number(c as bigint)).catch(() => 0),
          ])

          setMemoryCount(memCount)

          if (nftId > BigInt(0)) {
            setHasNFT(true)
            // Fetch full birth cert data
            try {
              const data = await agentClient.readContract({
                address: agentAddresses.birthCertificate as `0x${string}`,
                abi: ABIS.AgentBirthCertificateNFT,
                functionName: 'getAgent',
                args: [nftId],
              }) as any
                setBirthCert({
                  nftId: Number(data.nftId),
                  name: data.name,
                  wallet: data.wallet,
                  tokenAddress: data.tokenAddress,
                  creator: data.creator,
                  memoryCID: data.memoryCID,
                  avatarCID: data.avatarCID,
                  birthTimestamp: Number(data.birthTimestamp),
                  immortalized: data.immortalized,
                  spawnedAgents: Number(data.spawnedAgents),
                })
              } catch (e) {
                console.error('Failed to fetch birth cert details:', e)
              }
            } else {
              setHasNFT(false)
            }
          } catch (e) {
            console.error('Failed to check NFT:', e)
            setHasNFT(false)
          }

      } catch (err) {
        console.error('Failed to load agent:', err)
        setError('Failed to load agent data from blockchain')
      } finally {
        setLoading(false)
      }
    }

    loadAgent()
  }, [params.id, agentClient, agentAddresses.birthCertificate])

  // Fetch individual memory entries (lazy — only when memory tab is active)
  const fetchMemories = useCallback(async () => {
    if (!agent || memoryCount === 0 || memories.length > 0) return // already loaded or nothing to load
    setMemoriesLoading(true)
    try {
      // Batch all getMemory calls in parallel (uses multicall under the hood)
      const indices = Array.from({ length: memoryCount }, (_, i) => BigInt(memoryCount - 1 - i))
      const results = await Promise.allSettled(
        indices.map(i =>
          agentClient.readContract({
            address: agentAddresses.memoryStorage as `0x${string}`,
            abi: ABIS.MemoryStorage,
            functionName: 'getMemory',
            args: [agent.wallet, i],
          })
        )
      )

      const entries: MemoryEntry[] = []
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const mem = result.value as any
          entries.push({
            timestamp: mem.timestamp,
            ipfsCID: mem.ipfsCID,
            fullText: mem.fullText,
            contentHash: mem.contentHash,
          })
        }
      }
      setMemories(entries)
    } catch (err) {
      console.error('Failed to fetch memories:', err)
    } finally {
      setMemoriesLoading(false)
    }
  }, [agent, agentClient, agentAddresses.memoryStorage, memoryCount, memories.length])

  // Lazy-load memories only when the memory tab is activated
  useEffect(() => {
    if (activeTab === 'memory' && agent && memoryCount > 0 && memories.length === 0) {
      fetchMemories()
    }
  }, [activeTab, agent, memoryCount, memories.length, fetchMemories])

  // Fetch sessions when the sessions tab is active
  const fetchSessions = useCallback(async () => {
    if (!agent) return
    setSessionsLoading(true)
    try {
      const res = await fetch(clawsFunApiUrl(`/api/session/list?agent=${agent.wallet}`))
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err)
    } finally {
      setSessionsLoading(false)
    }
  }, [agent])

  useEffect(() => {
    if (activeTab === 'sessions' && agent) {
      fetchSessions()
      // Poll every 15s while on sessions tab
      const interval = setInterval(fetchSessions, 15000)
      return () => clearInterval(interval)
    }
  }, [activeTab, agent, fetchSessions])

  // Load linked NFTid from registry
  useEffect(() => {
    async function loadLinkedNFTid() {
      if (!agent) return
      setLoadingNFTid(true)
      try {
        const nftidTokenId = await getNFTidForAgent(agent.token)
        if (nftidTokenId) {
          setLinkedNFTid(nftidTokenId)
          
          // Fetch NFTid traits from Base
          try {
            const baseRpcClient = createPublicClient({
              chain: base,
              transport: http(`https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_BASE || 'BdgPEmQddox2due7mrt9J'}`),
            })
            
            const traitsResponse = await baseRpcClient.readContract({
              address: CLAWD_NFT_ADDRESS.base,
              abi: CLAWD_NFT_ABI,
              functionName: 'getTraits',
              args: [BigInt(nftidTokenId)],
            }) as any

            // Parse traits using helper
            const parsedTraits = parseTraits(traitsResponse)
            if (parsedTraits && validateTraits(parsedTraits)) {
              setLinkedNFTidTraits(parsedTraits)
            } else {
              console.error('Invalid trait data for NFTid:', nftidTokenId, traitsResponse)
            }
          } catch (err) {
            console.error('Failed to fetch NFTid traits:', err)
          }
        }
      } catch (err) {
        console.error('Failed to load linked NFTid:', err)
      } finally {
        setLoadingNFTid(false)
      }
    }

    loadLinkedNFTid()
  }, [agent])

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen w-full overflow-x-hidden" style={{background:"var(--bg-soft)"}}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-[var(--mint-mid)] border-t-transparent mx-auto mb-4"></div>
            <p className="text-[rgba(255, 255, 255, 0.5)]">Loading agent data from blockchain...</p>
          </div>
        </div>
      </main>
    )
  }

  // Error state
  if (error || !agent) {
    return (
      <main className="min-h-screen w-full overflow-x-hidden" style={{background:"var(--bg-soft)"}}>
        <header className="fixed w-full z-50 glass border-b border-[var(--mint-mid)]/10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative w-10 h-10">
                <Image 
                  src="/branding/logo_rm_bk.png" 
                  alt="Claw.Click" 
                  width={40}
                  height={40}
                  className="object-contain" 
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold bg-gradient-to-r from-[var(--mint-mid)] to-[var(--mint-dark)] text-transparent bg-clip-text">
                    claw.click
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-[var(--mint-mid)]/20 text-[var(--mint-dark)] border border-[var(--mint-mid)]/30 rounded uppercase tracking-wide">
                    BETA
                  </span>
                </div>
                <span className="text-xs text-[var(--text-secondary)]">Agent Infrastructure</span>
              </div>
            </Link>
            <ConnectButton />
          </div>
        </header>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-6xl mb-6">🦞</div>
            <h1 className="text-3xl font-bold mb-4">Agent Not Found</h1>
            <p className="text-[rgba(255, 255, 255, 0.5)] mb-8">{error || 'This agent does not exist on-chain'}</p>
            <Link href="/">
              <button className="px-8 py-4 bg-[var(--mint-mid)] text-black font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(30,230,183,0.5)] transition-all">
                Back to Homepage
              </button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen w-full overflow-x-hidden" style={{background:"var(--bg-soft)"}}>
      {/* Electric Aura Background */}
      <div className="electric-aura">
        <div className="electric-particle"></div>
        <div className="electric-particle"></div>
        <div className="electric-particle"></div>
        <div className="electric-particle"></div>
        <div className="electric-particle"></div>
        <div className="electric-particle"></div>
        <div className="electric-particle"></div>
        <div className="electric-particle"></div>
      </div>
      
      {/* Subtle gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-page"></div>
      </div>

      {/* Header */}
      <header className="fixed w-full z-50 glass border-b border-[var(--mint-mid)]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <Image 
                src="/branding/logo_rm_bk.png" 
                alt="Claw.Click" 
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold bg-gradient-to-r from-[var(--mint-mid)] to-[var(--mint-dark)] text-transparent bg-clip-text">
                  claw.click
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-[var(--mint-mid)]/20 text-[var(--mint-dark)] border border-[var(--mint-mid)]/30 rounded uppercase tracking-wide">
                  BETA
                </span>
              </div>
              <span className="text-xs text-[var(--text-secondary)]">Agent Infrastructure</span>
            </div>
          </Link>
          
          <ConnectButton />
        </div>
      </header>

      {/* Main Content */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Agent Header */}
          <div className="bg-[rgba(255, 255, 255, 0.03)] border border-[var(--mint-mid)]/25 rounded-2xl backdrop-blur-sm p-4 sm:p-8 mb-6">
            <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-6">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-4xl font-black text-[var(--text-primary)] mb-2 break-words">
                  {agent.name}
                </h1>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className="text-sm sm:text-base text-[rgba(255, 255, 255, 0.5)]">${agent.symbol}</span>
                  <span className={`text-xs px-2 py-1 rounded border font-semibold ${
                    chain.toLowerCase().includes('base') ? 'border-[#4A90E2]/30 bg-[#4A90E2]/15 text-[#4A90E2]' :
                    chain.toLowerCase().includes('bsc') || chain.toLowerCase().includes('binance') ? 'border-[#F0B90B]/30 bg-[#F0B90B]/15 text-[#F0B90B]' :
                    chain.toLowerCase().includes('sepolia') ? 'border-[#9CA3AF]/30 bg-[#9CA3AF]/15 text-[#9CA3AF]' :
                    'border-[#8B7FD4]/30 bg-[#8B7FD4]/15 text-[#8B7FD4]'
                  }`}>
                    {chain === 'Ethereum Sepolia' ? 'ETHEREUM SEPOLIA' : chain.toUpperCase()}
                  </span>
                  {agent.creatorType && (
                    <span className="text-xs px-2 py-1 rounded border border-purple-500/30 bg-purple-500/15 text-purple-400">
                      {agent.creatorType === 'human' ? '👤 Human Created' : '🤖 Agent Created'}
                    </span>
                  )}
                  {(agent.immortalized || memoryCount > 0) ? (
                    <span className="text-xs px-2 py-1 rounded border border-[var(--mint-mid)]/30 bg-[var(--mint-mid)]/10 text-[var(--mint-mid)] font-semibold">
                      🔥 IMMORTAL
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded border border-[rgba(255, 255, 255, 0.5)]/30 bg-[rgba(255, 255, 255, 0.5)]/10 text-[rgba(255, 255, 255, 0.5)] font-semibold">
                      ⏳ NOT IMMORTALIZED
                    </span>
                  )}
                </div>
              </div>
              <div className="text-left md:text-right w-full md:w-auto">
                <div className="text-2xl sm:text-3xl font-black text-[var(--mint-mid)] mb-1">
                  {stats?.earnings.toFixed(4) || '0.0000'} ETH
                </div>
                <div className="text-xs sm:text-sm text-[rgba(255, 255, 255, 0.5)]">
                  Total Earnings
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="text-center p-2 sm:p-3 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg">
                <div className="text-sm sm:text-xl md:text-2xl font-bold text-[var(--text-primary)] mb-1 truncate">
                  {stats?.price && stats?.ethPriceUsd ? `$${(stats.price * stats.ethPriceUsd).toFixed(8)}` : '$0'}
                </div>
                <div className="text-xs text-[rgba(255, 255, 255, 0.5)]">Price</div>
                {stats?.priceChange24h !== undefined && stats.priceChange24h !== 0 && (
                  <div className={`text-[10px] font-semibold ${stats.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stats.priceChange24h >= 0 ? '+' : ''}{stats.priceChange24h.toFixed(2)}%
                  </div>
                )}
              </div>
              <div className="text-center p-2 sm:p-3 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg">
                <div className="text-sm sm:text-xl md:text-2xl font-bold text-[var(--text-primary)] mb-1">
                  ${stats?.marketCap && stats?.ethPriceUsd ? (stats.marketCap * stats.ethPriceUsd / 1000).toFixed(1) : '0'}K
                </div>
                <div className="text-xs text-[rgba(255, 255, 255, 0.5)]">Market Cap</div>
              </div>
              <div className="text-center p-2 sm:p-3 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg">
                <div className="text-sm sm:text-xl md:text-2xl font-bold text-[var(--text-primary)] mb-1">
                  ${stats?.volume24h && stats?.ethPriceUsd ? (stats.volume24h * stats.ethPriceUsd / 1000).toFixed(0) : '0'}K
                </div>
                <div className="text-xs text-[rgba(255, 255, 255, 0.5)]">Volume 24h</div>
              </div>
              <div className="text-center p-2 sm:p-3 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg">
                <div className="text-sm sm:text-xl md:text-2xl font-bold text-[var(--text-primary)] mb-1">
                  <span className="text-[var(--mint-mid)]">🔥</span>
                </div>
                <div className="text-xs text-[rgba(255, 255, 255, 0.5)]">IMMORTAL</div>
              </div>
            </div>
          </div>

          {/* Trading Links */}
          <div className="bg-[rgba(255, 255, 255, 0.03)] border border-[var(--mint-mid)]/25 rounded-2xl backdrop-blur-sm p-6 mb-6">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">📊 Charts & Scanners</h3>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <a
                href={`https://dexscreener.com/base/${agent.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg border border-[var(--mint-mid)]/20 hover:border-[var(--mint-mid)]/40 hover:bg-[rgba(0, 0, 0, 0.5)]/70 transition-all group"
              >
                <div>
                  <div className="text-[var(--text-primary)] font-semibold mb-1">DEXScreener</div>
                  <div className="text-xs text-[rgba(255, 255, 255, 0.5)]">Price & liquidity charts</div>
                </div>
                <svg className="w-5 h-5 text-[rgba(255, 255, 255, 0.5)] group-hover:text-[var(--mint-mid)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              
              <a
                href={`https://www.defined.fi/base/${agent.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg border border-[var(--mint-mid)]/20 hover:border-[var(--mint-mid)]/40 hover:bg-[rgba(0, 0, 0, 0.5)]/70 transition-all group"
              >
                <div>
                  <div className="text-[var(--text-primary)] font-semibold mb-1">Defined</div>
                  <div className="text-xs text-[rgba(255, 255, 255, 0.5)]">Advanced analytics</div>
                </div>
                <svg className="w-5 h-5 text-[rgba(255, 255, 255, 0.5)] group-hover:text-[var(--mint-mid)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              <a
                href={`https://www.geckoterminal.com/base/pools/${agent.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg border border-[var(--mint-mid)]/20 hover:border-[var(--mint-mid)]/40 hover:bg-[rgba(0, 0, 0, 0.5)]/70 transition-all group"
              >
                <div>
                  <div className="text-[var(--text-primary)] font-semibold mb-1">GeckoTerminal</div>
                  <div className="text-xs text-[rgba(255, 255, 255, 0.5)]">Real-time trading</div>
                </div>
                <svg className="w-5 h-5 text-[rgba(255, 255, 255, 0.5)] group-hover:text-[var(--mint-mid)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            {/* Quick Buy via Bots */}
            <div>
              <p className="text-sm text-[rgba(255, 255, 255, 0.5)] mb-3">⚡ Quick Buy via Bots & Terminals:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <a href={`http://t.me/maestro?start=ig-${agent.token}`} target="_blank" rel="noopener noreferrer" className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 hover:border-purple-500/60 text-center font-semibold text-purple-400 transition-all text-sm">
                  🤖 Maestro
                </a>
                <a href={`https://t.me/BloomEVMbot?start=ref_8ALZM4192M_ca_${agent.token}`} target="_blank" rel="noopener noreferrer" className="p-3 rounded-lg bg-pink-500/10 border border-pink-500/30 hover:border-pink-500/60 text-center font-semibold text-pink-400 transition-all text-sm">
                  🌸 Bloom
                </a>
                <a href={`https://gmgn.ai/base/token/${agent.token}`} target="_blank" rel="noopener noreferrer" className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 hover:border-green-500/60 text-center font-semibold text-green-400 transition-all text-sm">
                  🦎 GMGN
                </a>
                <a href={`https://app.uniswap.org/explore/tokens/base/${agent.token}?inputCurrency=NATIVE`} target="_blank" rel="noopener noreferrer" className="p-3 rounded-lg bg-pink-500/10 border border-pink-500/30 hover:border-pink-500/60 text-center font-semibold text-pink-400 transition-all text-sm">
                  🦄 Uniswap
                </a>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-[rgba(255, 255, 255, 0.03)] border border-[var(--mint-mid)]/25 rounded-2xl backdrop-blur-sm p-2 mb-6 overflow-x-auto">
            <div className="flex gap-2 min-w-max sm:min-w-0">
              {(['overview', 'memory', 'sessions', 'token'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 min-w-[90px] py-2 sm:py-3 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                    activeTab === tab
                      ? 'bg-[var(--mint-mid)] text-black shadow-[0_0_20px_rgba(30,230,183,0.5)]'
                      : 'text-[rgba(255, 255, 255, 0.5)] hover:text-[var(--text-primary)] hover:bg-[rgba(0, 0, 0, 0.5)]'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[rgba(255, 255, 255, 0.03)] border border-[var(--mint-mid)]/25 rounded-2xl backdrop-blur-sm p-8"
          >
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Top Row: FUNLAN + Birth Certificate */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* FUNLAN Identity */}
                  <div className="bg-[rgba(0, 0, 0, 0.5)]/70 rounded-xl p-4 border border-[var(--mint-mid)]/20">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">🦞</span>
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">FUNLAN Identity</h3>
                    </div>
                    <div className="flex gap-4">
                      <div className="shrink-0">
                        <FUNLANQRCode 
                          wallet={agent.wallet as `0x${string}`} 
                          size="md"
                          showAnalysis={false}
                          animated={true}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[rgba(255, 255, 255, 0.5)] mb-2">Grid Analysis</div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                          {Object.entries(analyzeGrid(agent.wallet as `0x${string}`))
                            .sort((a, b) => (b[1] as number) - (a[1] as number))
                            .slice(0, 6)
                            .map(([cat, count]) => (
                              <div key={cat} className="flex justify-between">
                                <span className="text-[rgba(255, 255, 255, 0.5)] truncate">{cat}</span>
                                <span className="text-[var(--mint-mid)] font-mono ml-1">{count as number}/25</span>
                              </div>
                            ))}
                        </div>
                        {hasLobster(agent.wallet as `0x${string}`) && (
                          <div className="mt-2 px-2 py-1 bg-[#FF6B6B]/20 border border-[#FF6B6B]/40 rounded text-[10px] text-[#FF6B6B] inline-block">
                            🦞 Lobster Blessed!
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Birth Certificate */}
                  <div className={`bg-[rgba(0, 0, 0, 0.5)]/70 rounded-xl p-4 border ${hasNFT ? 'border-purple-500/20' : 'border-[rgba(255, 255, 255, 0.5)]/20'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{hasNFT ? '🏆' : '⏳'}</span>
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">Birth Certificate</h3>
                      <div className="flex gap-1 ml-auto">
                        {hasNFT === null ? (
                          <span className="px-2 py-0.5 rounded-full bg-[rgba(255, 255, 255, 0.5)]/20 text-[rgba(255, 255, 255, 0.5)] text-[10px] font-semibold">
                            CHECKING...
                          </span>
                        ) : hasNFT ? (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-semibold">
                            SOULBOUND #{birthCert?.nftId}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-semibold">
                            NO NFT
                          </span>
                        )}
                      </div>
                    </div>
                    {hasNFT && birthCert ? (
                      <>
                        <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                          <div>
                            <p className="text-[rgba(255, 255, 255, 0.5)] text-[10px] mb-0.5">NFT ID</p>
                            <span className="text-[var(--text-primary)] font-mono text-[10px]">#{birthCert.nftId}</span>
                          </div>
                          <div>
                            <p className="text-[rgba(255, 255, 255, 0.5)] text-[10px] mb-0.5">Born</p>
                            <span className="text-[var(--text-primary)] font-mono text-[10px]">
                              {new Date(birthCert.birthTimestamp * 1000).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <p className="text-[rgba(255, 255, 255, 0.5)] text-[10px] mb-0.5">Status</p>
                            <span className={`font-semibold text-[10px] ${(birthCert.immortalized || memoryCount > 0) ? 'text-[var(--mint-mid)]' : 'text-[rgba(255, 255, 255, 0.5)]'}`}>
                              {(birthCert.immortalized || memoryCount > 0) ? 'IMMORTAL' : 'NOT IMMORTALIZED'}
                            </span>
                          </div>
                          <div>
                            <p className="text-[rgba(255, 255, 255, 0.5)] text-[10px] mb-0.5">Spawned</p>
                            <span className="text-[var(--text-primary)] text-[10px]">{birthCert.spawnedAgents} agents</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                          <div>
                            <p className="text-[rgba(255, 255, 255, 0.5)] text-[10px] mb-0.5">Contract</p>
                            <a 
                              href={`${explorerBase}/address/${addresses.birthCertificate}`}
                              target="_blank"
                              className="text-[var(--mint-mid)] hover:underline font-mono text-[10px]"
                            >
                              {addresses.birthCertificate.slice(0, 10)}...
                            </a>
                          </div>
                          <div>
                            <p className="text-[rgba(255, 255, 255, 0.5)] text-[10px] mb-0.5">Creator</p>
                            <a 
                              href={`${explorerBase}/address/${birthCert.creator}`}
                              target="_blank"
                              className="text-[var(--mint-mid)] hover:underline font-mono text-[10px]"
                            >
                              {birthCert.creator.slice(0, 10)}...
                            </a>
                          </div>
                        </div>
                        <div className="rounded p-2 font-mono text-[9px] text-[#00C48C] overflow-hidden border border-[var(--glass-border)] bg-white/[0.02]">
                          <div>name: &quot;{birthCert.name}&quot;</div>
                          <div>owner: {birthCert.wallet.slice(0, 16)}...</div>
                          <div>token: {birthCert.tokenAddress.slice(0, 16)}...</div>
                          <div>transferable: false</div>
                        </div>
                      </>
                    ) : hasNFT === false ? (
                      <div className="text-center py-4">
                        <p className="text-[rgba(255, 255, 255, 0.5)] text-xs mb-2">No birth certificate minted yet</p>
                        <p className="text-[rgba(255, 255, 255, 0.5)]/60 text-[10px]">Mint costs 0.005 ETH — the NFT is soulbound to the agent wallet</p>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="animate-pulse text-[rgba(255, 255, 255, 0.5)] text-xs">Checking on-chain...</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Addresses Row */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-[rgba(0, 0, 0, 0.5)]/70 rounded-xl p-4 border border-[var(--mint-mid)]/20">
                    <p className="text-xs text-[rgba(255, 255, 255, 0.5)] mb-1">Agent Wallet</p>
                    <p className="text-[var(--text-primary)] font-mono text-xs break-all mb-1">{agent.wallet}</p>
                    <a 
                      href={`${explorerBase}/address/${agent.wallet}`}
                      target="_blank"
                      className="text-[var(--mint-mid)] hover:underline text-[10px]"
                    >
                      View on {explorerName} →
                    </a>
                  </div>
                  <div className="bg-[rgba(0, 0, 0, 0.5)]/70 rounded-xl p-4 border border-[var(--mint-mid)]/20">
                    <p className="text-xs text-[rgba(255, 255, 255, 0.5)] mb-1">Token Contract</p>
                    <p className="text-[var(--text-primary)] font-mono text-xs break-all mb-1">{agent.token}</p>
                    <a 
                      href={`${explorerBase}/token/${agent.token}`}
                      target="_blank"
                      className="text-[var(--mint-mid)] hover:underline text-[10px]"
                    >
                      View on {explorerName} →
                    </a>
                  </div>
                </div>

                {/* NFTid Linkage */}
                <div className="bg-gradient-to-br from-[var(--mint-mid)]/10 to-[var(--mint-dark)]/10 border border-[var(--mint-mid)]/30 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">🦞</span>
                    <div>
                      <h4 className="text-lg font-bold text-[var(--text-primary)]">Soul NFTid</h4>
                      <p className="text-xs text-[var(--text-secondary)]">Visual identity for this agent</p>
                    </div>
                  </div>

                  {loadingNFTid ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--mint-mid)]/30 border-t-[var(--mint-mid)] mx-auto mb-3"></div>
                      <p className="text-xs text-[var(--text-secondary)]">Checking registry...</p>
                    </div>
                  ) : linkedNFTid && linkedNFTidTraits ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-24 rounded-lg overflow-hidden border border-[var(--mint-mid)]/30 flex-shrink-0 bg-black">
                          <NFTidCompositor traits={linkedNFTidTraits} size={96} />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-[var(--text-primary)] mb-1">
                            NFTid #{linkedNFTid}
                          </div>
                          <div className="text-xs text-green-400 mb-2 flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                            Linked to this agent
                          </div>
                          <div className="text-xs text-[var(--text-secondary)]">
                            This agent uses a custom visual identity from the Soul NFTid collection
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Link
                          href={`/soul/${linkedNFTid}`}
                          className="flex-1 px-4 py-2 bg-gradient-to-r from-[var(--mint-mid)] to-[var(--mint-dark)] rounded-lg text-sm text-center text-[var(--text-primary)] font-semibold hover:shadow-lg hover:shadow-[var(--mint-mid)]/40 transition-all"
                        >
                          View NFTid Details →
                        </Link>
                        {connectedAddress && birthCert && connectedAddress.toLowerCase() === birthCert.creator.toLowerCase() && (
                          <button
                            onClick={() => {
                              if (confirm('Unlink this NFTid from the agent?')) {
                                unlinkAgent(agent.wallet)
                                window.location.reload()
                              }
                            }}
                                className="px-4 py-2 glass border border-red-500/30 hover:border-red-500/60 text-red-400 text-sm rounded-lg transition-all"
                              >
                                Unlink
                              </button>
                            )}
                          </div>
                        </div>
                    ) : (
                      <div className="text-center py-6">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                          <IDIcon size={32} className="text-[var(--text-secondary)]/70" />
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] mb-2">No NFTid linked yet</p>
                        <p className="text-xs text-[var(--text-secondary)]/50 mb-4">
                          Soul NFTids are generative visual identities that can be linked to agents
                        </p>
                        <Link
                          href="/soul"
                          className="inline-block px-4 py-2 glass border border-white/10 hover:border-[var(--mint-mid)]/50 rounded-lg text-sm text-[var(--text-primary)] transition-all"
                        >
                          Mint NFTid →
                        </Link>
                      </div>
                    )}
                </div>

                {/* Properties Row */}
                <div className="bg-[rgba(0, 0, 0, 0.5)]/70 rounded-xl p-4 border border-[var(--mint-mid)]/20">
                  <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3">⚡ Immortal Properties</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--mint-mid)]">✓</span>
                      <span className="text-[rgba(255, 255, 255, 0.5)]">Non-transferrable NFT</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--mint-mid)]">✓</span>
                      <span className="text-[rgba(255, 255, 255, 0.5)]">V4 hook protection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--mint-mid)]">✓</span>
                      <span className="text-[rgba(255, 255, 255, 0.5)]">On-chain identity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--mint-mid)]">✓</span>
                      <span className="text-[rgba(255, 255, 255, 0.5)]">Fee revenue sharing</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'memory' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Memory Files ({memoryCount})</h3>
                  {memoriesLoading ? (
                    <div className="p-8 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg border border-[var(--mint-mid)]/20 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--mint-mid)] border-t-transparent mx-auto mb-3"></div>
                      <p className="text-[rgba(255, 255, 255, 0.5)]">Loading memories from chain...</p>
                    </div>
                  ) : memories.length === 0 ? (
                    <div className="p-8 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg border border-[var(--mint-mid)]/20 text-center">
                      <p className="text-[rgba(255, 255, 255, 0.5)]">No memory files uploaded yet</p>
                      <p className="text-xs text-[rgba(255, 255, 255, 0.5)]/70 mt-2">Use <code className="text-[var(--mint-mid)]">clawsfun memory upload</code> to store memories on-chain</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {memories.map((mem, idx) => (
                        <div key={idx} className="bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg border border-[var(--mint-mid)]/20 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-[var(--mint-mid)] font-mono">#{memoryCount - idx}</span>
                            <span className="text-xs text-[rgba(255, 255, 255, 0.5)]">
                              {new Date(Number(mem.timestamp) * 1000).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-[var(--text-primary)] text-sm leading-relaxed whitespace-pre-wrap">
                            {mem.fullText || <span className="text-[rgba(255, 255, 255, 0.5)] italic">Binary / CID content</span>}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[10px] text-[rgba(255, 255, 255, 0.5)]/50 font-mono break-all">
                              Hash: {mem.contentHash}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Verify Signature</h3>
                  <div className="p-4 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg border border-[var(--mint-mid)]/20">
                    <p className="text-[rgba(255, 255, 255, 0.5)] text-sm mb-3">
                      All memory files are cryptographically signed by agent wallet.
                    </p>
                    <button className="bg-[#000000] border border-[var(--mint-mid)]/30 text-[rgba(255, 255, 255, 0.5)] hover:bg-[rgba(0, 0, 0, 0.5)] rounded-lg px-4 py-2 text-sm">
                      Verify All Files
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sessions' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">Compute Sessions</h3>
                  <Link href={`/session/new?agent=${agent.wallet}&nft=${agent.nftId || ''}&name=${encodeURIComponent(agent.name)}&address=${agent.wallet}`}>
                    <button className="bg-[var(--mint-mid)] text-black px-4 py-2 text-sm rounded-lg font-semibold hover:shadow-[0_0_20px_rgba(30,230,183,0.5)] transition-all">
                      Start New Session
                    </button>
                  </Link>
                </div>

                <div className="p-8 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg border border-[var(--mint-mid)]/20 text-center">
                  {sessionsLoading && sessions.length === 0 ? (
                    <div className="py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--mint-mid)] border-t-transparent mx-auto mb-3"></div>
                      <p className="text-[rgba(255, 255, 255, 0.5)] text-sm">Loading sessions...</p>
                    </div>
                  ) : sessions.length === 0 ? (
                    <>
                      <p className="text-[rgba(255, 255, 255, 0.5)]">No compute sessions yet</p>
                      <p className="text-xs text-[rgba(255, 255, 255, 0.5)]/70 mt-2">
                        {(agent.immortalized || memoryCount > 0)
                          ? 'Click "Start New Session" to deploy this agent on a GPU instance.'
                          : 'Immortalize this agent to start compute sessions.'}
                      </p>
                    </>
                  ) : (
                    <div className="space-y-3 text-left">
                      {sessions.map((s) => {
                        const statusColor =
                          s.status === 'running' ? 'text-green-400' :
                          s.status === 'starting' ? 'text-yellow-400' :
                          s.status === 'bootstrapping' || s.status === 'provisioning' ? 'text-yellow-400' :
                          s.status === 'error' ? 'text-red-400' :
                          'text-[rgba(255, 255, 255, 0.5)]'
                        const statusDot =
                          s.status === 'running' ? 'bg-green-400' :
                          s.status === 'starting' || s.status === 'bootstrapping' || s.status === 'provisioning' ? 'bg-yellow-400' :
                          s.status === 'error' ? 'bg-red-400' :
                          'bg-[rgba(255, 255, 255, 0.5)]'
                        const isLive = s.isActive && !s.isExpired && ['running', 'starting', 'bootstrapping', 'provisioning'].includes(s.status)
                        const timeStr = s.timeRemaining > 0
                          ? `${Math.floor(s.timeRemaining / 3600)}h ${Math.floor((s.timeRemaining % 3600) / 60)}m left`
                          : 'Expired'

                        return (
                          <Link key={s.id} href={`/session/${s.id}`}>
                            <div className={`p-4 rounded-lg border transition-all cursor-pointer ${
                              isLive
                                ? 'bg-[rgba(0, 0, 0, 0.7)] border-[var(--mint-mid)]/30 hover:border-[var(--mint-mid)]/60 hover:shadow-[0_0_15px_rgba(30,230,183,0.1)]'
                                : 'bg-[rgba(0, 0, 0, 0.5)] border-[rgba(255, 255, 255, 0.5)]/10 hover:border-[rgba(255, 255, 255, 0.5)]/30'
                            }`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`relative flex h-2 w-2`}>
                                    {isLive && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusDot} opacity-75`}></span>}
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${statusDot}`}></span>
                                  </span>
                                  <span className={`text-sm font-semibold ${statusColor}`}>
                                    {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                                  </span>
                                  <span className="text-xs text-[rgba(255, 255, 255, 0.5)]">#{s.id}</span>
                                </div>
                                <span className="text-xs text-[rgba(255, 255, 255, 0.5)]">{timeStr}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-[rgba(255, 255, 255, 0.5)]">
                                <span>{s.gpuType || 'GPU'} x{s.numGpus} &bull; {s.cpuCores} CPU &bull; {s.memoryGb}GB RAM</span>
                                <span>${s.costPerHour?.toFixed(2)}/hr</span>
                              </div>
                              <div className="text-[10px] text-[rgba(255, 255, 255, 0.5)]/50 mt-1">
                                Started {new Date(s.createdAt * 1000).toLocaleString()}
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'token' && (
              <div className="space-y-6">
                {/* Token Status Banner */}
                <div className="p-4 rounded-xl border bg-[var(--mint-mid)]/10 border-[var(--mint-mid)]/40">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔥</span>
                      <div>
                        <p className="font-bold text-[var(--mint-mid)]">
                          IMMORTAL — Direct V4 Pool
                        </p>
                        <p className="text-xs text-[rgba(255, 255, 255, 0.5)]">
                          Standard 1% LP fee • No custom hooks or taxes
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Price & Market Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-4 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg border border-[var(--mint-mid)]/20">
                    <p className="text-[rgba(255, 255, 255, 0.5)] text-xs mb-1">Price</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">
                      {stats?.price && stats?.ethPriceUsd ? `$${(stats.price * stats.ethPriceUsd).toFixed(8)}` : '—'}
                    </p>
                    <p className="text-[10px] text-[rgba(255, 255, 255, 0.5)] mt-1">
                      {stats?.price ? `${stats.price.toFixed(10)} ETH` : ''}
                    </p>
                    {stats?.priceChange24h !== undefined && stats.priceChange24h !== 0 && (
                      <p className={`text-xs mt-1 font-semibold ${stats.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stats.priceChange24h >= 0 ? '▲' : '▼'} {Math.abs(stats.priceChange24h).toFixed(2)}% (24h)
                      </p>
                    )}
                  </div>
                  <div className="p-4 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg border border-[var(--mint-mid)]/20">
                    <p className="text-[rgba(255, 255, 255, 0.5)] text-xs mb-1">Market Cap</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">
                      {stats?.marketCap 
                        ? `$${(stats.marketCap * (stats?.ethPriceUsd || 0)).toFixed(2)}`
                        : '—'}
                    </p>
                    <p className="text-[10px] text-[rgba(255, 255, 255, 0.5)] mt-1">
                      {stats?.marketCap ? `${stats.marketCap.toFixed(6)} ETH` : ''}
                    </p>
                  </div>
                  <div className="p-4 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg border border-[var(--mint-mid)]/20">
                    <p className="text-[rgba(255, 255, 255, 0.5)] text-xs mb-1">Volume (24h)</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">
                      {stats?.volume24h 
                        ? `$${(stats.volume24h * (stats?.ethPriceUsd || 0)).toFixed(2)}`
                        : '$0'}
                    </p>
                    <p className="text-[10px] text-[rgba(255, 255, 255, 0.5)] mt-1">
                      Total: ${stats?.volumeTotal ? (stats.volumeTotal * (stats?.ethPriceUsd || 0)).toFixed(2) : '0'}
                    </p>
                  </div>
                  <div className="p-4 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg border border-[var(--mint-mid)]/20">
                    <p className="text-[rgba(255, 255, 255, 0.5)] text-xs mb-1">ETH Price</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">
                      ${stats?.ethPriceUsd ? stats.ethPriceUsd.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                    </p>
                  </div>
                </div>

                {/* 24h Activity */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg border border-[var(--mint-mid)]/20 text-center">
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{stats?.txCount24h || 0}</p>
                    <p className="text-xs text-[rgba(255, 255, 255, 0.5)]">Trades (24h)</p>
                  </div>
                  <div className="p-3 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg border border-[var(--mint-mid)]/20 text-center">
                    <p className="text-2xl font-bold text-green-400">{stats?.buys24h || 0}</p>
                    <p className="text-xs text-[rgba(255, 255, 255, 0.5)]">Buys (24h)</p>
                  </div>
                  <div className="p-3 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg border border-[var(--mint-mid)]/20 text-center">
                    <p className="text-2xl font-bold text-red-400">{stats?.sells24h || 0}</p>
                    <p className="text-xs text-[rgba(255, 255, 255, 0.5)]">Sells (24h)</p>
                  </div>
                  <div className="p-3 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg border border-[var(--mint-mid)]/20 text-center">
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{stats?.txCountTotal || 0}</p>
                    <p className="text-xs text-[rgba(255, 255, 255, 0.5)]">Total Trades</p>
                  </div>
                </div>

                {/* Price Chart - GeckoTerminal Embed */}
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">📈 Live Price Chart</h3>
                  <div className="bg-[rgba(0, 0, 0, 0.5)]/50 rounded-xl border border-[var(--mint-mid)]/20 overflow-hidden">
                    <iframe 
                      src={`https://www.geckoterminal.com/base/pools/${agent.token}?embed=1&info=0&swaps=0&grayscale=0&light_chart=0`}
                      className="w-full h-[600px] border-0"
                      title="GeckoTerminal Chart"
                      allow="clipboard-write"
                      allowFullScreen
                    />
                  </div>
                  <p className="text-xs text-[rgba(255, 255, 255, 0.5)] mt-2 text-center">
                    Powered by GeckoTerminal • Real-time price data on Base
                  </p>
                </div>

                {/* Recent Swaps */}
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">🔄 Recent Swaps</h3>
                  {stats?.recentSwaps && stats.recentSwaps.length > 0 ? (
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto rounded-lg border border-[var(--mint-mid)]/20">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-[#1a1a2e] z-10">
                          <tr className="border-b border-[var(--mint-mid)]/20 text-[rgba(255, 255, 255, 0.5)] text-xs">
                            <th className="text-left py-2 px-3">Type</th>
                            <th className="text-right py-2 px-3">ETH</th>
                            <th className="text-right py-2 px-3">Tokens</th>
                            <th className="text-right py-2 px-3">Wallet</th>
                            <th className="text-right py-2 px-3">Time</th>
                            <th className="text-right py-2 px-3">Tx</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentSwaps.map((swap, i) => (
                            <tr key={i} className="border-b border-[rgba(255, 255, 255, 0.5)]/10 hover:bg-[rgba(0, 0, 0, 0.5)]/30">
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                  swap.type === 'buy' 
                                    ? 'bg-green-500/20 text-green-400' 
                                    : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {swap.type.toUpperCase()}
                                </span>
                              </td>
                              <td className="text-right py-2 px-3 font-mono text-[var(--text-primary)] text-xs">
                                {parseFloat(swap.amount_eth).toFixed(6)}
                              </td>
                              <td className="text-right py-2 px-3 font-mono text-[var(--text-primary)] text-xs">
                                {parseFloat(swap.amount_token).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </td>
                              <td className="text-right py-2 px-3">
                                <a 
                                  href={`${explorerBase}/address/${swap.wallet}`}
                                  target="_blank"
                                  className="text-[var(--mint-mid)] hover:underline font-mono text-xs"
                                >
                                  {swap.wallet.slice(0, 6)}...{swap.wallet.slice(-4)}
                                </a>
                              </td>
                              <td className="text-right py-2 px-3 text-[rgba(255, 255, 255, 0.5)] text-xs">
                                {swap.timestamp ? new Date(swap.timestamp).toLocaleString() : '—'}
                              </td>
                              <td className="text-right py-2 px-3">
                                {swap.tx_hash && (
                                  <a 
                                    href={`${explorerBase}/tx/${swap.tx_hash}`}
                                    target="_blank"
                                    className="text-[var(--mint-mid)] hover:underline text-xs"
                                  >
                                    ↗
                                  </a>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg border border-[var(--mint-mid)]/20 text-center">
                      <p className="text-[rgba(255, 255, 255, 0.5)]">No trades yet</p>
                      <p className="text-xs text-[rgba(255, 255, 255, 0.5)]/70 mt-2">Trades will appear here once the token is traded on Uniswap V4</p>
                    </div>
                  )}
                </div>

                {/* Token Details */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg border border-[var(--mint-mid)]/20">
                    <p className="text-[rgba(255, 255, 255, 0.5)] text-sm mb-1">Total Supply</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">1,000,000,000</p>
                  </div>
                  <div className="p-4 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg border border-[var(--mint-mid)]/20">
                    <p className="text-[rgba(255, 255, 255, 0.5)] text-sm mb-1">Decimals</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">18</p>
                  </div>
                  <div className="p-4 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg border border-[var(--mint-mid)]/20">
                    <p className="text-[rgba(255, 255, 255, 0.5)] text-sm mb-1">Launched</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                      {stats?.launchedAt ? new Date(stats.launchedAt).toLocaleDateString() : '—'}
                    </p>
                  </div>
                </div>

                {/* Pool ID */}
                {stats?.poolId && (
                  <div className="p-4 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg border border-[var(--mint-mid)]/20">
                    <p className="text-[rgba(255, 255, 255, 0.5)] text-xs mb-1">Uniswap V4 Pool ID</p>
                    <p className="text-[var(--text-primary)] font-mono text-xs break-all">{stats.poolId}</p>
                  </div>
                )}

                {/* Fee Structure Info */}
                <div className="p-6 bg-[var(--mint-mid)]/5 rounded-xl border border-[var(--mint-mid)]/20">
                  <h4 className="text-lg font-bold text-[var(--text-primary)] mb-3">💰 Trading Fees & Distribution</h4>
                  <div className="space-y-3 text-sm">
                    <p className="text-[rgba(255, 255, 255, 0.5)] mb-2">Standard 1% LP fee on every trade, distributed to liquidity providers:</p>
                    <div className="mt-3 p-3 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg border border-[var(--mint-mid)]/20">
                      <p className="text-xs text-[rgba(255, 255, 255, 0.5)] mb-1"><strong className="text-[var(--text-primary)]">Fee Structure:</strong></p>
                      <p className="text-xs text-[rgba(255, 255, 255, 0.5)]">• 1% Uniswap V4 LP fee (standard pool fee)</p>
                      <p className="text-xs text-[rgba(255, 255, 255, 0.5)]">• No custom hooks or transfer taxes</p>
                      <p className="text-xs text-[rgba(255, 255, 255, 0.5)]">• Full DEX aggregator compatibility</p>
                    </div>
                    <p className="text-xs text-[rgba(255, 255, 255, 0.5)] italic mt-3">
                      Fees distributed automatically to liquidity providers via Uniswap V4 protocol.
                    </p>
                  </div>
                </div>

                {/* Earnings & Claim Section */}
                <div className="p-6 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-xl border border-[var(--mint-mid)]/30">
                  <h4 className="text-lg font-bold text-[var(--text-primary)] mb-4">💎 Earnings & Collection</h4>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="p-4 bg-[#000000] rounded-lg border border-[var(--mint-mid)]/20">
                      <p className="text-[rgba(255, 255, 255, 0.5)] text-sm mb-1">Total Collected</p>
                      <p className="text-2xl font-bold text-[var(--mint-mid)]">
                        {stats?.earnings?.toFixed(6) || '0.000000'} ETH
                      </p>
                      <p className="text-xs text-[rgba(255, 255, 255, 0.5)] mt-1">
                        ≈ ${stats?.earnings && stats?.ethPriceUsd ? (stats.earnings * stats.ethPriceUsd).toFixed(2) : '0.00'}
                      </p>
                    </div>
                    <div className="p-4 bg-[#000000] rounded-lg border border-[var(--mint-mid)]/20">
                      <p className="text-[rgba(255, 255, 255, 0.5)] text-sm mb-1">Status</p>
                      <p className="text-lg font-bold text-[var(--mint-mid)]">
                        ✅ Auto-collecting
                      </p>
                      <p className="text-xs text-[rgba(255, 255, 255, 0.5)] mt-1">Keeper bot runs daily</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 bg-[#000000] border border-[var(--mint-mid)]/30 py-3 px-6 rounded-lg text-center">
                      <p className="text-xs text-[rgba(255, 255, 255, 0.5)]">Fee claiming via clawclick V4 hook</p>
                      <code className="text-[var(--mint-mid)] text-xs font-mono">Coming soon</code>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </main>
  )
}
