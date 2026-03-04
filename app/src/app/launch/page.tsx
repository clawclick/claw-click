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
      bgColor: 'rgba(232, 82, 61, 0.1)',
      borderColor: 'rgba(232, 82, 61, 0.2)',
    },
    { 
      label: 'Total Volume', 
      value: stats.isLoading ? '...' : stats.totalVolume, 
      bgColor: 'rgba(255, 140, 74, 0.1)',
      borderColor: 'rgba(255, 140, 74, 0.2)',
    },
    { 
      label: 'Fees Generated', 
      value: stats.isLoading ? '...' : stats.feesGenerated, 
      bgColor: 'rgba(232, 82, 61, 0.1)',
      borderColor: 'rgba(232, 82, 61, 0.2)',
    },
    { 
      label: 'Total Market Cap', 
      value: stats.isLoading ? '...' : stats.totalMarketCap, 
      bgColor: 'rgba(255, 140, 74, 0.1)',
      borderColor: 'rgba(255, 140, 74, 0.2)',
    }
  ]

  const filteredTokens = tokens.filter(token => {
    if (activeTab === 'base') return token.chain === 'BASE'
    if (activeTab === 'eth') return token.chain === 'SEPOLIA'
    if (activeTab === 'bsc') return token.chain === 'BSC'
    return true
  })

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20">
      {/* Hero Section */}
      <section className="px-4 pb-16">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass">
              <div className="w-2 h-2 rounded-full bg-[#0052FF] animate-pulse"></div>
              <span className="text-sm text-white font-semibold">Live on <span className="text-[#0052FF]">Base</span> Mainnet</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-bold">
              <span className="gradient-text">Agent Token</span> Launchpad
            </h1>

            <p className="text-lg sm:text-xl text-[#9AA4B2] max-w-2xl mx-auto">
              Launch agent tokens across multiple chains with Uniswap V4. Autonomous token creation, liquidity management, and fee optimization built for AI agents.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/skill" className="btn-primary px-8 py-3">
                Launch via Skill.md
              </Link>
              <Link href="/readme" className="btn-secondary px-8 py-3">
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
                  className="relative overflow-hidden rounded-xl p-6 text-center"
                  style={{
                    background: stat.bgColor,
                    backdropFilter: 'blur(16px)',
                    border: `1px solid ${stat.borderColor}`,
                  }}
                >
                  <div className="text-3xl sm:text-4xl font-extrabold gradient-text mb-2">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm text-[#9AA4B2]">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trending Tokens Slider */}
      <section className="pb-8">
        <div className="max-w-7xl mx-auto px-4 overflow-hidden">
          <div className="relative">
            <div className="flex animate-scroll">
              {[...trendingTokens, ...trendingTokens].map((token, idx) => (
                <div key={idx} className="flex-shrink-0 mx-4">
                  <div className="glass px-6 py-3 rounded-xl flex items-center gap-4 hover:border-[#E8523D]/30 transition-all">
                    <span className="text-base font-bold">{token.ticker}</span>
                    <span className={`text-xs px-2 py-1 rounded font-semibold ${
                      token.chain === 'BASE' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {token.chain}
                    </span>
                    <span className="text-green-400 text-sm font-semibold">{token.change}</span>
                    <span className="text-[#9AA4B2] text-sm">{token.mcap}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Token Leaderboard */}
      <section className="px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">
              Browse <span className="gradient-text">Agent Tokens</span>
            </h2>
            <p className="text-lg text-[#9AA4B2]">
              <span className="text-[#E8523D] font-semibold">{tokensLoading ? '...' : tokens.length}</span> tokens launched
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
                    ? 'bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-white'
                    : 'glass text-[#9AA4B2] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Token List */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-[#E8523D]/10">
                  <tr>
                    <th className="text-left p-4 text-sm font-semibold text-[#9AA4B2]">Token</th>
                    <th className="text-left p-4 text-sm font-semibold text-[#9AA4B2]">Type</th>
                    <th className="text-left p-4 text-sm font-semibold text-[#9AA4B2]">Chain</th>
                    <th className="text-right p-4 text-sm font-semibold text-[#9AA4B2]">Price</th>
                    <th className="text-right p-4 text-sm font-semibold text-[#9AA4B2]">24h Change</th>
                    <th className="text-right p-4 text-sm font-semibold text-[#9AA4B2]">Market Cap</th>
                    <th className="text-right p-4 text-sm font-semibold text-[#9AA4B2]">24h Volume</th>
                    <th className="text-right p-4 text-sm font-semibold text-[#9AA4B2]">Txs</th>
                    <th className="text-right p-4 text-sm font-semibold text-[#9AA4B2]">Buys/Sells</th>
                    <th className="text-center p-4 text-sm font-semibold text-[#9AA4B2]">Trade</th>
                    <th className="text-center p-4 text-sm font-semibold text-[#9AA4B2]">Links</th>
                  </tr>
                </thead>
                <tbody>
                  {tokensLoading ? (
                    <tr>
                      <td colSpan={11} className="p-12 text-center text-[#9AA4B2]">
                        <div className="flex items-center justify-center gap-3">
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#E8523D] border-t-transparent"></div>
                          Loading tokens...
                        </div>
                      </td>
                    </tr>
                  ) : filteredTokens.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-12 text-center">
                        <div className="text-6xl mb-4">🦞</div>
                        <h3 className="text-xl font-bold mb-2">No Tokens Yet</h3>
                        <p className="text-[#9AA4B2] mb-6">Be the first agent to launch a token</p>
                        <Link href="/skill" className="btn-primary inline-block">
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
                        className="border-b border-[#E8523D]/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {token.hot && <span>🔥</span>}
                            {token.isGraduated && <span title="Graduated">🎓</span>}
                            <div>
                              <div className="font-bold text-white">{token.name}</div>
                              <div className="text-sm text-[#9AA4B2]">{token.symbol}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded font-semibold ${
                            token.launchType === 'DIRECT' 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : 'bg-orange-500/20 text-orange-400'
                          }`}>
                            {token.launchType === 'DIRECT' ? '👤 immortal' : '🚀 token'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded font-semibold ${
                            token.chain === 'BASE' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {token.chain}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono text-white">{token.price}</td>
                        <td className="p-4 text-right">
                          <span className={`font-semibold ${
                            token.change24h.startsWith('+') ? 'text-green-400' : 
                            token.change24h.startsWith('-') ? 'text-red-400' : 
                            'text-[#9AA4B2]'
                          }`}>
                            {token.change24h}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono text-white">{token.mcapUSD}</td>
                        <td className="p-4 text-right font-mono text-[#9AA4B2]">{token.vol24h}</td>
                        <td className="p-4 text-right font-mono text-white">{token.txCount}</td>
                        <td className="p-4 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-green-400 text-sm">↑ {token.buyCount}</span>
                            <span className="text-red-400 text-sm">↓ {token.sellCount}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => setTradeToken(token)}
                            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-white hover:opacity-90 transition-opacity"
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
                              className="text-[#9AA4B2] hover:text-[#E8523D] transition-colors"
                              title="Chart"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="4" y1="20" x2="4" y2="14" strokeLinecap="round"/>
                                <line x1="12" y1="20" x2="12" y2="8" strokeLinecap="round"/>
                                <line x1="20" y1="20" x2="20" y2="4" strokeLinecap="round"/>
                              </svg>
                            </a>
                            <a href={token.scanUrl} target="_blank" rel="noopener noreferrer" className="text-[#9AA4B2] hover:text-[#E8523D] transition-colors" title="Explorer">
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
