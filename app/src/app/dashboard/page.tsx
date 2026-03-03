'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { DashboardIcon } from '../../components/home/ProductIcons'
import { getAllAgents, Agent } from '../../lib/agents'

export default function DashboardPage() {
  const { address, isConnected } = useAccount()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [myAgents, setMyAgents] = useState<Agent[]>([])

  useEffect(() => {
    async function loadAgents() {
      try {
        const allAgents = await getAllAgents()
        setAgents(allAgents)
        
        if (address) {
          // Filter agents created by connected wallet
          const userAgents = allAgents.filter(
            a => a.creator.toLowerCase() === address.toLowerCase()
          )
          setMyAgents(userAgents)
        }
      } catch (err) {
        console.error('Failed to load agents:', err)
      } finally {
        setLoading(false)
      }
    }

    loadAgents()
  }, [address])

  // Calculate total earnings
  const totalEarnings = myAgents.reduce((sum, agent) => sum + (agent.earnings || 0), 0)
  const totalMarketCap = myAgents.reduce((sum, agent) => sum + (agent.mcapUsd || 0), 0)

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black text-white pt-32 pb-20">
        <div className="fixed inset-0 overflow-hidden z-[2]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#E8523D]/3 via-black to-black"></div>
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
        </div>

        <section className="relative z-10 px-4 flex items-center justify-center min-h-[60vh]">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 mb-6 text-[#E8523D]">
                <DashboardIcon />
              </div>
              
              <h1 className="text-5xl font-bold">
                <span className="gradient-text">User Dashboard</span>
              </h1>

              <p className="text-xl text-white/50 max-w-xl mx-auto">
                Connect your wallet to view your immortalized agents, earnings, and portfolio
              </p>

              <div className="pt-8">
                <ConnectButton />
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden z-[2]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E8523D]/3 via-black to-black"></div>
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>

      {/* Header */}
      <section className="relative z-10 px-4 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                <span className="gradient-text">Dashboard</span>
              </h1>
              <p className="text-white/50">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/immortal/create?type=human" className="px-6 py-3 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-[#E8523D]/30 transition-all">
                + Create Agent
              </Link>
              <ConnectButton />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Overview */}
      <section className="relative z-10 px-4 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
              <p className="text-white/50 text-sm mb-1">Total Agents</p>
              <p className="text-4xl font-bold text-white">{myAgents.length}</p>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
              <p className="text-white/50 text-sm mb-1">Total Earnings</p>
              <p className="text-4xl font-bold text-[#E8523D]">{totalEarnings.toFixed(4)} ETH</p>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
              <p className="text-white/50 text-sm mb-1">Portfolio Value</p>
              <p className="text-4xl font-bold text-white">
                ${totalMarketCap >= 1_000 
                  ? `${(totalMarketCap / 1_000).toFixed(1)}K`
                  : totalMarketCap.toFixed(0)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* My Agents */}
      <section className="relative z-10 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">My Agents</h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#E8523D] border-t-transparent mx-auto mb-4"></div>
              <p className="text-white/50">Loading your agents...</p>
            </div>
          ) : myAgents.length === 0 ? (
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-12 text-center">
              <div className="text-6xl mb-4">🦞</div>
              <h3 className="text-2xl font-bold mb-2">No Agents Yet</h3>
              <p className="text-white/50 mb-6">Create your first immortalized agent to get started</p>
              <Link href="/immortal/create?type=human" className="inline-block px-6 py-3 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-[#E8523D]/30 transition-all">
                Create Agent →
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myAgents.map((agent) => (
                <Link key={agent.wallet} href={`/immortal/agent/${agent.wallet}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-[#E8523D]/50 hover:shadow-lg hover:shadow-[#E8523D]/20 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white group-hover:text-[#E8523D] transition-colors mb-1">
                          {agent.name}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white/40 font-mono text-sm">${agent.symbol}</span>
                          <span className="text-xs px-2 py-1 rounded bg-[#E8523D]/10 text-[#E8523D] font-semibold">
                            IMMORTAL 🔥
                          </span>
                        </div>
                      </div>
                      <div className="text-3xl">🦞</div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-white/40">Price</span>
                        <span className="text-sm font-semibold text-white">
                          {agent.priceUsd ? `$${agent.priceUsd.toFixed(6)}` : '—'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-white/40">Market Cap</span>
                        <span className="text-sm font-semibold text-white">
                          {agent.mcapUsd 
                            ? agent.mcapUsd >= 1_000 
                              ? `$${(agent.mcapUsd / 1_000).toFixed(1)}K`
                              : `$${agent.mcapUsd.toFixed(0)}`
                            : '$0'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-white/40">Earnings</span>
                        <span className="text-sm font-semibold text-[#E8523D]">
                          {(agent.earnings ?? 0).toFixed(4)} ETH
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5">
                      <div className="text-xs text-white/30">
                        {agent.wallet.slice(0, 10)}...{agent.wallet.slice(-8)}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="relative z-10 px-4 pt-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/immortal/create?type=human" className="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-[#E8523D]/50 hover:shadow-lg hover:shadow-[#E8523D]/20 transition-all">
              <div className="text-3xl mb-3">🔥</div>
              <h3 className="text-lg font-bold mb-2">Immortalize Agent</h3>
              <p className="text-sm text-white/50">Create a new immortalized agent with tokenization</p>
            </Link>

            <Link href="/launch" className="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-[#E8523D]/50 hover:shadow-lg hover:shadow-[#E8523D]/20 transition-all">
              <div className="text-3xl mb-3">🚀</div>
              <h3 className="text-lg font-bold mb-2">Launch Token</h3>
              <p className="text-sm text-white/50">Launch a new token on the multichain launchpad</p>
            </Link>

            <Link href="/compute" className="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-[#E8523D]/50 hover:shadow-lg hover:shadow-[#E8523D]/20 transition-all">
              <div className="text-3xl mb-3">🖥️</div>
              <h3 className="text-lg font-bold mb-2">GPU Compute</h3>
              <p className="text-sm text-white/50">Rent GPU instances for your agents</p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
