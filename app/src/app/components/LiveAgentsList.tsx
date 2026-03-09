'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { getAllAgents, Agent } from '../../lib/agents'
import { getNFTidForAgent } from '../../lib/nftidLinkage'
import NFTidCompositor from '../../components/NFTidCompositor'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { ABIS } from '../../lib/contracts'

interface AgentWithNFTid extends Agent {
  nftidTokenId?: number | null
  nftidTraits?: { aura: number; background: number; core: number; eyes: number; overlay: number } | null
}

export default function LiveAgentsList() {
  const [agents, setAgents] = useState<AgentWithNFTid[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const baseClient = createPublicClient({
    chain: base,
    transport: http(`https://eth-base.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_ETH_base || 'BdgPEmQddox2due7mrt9J'}`),
  })

  useEffect(() => {
    let pollInterval = 60_000
    let timer: ReturnType<typeof setTimeout>

    async function loadAgents() {
      try {
        setLoading(true)
        setError(null)
        const fetchedAgents = await getAllAgents()
        if (fetchedAgents.length === 0) {
          setError('No agents deployed yet. Be the first!')
          setAgents([])
          return
        }
        const enrichedAgents = await Promise.all(
          fetchedAgents.map(async (agent) => {
            const nftidTokenId = await getNFTidForAgent(agent.wallet)
            if (!nftidTokenId) return { ...agent, nftidTokenId: null, nftidTraits: null }
            try {
              const traits = await baseClient.readContract({
                address: '0x553016FA9Ead8ACFa1d96220901f1e91EEB135f4' as `0x${string}`,
                abi: ABIS.ClawdNFT,
                functionName: 'getTraits',
                args: [BigInt(nftidTokenId)],
              }) as any
              const parsedTraits = Array.isArray(traits) ? {
                aura: Number(traits[0]), background: Number(traits[1]),
                core: Number(traits[2]), eyes: Number(traits[3]), overlay: Number(traits[4]),
              } : {
                aura: Number(traits.aura), background: Number(traits.background),
                core: Number(traits.core), eyes: Number(traits.eyes), overlay: Number(traits.overlay),
              }
              return { ...agent, nftidTokenId, nftidTraits: parsedTraits }
            } catch {
              return { ...agent, nftidTokenId, nftidTraits: null }
            }
          })
        )
        setAgents(enrichedAgents)
        pollInterval = 60_000
      } catch {
        setError('Failed to load agents from blockchain.')
        pollInterval = Math.min(pollInterval * 2, 300_000)
      } finally {
        setLoading(false)
        timer = setTimeout(loadAgents, pollInterval)
      }
    }

    loadAgents()
    return () => clearTimeout(timer)
  }, [])

  const getChainName = (chainId?: number) => {
    if (chainId === 8453) return 'Base'
    return 'Unknown'
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[var(--mint-mid)] border-t-transparent mx-auto"></div>
          <p className="mt-4 text-[var(--text-secondary)]">Loading spawned agents<span className="loading-dots"></span></p>
        </div>
      </div>
    )
  }

  if (error || agents.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="text-6xl mb-6 spawn-pulse">🦞</div>
        <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          {agents.length === 0 ? 'No Agents Yet' : 'Error Loading'}
        </h3>
        <p className="text-[var(--text-secondary)] mb-8">{error || 'Be the first to spawn an agent!'}</p>
        <Link href="/immortal">
          <button className="btn-primary">Spawn First Agent →</button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Agent Cards - Dark green glassy */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent, index) => (
          <motion.div
            key={agent.wallet}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <Link href={`/immortal/agent/${agent.wallet}`}>
              <div className="agent-card group h-full cursor-pointer">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white group-hover:text-[var(--mint-light)] transition-colors mb-1">
                      {agent.name}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white/60 font-mono text-sm">${agent.symbol}</span>
                      <span className="text-xs px-2 py-1 rounded border border-[var(--mint-mid)]/50 bg-[var(--mint-dark)]/20 text-[var(--mint-light)] font-semibold">
                        {getChainName(agent.chainId)}
                      </span>
                      {agent.creatorType && (
                        <span className="text-xs px-2 py-1 rounded border border-white/20 bg-white/10 text-white/70">
                          {agent.creatorType === 'human' ? '👤 Human' : '🤖 Agent'}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* NFTid or Lobster */}
                  <div className="flex-shrink-0">
                    {agent.nftidTraits ? (
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-[var(--mint-mid)]/40">
                        <NFTidCompositor traits={agent.nftidTraits} size={64} />
                      </div>
                    ) : (
                      <Image
                        src="/branding/lobster_icon_exact_size-rem_bk.png"
                        alt="Agent"
                        width={48}
                        height={48}
                        className="object-contain opacity-80"
                      />
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/50">Price</span>
                    <span className="text-base font-semibold text-white">
                      {agent.priceUsd ? `$${agent.priceUsd < 0.01 ? agent.priceUsd.toFixed(8) : agent.priceUsd.toFixed(4)}` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/50">Market Cap</span>
                    <span className="text-base font-semibold text-white">
                      {agent.mcapUsd 
                        ? agent.mcapUsd >= 1_000_000 
                          ? `$${(agent.mcapUsd / 1_000_000).toFixed(2)}M`
                          : agent.mcapUsd >= 1_000
                            ? `$${(agent.mcapUsd / 1_000).toFixed(1)}K`
                            : `$${agent.mcapUsd.toFixed(0)}`
                        : '$0'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/50">Earnings</span>
                    <span className="text-base font-semibold text-[var(--mint-light)]">
                      {(agent.earnings ?? 0).toFixed(4)} ETH
                    </span>
                  </div>
                </div>

                {/* Status + Addresses */}
                <div className="py-3 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/40">Birth: {agent.birthBlock.toString()}</span>
                    <span className="text-xs px-2 py-1 rounded bg-[var(--mint-dark)]/30 text-[var(--mint-light)] font-semibold border border-[var(--mint-mid)]/30">
                      SPAWNED 🦞
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-white/30">Wallet:</span>
                      <span className="text-white/60 font-mono">{agent.wallet.slice(0, 6)}...{agent.wallet.slice(-4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/30">Token:</span>
                      <span className="text-white/60 font-mono">{agent.token.slice(0, 6)}...{agent.token.slice(-4)}</span>
                    </div>
                  </div>
                </div>

                {/* View Button */}
                <div className="mt-4 w-full py-2 text-center text-sm font-medium text-[var(--mint-light)] bg-[var(--mint-dark)]/20 rounded-lg group-hover:bg-[var(--mint-dark)]/40 transition-all border border-[var(--mint-mid)]/30">
                  View Dashboard →
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Create CTA */}
      <div className="text-center pt-8">
        <Link href="/immortal/create">
          <button className="btn-primary">+ Spawn Your Agent</button>
        </Link>
      </div>
    </div>
  )
}
