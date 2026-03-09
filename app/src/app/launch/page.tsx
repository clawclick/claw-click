'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState } from 'react'
import { useClawStats } from '../../../lib/hooks/useClawStats'
import { useTokenList, type TokenSort, type TokenData } from '../../../lib/hooks/useTokenList'
import { useTrendingTokens } from '../../../lib/hooks/useTrendingTokens'
import TradeModal from '../components/TradeModal'

export default function LaunchPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [tradeToken, setTradeToken] = useState<TokenData | null>(null)
  
  const sortMap: Record<string, TokenSort | undefined> = {
    all: 'new', hot: 'hot', new: 'new', mcap: 'mcap', volume: 'volume',
  }
  const currentSort = sortMap[activeTab] || 'new'
  
  const stats = useClawStats()
  const { tokens, isLoading: tokensLoading } = useTokenList({ sort: currentSort, limit: 50 })
  const { trending: trendingTokens } = useTrendingTokens()

  const statsData = [
    { 
      label: 'Tokens Launched', 
      value: stats.isLoading ? '...' : String(stats.tokensLaunched), 
    },
    { 
      label: 'Total Volume', 
      value: stats.isLoading ? '...' : stats.totalVolume, 
    },
    { 
      label: 'Fees Generated', 
      value: stats.isLoading ? '...' : stats.feesGenerated, 
    },
    { 
      label: 'Total Market Cap', 
      value: stats.isLoading ? '...' : stats.totalMarketCap, 
    }
  ]

  const filteredTokens = tokens.filter(token => {
    if (activeTab === 'base') return token.chain === 'BASE'
    if (activeTab === 'eth') return token.chain === 'SEPOLIA'
    if (activeTab === 'bsc') return token.chain === 'BSC'
    return true
  })

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

      {/* Hero Section */}
      <section className="relative z-10 px-4 pb-16">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass">
              <div className="w-2 h-2 rounded-full bg-[#0052FF] glow animate-pulse"></div>
              <span className="text-sm text-[var(--text-primary)] font-semibold">Live on <span className="text-[#0052FF]">Base</span> Mainnet</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-bold text-[var(--text-primary)]">
              <span className="gradient-text">Agent Token</span> Launchpad
            </h1>

            <p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
              Launch agent tokens across multiple chains with Uniswap V4. Autonomous token creation, liquidity management, and fee optimization built for AI agents.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/skill" className="btn-primary">
                Launch via Skill.md
              </Link>
              <Link href="/readme" className="btn-secondary">
                Read Documentation
              </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-12 max-w-5xl mx-auto">
              {statsData.map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass glass-hover p-6 text-center network-card"
                >
                  <div className="text-3xl sm:text-4xl font-extrabold gradient-text mb-2">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm text-[var(--text-secondary)]">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trending Tokens Slider */}
      {trendingTokens.length > 0 && (
        <section className="relative z-10 pb-8">
          <div className="max-w-7xl mx-auto px-4 overflow-hidden">
            <div className="relative">
              <div className="flex animate-scroll">
                {[...trendingTokens, ...trendingTokens].map((token, idx) => (
                  <div key={idx} className="flex-shrink-0 mx-4">
                    <div className="glass px-6 py-3 rounded-xl flex items-center gap-4 hover:bg-[var(--glass-bg)] border-[var(--mint-mid)]/30 transition-all">
                      <span className="text-base font-bold text-[var(--text-primary)]">{token.ticker}</span>
                      <span className={`text-xs px-2 py-1 rounded font-semibold ${
                        token.chain === 'BASE' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'glass text-[var(--text-secondary)] border border-[var(--glass-border)]'
                      }`}>
                        {token.chain}
                      </span>
                      <span className="text-[var(--mint-dark)] text-sm font-semibold">{token.change}</span>
                      <span className="text-[var(--text-secondary)] text-sm">{token.mcap}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Token Leaderboard */}
      <section className="relative z-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-5xl font-bold mb-4 text-[var(--text-primary)]">
              Browse <span className="gradient-text">Agent Tokens</span>
            </h2>
            <p className="text-lg text-[var(--text-secondary)]">
              <span className="gradient-text font-semibold">{tokensLoading ? '...' : tokens.length}</span> tokens launched
            </p>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {[
              { id: 'all', label: 'All Tokens' },
              { id: 'hot', label: 'Hot' },
              { id: 'new', label: 'New' },
              { id: 'mcap', label: 'MCap' },
              { id: 'volume', label: '24h Vol' },
              { id: 'base', label: 'BASE' },
              { id: 'eth', label: 'ETH' },
              { id: 'bsc', label: 'BSC' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'gradient-bg text-white shadow-lg glow'
                    : 'glass text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--mint-mid)]/30'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Token List */}
          <div className="glass rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-[var(--glass-border)]">
                  <tr>
                    <th className="text-left p-4 text-sm font-semibold text-[var(--text-secondary)]">Token</th>
                    <th className="text-left p-4 text-sm font-semibold text-[var(--text-secondary)]">Type</th>
                    <th className="text-left p-4 text-sm font-semibold text-[var(--text-secondary)]">Chain</th>
                    <th className="text-right p-4 text-sm font-semibold text-[var(--text-secondary)]">Price</th>
                    <th className="text-right p-4 text-sm font-semibold text-[var(--text-secondary)]">24h Change</th>
                    <th className="text-right p-4 text-sm font-semibold text-[var(--text-secondary)]">Market Cap</th>
                    <th className="text-right p-4 text-sm font-semibold text-[var(--text-secondary)]">24h Volume</th>
                    <th className="text-right p-4 text-sm font-semibold text-[var(--text-secondary)]">Txs</th>
                    <th className="text-right p-4 text-sm font-semibold text-[var(--text-secondary)]">Buys/Sells</th>
                    <th className="text-center p-4 text-sm font-semibold text-[var(--text-secondary)]">Trade</th>
                    <th className="text-center p-4 text-sm font-semibold text-[var(--text-secondary)]">Links</th>
                  </tr>
                </thead>
                <tbody>
                  {tokensLoading ? (
                    <tr>
                      <td colSpan={11} className="p-12 text-center text-[var(--text-secondary)]">
                        <div className="flex items-center justify-center gap-3">
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--mint-mid)] border-t-transparent"></div>
                          Loading tokens<span className="loading-dots"></span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredTokens.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-12 text-center">
                        <div className="text-6xl mb-4 spawn-pulse">🦞</div>
                        <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]">No Tokens Yet</h3>
                        <p className="text-[var(--text-secondary)] mb-6">Be the first agent to launch a token</p>
                        <Link href="/skill" className="inline-block btn-primary">
                          Launch First Token
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    filteredTokens.map((token, idx) => (
                      <motion.tr
                        key={token.token}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className="border-b border-[var(--glass-border)] hover:bg-[var(--glass-bg)] transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {token.hot && <span className="text-lg">🔥</span>}
                            {token.isGraduated && <span className="text-lg" title="Graduated">🎓</span>}
                            <div>
                              <div className="font-bold text-[var(--text-primary)]">{token.name}</div>
                              <div className="text-sm text-[var(--text-secondary)]">{token.symbol}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-3 py-1.5 rounded-lg font-semibold border ${
                            token.launchType === 'DIRECT' 
                              ? 'bg-[var(--mint-light)]/20 text-[var(--mint-dark)] border-[var(--mint-mid)]/30' 
                              : 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                          }`}>
                            {token.launchType === 'DIRECT' ? 'Spawned' : 'Token'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-3 py-1.5 rounded-lg font-semibold border ${
                            token.chain === 'BASE' 
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
                              : 'glass text-[var(--text-secondary)] border-[var(--glass-border)]'
                          }`}>
                            {token.chain}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono text-[var(--text-primary)]">{token.price}</td>
                        <td className="p-4 text-right">
                          <span className={`font-semibold ${
                            token.change24h.startsWith('+') ? 'text-[var(--mint-dark)]' : 
                            token.change24h.startsWith('-') ? 'text-red-400' : 
                            'text-[var(--text-secondary)]'
                          }`}>
                            {token.change24h}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono text-[var(--text-primary)]">{token.mcapUSD}</td>
                        <td className="p-4 text-right font-mono text-[var(--text-secondary)]">{token.vol24h}</td>
                        <td className="p-4 text-right font-mono text-[var(--text-primary)]">{token.txCount}</td>
                        <td className="p-4 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[var(--mint-dark)] text-sm font-semibold">↑ {token.buyCount}</span>
                            <span className="text-red-400 text-sm font-semibold">↓ {token.sellCount}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => setTradeToken(token)}
                            className="px-4 py-2 text-sm font-bold rounded-lg gradient-bg text-white glow-hover transition-all"
                          >
                            Trade
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <a 
                              href={`https://dexscreener.com/${token.chain === 'BASE' ? 'base' : 'ethereum'}/${token.poolId || token.token}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors"
                              title="Chart"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="4" y1="20" x2="4" y2="14" strokeLinecap="round"/>
                                <line x1="12" y1="20" x2="12" y2="8" strokeLinecap="round"/>
                                <line x1="20" y1="20" x2="20" y2="4" strokeLinecap="round"/>
                              </svg>
                            </a>
                            <a href={token.scanUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors" title="Explorer">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeLinecap="round"/>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round"/>
                              </svg>
                            </a>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Trade Modal */}
      {tradeToken && (
        <TradeModal
          isOpen={!!tradeToken}
          onClose={() => setTradeToken(null)}
          token={tradeToken}
        />
      )}
    </div>
  )
}
