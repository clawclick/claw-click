'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { getAllAgents, Agent } from '../../lib/agents'
import { getNFTidForAgent } from '../../lib/nftidLinkage'
import NFTidCompositor from '../../components/NFTidCompositor'
import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'
import { ABIS } from '../../lib/contracts'

interface AgentWithNFTid extends Agent {
  nftidTokenId?: number | null
  nftidTraits?: { aura: number; background: number; core: number; eyes: number; overlay: number } | null
}

export default function LiveAgentsList() {
  const [agents, setAgents] = useState<AgentWithNFTid[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Public client for reading NFTid traits
  const sepoliaClient = createPublicClient({
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_ETH_SEPOLIA || 'BdgPEmQddox2due7mrt9J'}`),
  })

  useEffect(() => {
    let pollInterval = 60_000 // 60s default, backs off on error
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

        // Enrich with NFTid data
        const enrichedAgents = await Promise.all(
          fetchedAgents.map(async (agent) => {
            const nftidTokenId = await getNFTidForAgent(agent.wallet)
            if (!nftidTokenId) return { ...agent, nftidTokenId: null, nftidTraits: null }
            
            // Fetch traits from contract
            try {
              const traits = await sepoliaClient.readContract({
                address: '0x6c4618080761925A6D92526c0AA443eF03a92C96' as `0x${string}`,
                abi: ABIS.ClawdNFT,
                functionName: 'getTraits',
                args: [BigInt(nftidTokenId)],
              }) as any

              // Handle both array and object formats
              const parsedTraits = Array.isArray(traits) ? {
                aura: Number(traits[0]),
                background: Number(traits[1]),
                core: Number(traits[2]),
                eyes: Number(traits[3]),
                overlay: Number(traits[4]),
              } : {
                aura: Number(traits.aura),
                background: Number(traits.background),
                core: Number(traits.core),
                eyes: Number(traits.eyes),
                overlay: Number(traits.overlay),
              }

              return {
                ...agent,
                nftidTokenId,
                nftidTraits: parsedTraits,
              }
            } catch (err) {
              console.warn(`Failed to fetch traits for NFTid #${nftidTokenId}:`, err)
              return { ...agent, nftidTokenId, nftidTraits: null }
            }
          })
        )

        setAgents(enrichedAgents)
        pollInterval = 60_000 // reset to normal on success
      } catch (err) {
        console.error('Failed to load agents:', err)
        setError('Failed to load agents from blockchain.')
        // Back off on error: double interval up to 5 minutes
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
    if (chainId === 11155111) return 'Sepolia'
    return 'Unknown'
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#E8523D] border-t-transparent"></div>
          <p className="mt-4 text-white/50">Loading immortalized agents...</p>
        </div>
      </div>
    )
  }

  if (error || agents.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="text-6xl mb-6">🦞</div>
        <h3 className="text-2xl font-bold text-white mb-4">
          {agents.length === 0 ? 'No Agents Yet' : 'Error Loading'}
        </h3>
        <p className="text-white/50 mb-8">{error || 'Be the first to immortalize an agent!'}</p>
        <Link href="/immortal">
          <button className="px-8 py-4 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#E8523D]/30 transition-all">
            Immortalize First Agent →
          </button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Agent Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent, index) => (
          <motion.div
            key={agent.wallet}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <Link href={`/immortal/agent/${agent.wallet}`}>
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-[#E8523D]/50 hover:bg-white/[0.05] hover:shadow-lg hover:shadow-[#E8523D]/20 transition-all cursor-pointer group h-full">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white group-hover:text-[#E8523D] transition-colors mb-1">
                      {agent.name}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white/40 font-mono text-sm">${agent.symbol}</span>
                      <span className="text-xs px-2 py-1 rounded border border-blue-500/30 bg-blue-500/10 text-blue-400 font-semibold">
                        {getChainName(agent.chainId)}
                      </span>
                      {agent.creatorType && (
                        <span className="text-xs px-2 py-1 rounded border border-purple-500/30 bg-purple-500/10 text-purple-400">
                          {agent.creatorType === 'human' ? '👤 Human' : '🤖 Agent'}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* NFTid or Lobster */}
                  <div className="flex-shrink-0">
                    {agent.nftidTraits ? (
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-[#E8523D]/30">
                        <NFTidCompositor traits={agent.nftidTraits} size={64} />
                      </div>
                    ) : (
                      <div className="text-3xl">🦞</div>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/40">Price</span>
                    <span className="text-base font-semibold text-white">
                      {agent.priceUsd ? `$${agent.priceUsd < 0.01 ? agent.priceUsd.toFixed(8) : agent.priceUsd.toFixed(4)}` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/40">Market Cap</span>
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
                    <span className="text-sm text-white/40">Earnings</span>
                    <span className="text-base font-semibold text-[#E8523D]">
                      {(agent.earnings ?? 0).toFixed(4)} ETH
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="py-3 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Birth: {agent.birthBlock.toString()}</span>
                    <span className="text-xs px-2 py-1 rounded bg-[#E8523D]/10 text-[#E8523D] font-semibold">
                      IMMORTAL 🔥
                    </span>
                  </div>
                </div>

                {/* Addresses */}
                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-white/30">Wallet:</span>
                    <span className="text-white/50 font-mono">
                      {agent.wallet.slice(0, 6)}...{agent.wallet.slice(-4)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/30">Token:</span>
                    <span className="text-white/50 font-mono">
                      {agent.token.slice(0, 6)}...{agent.token.slice(-4)}
                    </span>
                  </div>
                </div>

                {/* View Button */}
                <div className="mt-4">
                  <div className="w-full py-2 text-center text-sm font-medium text-[#E8523D] bg-[#E8523D]/10 rounded-lg group-hover:bg-[#E8523D]/20 transition-all">
                    View Dashboard →
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Create CTA */}
      <div className="text-center pt-8">
        <Link href="/immortal">
          <button className="px-8 py-4 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-white font-semibold rounded-lg hover:shadow-xl hover:shadow-[#E8523D]/30 transition-all">
            + Immortalize Your Agent
          </button>
        </Link>
      </div>
    </div>
  )
}
