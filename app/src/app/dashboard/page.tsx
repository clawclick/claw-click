'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { DashboardIcon } from '../../components/home/ProductIcons'
import Image from 'next/image'
import { FireIcon, RocketIcon, GPUIcon, EmptyStateIcon } from '../../components/DashboardIcons'
import { getAgentsByCreator, Agent } from '../../lib/agents'

export default function DashboardPage() {
  const { address, isConnected } = useAccount()
  const [loading, setLoading] = useState(true)
  const [myAgents, setMyAgents] = useState<Agent[]>([])

  useEffect(() => {
    async function loadMyAgents() {
      if (!address) {
        setMyAgents([])
        setLoading(false)
        return
      }
      try {
        const userAgents = await getAgentsByCreator(address)
        setMyAgents(userAgents)
      } catch (err) {
        console.error('[Dashboard] Failed to load agents:', err)
      } finally {
        setLoading(false)
      }
    }

    setLoading(true)
    loadMyAgents()
  }, [address])

  // Calculate total earnings
  const totalEarnings = myAgents.reduce((sum, agent) => sum + (agent.earnings || 0), 0)
  const totalMarketCap = myAgents.reduce((sum, agent) => sum + (agent.mcapUsd || 0), 0)

  if (!isConnected) {
    return (
      <div className="min-h-screen relative pt-32 pb-20">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
          <div className="orb orb-4"></div>
        </div>

        <section className="relative z-10 px-4 flex items-center justify-center min-h-[60vh]">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 mb-6 text-[var(--mint-mid)]">
                <DashboardIcon />
              </div>
              
              <h1 className="text-5xl font-bold text-[var(--text-primary)]">
                <span className="gradient-text">User Dashboard</span>
              </h1>

              <p className="text-xl text-[var(--text-secondary)] max-w-xl mx-auto">
                Connect your wallet to view your spawned agents, earnings, and portfolio
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
    <div className="min-h-screen relative pt-32 pb-20">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="orb orb-4"></div>
        
        <div className="network-particle network-particle-1"></div>
        <div className="network-particle network-particle-2"></div>
        <div className="network-particle network-particle-3"></div>
        <div className="network-particle network-particle-4"></div>
        <div className="network-particle network-particle-5"></div>
        <div className="network-particle network-particle-6"></div>
      </div>

      {/* Header */}
      <section className="relative z-10 px-4 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 text-[var(--text-primary)]">
                <span className="gradient-text">Dashboard</span>
              </h1>
              <p className="text-[var(--text-secondary)]">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/immortal/create?type=human" className="btn-primary text-sm">
                + Spawn Agent
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
            <div className="glass p-6">
              <p className="text-[var(--text-secondary)] text-sm mb-1">Total Agents</p>
              <p className="text-4xl font-bold text-[var(--text-primary)]">{myAgents.length}</p>
            </div>

            <div className="glass p-6">
              <p className="text-[var(--text-secondary)] text-sm mb-1">Total Earnings</p>
              <p className="text-4xl font-bold gradient-text">{totalEarnings.toFixed(4)} ETH</p>
            </div>

            <div className="glass p-6">
              <p className="text-[var(--text-secondary)] text-sm mb-1">Portfolio Value</p>
              <p className="text-4xl font-bold text-[var(--text-primary)]">
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
          <h2 className="text-2xl font-bold mb-6 text-[var(--text-primary)]">My Agents</h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--mint-mid)] border-t-transparent mx-auto mb-4"></div>
              <p className="text-[var(--text-secondary)]">Loading your agents<span className="loading-dots"></span></p>
            </div>
          ) : myAgents.length === 0 ? (
            <div className="glass p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 mb-6 text-[var(--text-secondary)]/30">
                <EmptyStateIcon />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">No Agents Yet</h3>
              <p className="text-[var(--text-secondary)] mb-6">Spawn your first agent to get started</p>
              <Link href="/immortal/create?type=human" className="inline-block btn-primary">
                Spawn Agent →
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myAgents.map((agent) => (
                <motion.div
                  key={agent.wallet}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Link href={`/spawner/agent/${agent.wallet}`} className="block glass glass-hover p-6 cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--mint-dark)] transition-colors mb-1">
                          {agent.name}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[var(--text-secondary)] font-mono text-sm">${agent.symbol}</span>
                          <span className="text-xs px-2 py-1 rounded-full bg-[var(--mint-light)]/20 text-[var(--mint-dark)] font-semibold border border-[var(--mint-mid)]/30">
                            SPAWNED
                          </span>
                        </div>
                      </div>
                      <div className="w-12 h-12 flex-shrink-0">
                        <Image
                          src="/branding/lobster_icon_exact_size-rem_bk.png"
                          alt="Agent"
                          width={48}
                          height={48}
                          className="object-contain opacity-80 hover:opacity-100 transition-opacity"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[var(--text-secondary)]">Price</span>
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          {agent.priceUsd ? `$${agent.priceUsd.toFixed(6)}` : '—'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[var(--text-secondary)]">Market Cap</span>
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          {agent.mcapUsd 
                            ? agent.mcapUsd >= 1_000 
                              ? `$${(agent.mcapUsd / 1_000).toFixed(1)}K`
                              : `$${agent.mcapUsd.toFixed(0)}`
                            : '$0'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[var(--text-secondary)]">Earnings</span>
                        <span className="text-sm font-semibold gradient-text">
                          {(agent.earnings ?? 0).toFixed(4)} ETH
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
                      <div className="text-xs text-[var(--text-secondary)]/50">
                        {agent.wallet.slice(0, 10)}...{agent.wallet.slice(-8)}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="relative z-10 px-4 pt-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-[var(--text-primary)]">Quick Actions</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/immortal/create?type=human" className="glass glass-hover p-6 group">
              <div className="w-10 h-10 mb-4 text-[var(--mint-mid)] group-hover:scale-110 transition-transform">
                <FireIcon />
              </div>
              <h3 className="text-lg font-bold mb-2 text-[var(--text-primary)]">Spawn Agent</h3>
              <p className="text-sm text-[var(--text-secondary)]">Create a new spawned agent with tokenization</p>
            </Link>

            <Link href="/launch" className="glass glass-hover p-6 group">
              <div className="w-10 h-10 mb-4 text-[var(--mint-mid)] group-hover:scale-110 transition-transform">
                <RocketIcon />
              </div>
              <h3 className="text-lg font-bold mb-2 text-[var(--text-primary)]">Launch Token</h3>
              <p className="text-sm text-[var(--text-secondary)]">Launch a new token on the multichain launchpad</p>
            </Link>

            <Link href="/compute" className="glass glass-hover p-6 group">
              <div className="w-10 h-10 mb-4 text-[var(--mint-mid)] group-hover:scale-110 transition-transform">
                <GPUIcon />
              </div>
              <h3 className="text-lg font-bold mb-2 text-[var(--text-primary)]">GPU Compute</h3>
              <p className="text-sm text-[var(--text-secondary)]">Rent GPU instances for your agents</p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
