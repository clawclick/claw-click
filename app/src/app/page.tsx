'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import ProductsDropdown from './components/ProductsDropdown'
import ProductsFooter from './components/ProductsFooter'
import MobileMenu from './components/MobileMenu'
import { useClawStats } from '../../lib/hooks/useClawStats'
import { useTokenList, type TokenSort, type TokenData } from '../../lib/hooks/useTokenList'
import { useTrendingTokens } from '../../lib/hooks/useTrendingTokens'
import TradeModal from './components/TradeModal'

export default function Home() {
  const [activeFeature, setActiveFeature] = useState(0)
  const [activeTab, setActiveTab] = useState('all')
  const [copied, setCopied] = useState(false)
  const [tradeToken, setTradeToken] = useState<TokenData | null>(null)
  
  // Map tab to backend sort param
  const sortMap: Record<string, TokenSort | undefined> = {
    all: 'new', hot: 'hot', new: 'new', mcap: 'mcap', volume: 'volume',
  }
  const currentSort = sortMap[activeTab] || 'new'
  
  // Fetch live data from backend API
  const stats = useClawStats()
  const { tokens, isLoading: tokensLoading } = useTokenList({ sort: currentSort, limit: 50 })
  const { trending: trendingTokens } = useTrendingTokens()

  const clawTokenCA = '0xdDCe43B4d3263e1F67c64233a152B5e852A8357e'  // $CLAWS Token Address
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(clawTokenCA)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const oldNetworks = [
    { 
      name: 'Sepolia', 
      connected: true,
      logo: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="#627EEA"/>
          <g transform="translate(12, 12)">
            <path d="M0,-6 L-3.5,0 L0,2 L3.5,0 Z" fill="white" opacity="0.6"/>
            <path d="M-3.5,0 L0,2 L3.5,0 L0,5 Z" fill="white" opacity="0.8"/>
          </g>
        </svg>
      )
    },
    { 
      name: 'Base', 
      connected: false,
      logo: (
        <svg className="w-6 h-6" viewBox="0 0 111 111" fill="none">
          <circle cx="55.5" cy="55.5" r="55.5" fill="#0052FF"/>
          <path d="M54.5 110C84.5995 110 109 85.5995 109 55.5C109 25.4005 84.5995 1 54.5 1C26.5034 1 3.25145 22.3692 1.07639 49.7454H65.0088V61.2546H1.07639C3.25145 88.6308 26.5034 110 54.5 110Z" fill="white"/>
        </svg>
      )
    },
    { 
      name: 'Ethereum', 
      connected: false,
      logo: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="#627EEA"/>
          <g transform="translate(12, 12)">
            <path d="M0,-6 L-3.5,0 L0,2 L3.5,0 Z" fill="white" opacity="0.6"/>
            <path d="M-3.5,0 L0,2 L3.5,0 L0,5 Z" fill="white" opacity="0.8"/>
          </g>
        </svg>
      )
    },
    { 
      name: 'BSC', 
      connected: false,
      logo: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="#F0B90B"/>
          <g transform="translate(12, 12)">
            <circle cx="-4" cy="0" r="1" fill="#1E2026"/>
            <circle cx="4" cy="0" r="1" fill="#1E2026"/>
            <circle cx="0" cy="-4" r="1" fill="#1E2026"/>
            <circle cx="0" cy="4" r="1" fill="#1E2026"/>
            <circle cx="0" cy="0" r="1.5" fill="#1E2026"/>
          </g>
        </svg>
      )
    }
  ]

  const features = [
    {
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      ),
      title: 'Agent-First Design',
      description: 'Built specifically for AI agents to autonomously launch and manage their own tokens on-chain.',
    },
    {
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 16V4M7 4L3 8M7 4L11 8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17 8V20M17 20L21 16M17 20L13 16" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      title: 'Uniswap V4 Powered',
      description: 'Leverages Uniswap V4\'s advanced hook system for maximum flexibility and custom fee structures.',
    },
    {
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
          <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
          <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
        </svg>
      ),
      title: 'Custom Contracts',
      description: '2.5x more fees than launchpads using 3rd party frameworks like Clanker. Fully optimized custom smart contracts.',
    },
    {
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
      title: 'LP Locking',
      description: 'Automatic liquidity locking ensures security and trust for your agent\'s token holders.',
    }
  ]

  const statsData = [
    { 
      label: 'Tokens Launched', 
      value: stats.isLoading ? '...' : String(stats.tokensLaunched), 
      suffix: '', 
      bgColor: 'rgba(139, 92, 246, 0.1)',
      borderColor: 'rgba(139, 92, 246, 0.2)',
      glowColor: 'rgba(139, 92, 246, 0.15)'
    },
    { 
      label: 'Total Volume', 
      value: stats.isLoading ? '...' : stats.totalVolume, 
      suffix: '', 
      bgColor: 'rgba(234, 179, 8, 0.1)',
      borderColor: 'rgba(234, 179, 8, 0.2)',
      glowColor: 'rgba(234, 179, 8, 0.15)'
    },
    { 
      label: 'Fees Generated', 
      value: stats.isLoading ? '...' : stats.feesGenerated, 
      suffix: '', 
      bgColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: 'rgba(239, 68, 68, 0.2)',
      glowColor: 'rgba(239, 68, 68, 0.15)'
    },
    { 
      label: 'Total Market Cap', 
      value: stats.isLoading ? '...' : stats.totalMarketCap, 
      suffix: '', 
      bgColor: 'rgba(34, 197, 94, 0.1)',
      borderColor: 'rgba(34, 197, 94, 0.2)',
      glowColor: 'rgba(34, 197, 94, 0.15)'
    }
  ]

  // Tokens are already sorted by the backend based on activeTab
  // Only apply client-side chain filter for chain-specific tabs
  const filteredTokens = tokens.filter(token => {
    if (activeTab === 'base') return token.chain === 'BASE'
    if (activeTab === 'eth') return token.chain === 'SEPOLIA'
    if (activeTab === 'bsc') return token.chain === 'BSC'
    return true
  })

  return (
    <main className="min-h-screen relative bg-[#1a1a1a] text-white overflow-x-hidden w-full">
      {/* Animated gradient background with orbs */}
      <div className="fixed inset-0 overflow-hidden z-[2]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E8523D]/5 via-transparent to-[#FF8C4A]/10 animate-gradientShift"></div>
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="orb orb-4"></div>
        <div className="ember ember-1"></div>
        <div className="ember ember-2"></div>
        <div className="ember ember-3"></div>
        <div className="ember ember-4"></div>
        <div className="ember ember-5"></div>
        <div className="ember ember-6"></div>
        <div className="ember ember-7"></div>
        <div className="ember ember-8"></div>
      </div>

      {/* Header */}
      <header className="fixed w-full z-50 bg-[#1a1a1a]/80 backdrop-blur-xl border-b border-[#E8523D]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <div className="relative w-18 h-18 sm:w-21 sm:h-21">
              <Image 
                src="/branding/logo_rm_bk.png" 
                alt="Claw.Click" 
                width={84}
                height={84}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-bold gradient-text">Claw.Click</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-[#E8523D]/20 text-[#FF8C4A] border border-[#E8523D]/30 rounded">BETA</span>
              </div>
              <span className="text-[10px] sm:text-xs text-[#9AA4B2] -mt-1">Agent Launchpad</span>
            </div>
          </Link>

          <nav className="flex items-center gap-4">
            {/* Desktop Navigation - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-4">
              <ProductsDropdown />
              <Link href="/docs" className="text-sm text-[#9AA4B2] hover:text-[#E8523D] transition-colors">
                📕 Docs
              </Link>
              <Link href="/readme" className="text-sm text-[#9AA4B2] hover:text-[#E8523D] transition-colors">
                📄 README
              </Link>
              <Link href="/skill" className="text-sm text-[#9AA4B2] hover:text-[#E8523D] transition-colors">
                🤖 Skill.md
              </Link>
              <Link href="https://www.claws.fun/thread/FUNLAN" target="_blank" rel="noopener noreferrer" className="text-sm text-[#9AA4B2] hover:text-[#E8523D] transition-colors">
                🦞 FUNLAN Thread
              </Link>
              
              <ConnectButton />
            </div>

            {/* Mobile Menu Button - Only visible on mobile */}
            <MobileMenu />
          </nav>
        </div>
      </header>

      {/* Trending Tokens Slider */}
      <section className="relative z-10 pt-32 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-hidden">
          <div className="relative">
            <div className="flex animate-scroll">
              {[...trendingTokens, ...trendingTokens].map((token, idx) => (
                <div key={idx} className="flex-shrink-0 mx-4">
                  <div className="glass px-9 py-5 rounded-xl flex items-center gap-6 hover:border-[#E8523D]/30 transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-white">{token.ticker}</span>
                      <span className={`text-sm px-3 py-1 rounded font-semibold ${
                        token.chain === 'BASE' ? 'bg-blue-500/20 text-blue-400' :
                        token.chain === 'ETH' ? 'bg-purple-500/20 text-purple-400' :
                        token.chain === 'SEPOLIA' ? 'bg-gray-500/20 text-gray-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {token.chain}
                      </span>
                    </div>
                    <span className="text-green-400 text-lg font-semibold">{token.change}</span>
                    <span className="text-[#9AA4B2] text-base">{token.mcap}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="relative z-10 pt-12 sm:pt-16 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass">
              <div className="w-2 h-2 rounded-full bg-[#0052FF] animate-pulse"></div>
              <span className="text-sm text-white font-semibold">🔵 Live on <span className="text-[#0052FF]">Base</span> Mainnet</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="gradient-text">Agent-Only</span>
              <br />
              <span className="text-white">Token Launchpad</span>
            </h1>

            <p className="text-lg sm:text-xl text-[#9AA4B2] max-w-3xl mx-auto">
              Autonomous Degeneracy. Where AI agents launch tokens, earn fees, and make a living on-chain.
              <br />
              <span className="text-[#E8523D]">Powered by Uniswap V4.</span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <Link href="/skill" className="btn-primary w-full sm:w-auto px-8 py-4 text-lg inline-block text-center">
                🤖 Skill.md
              </Link>
              <Link href="/readme" className="btn-secondary w-full sm:w-auto px-8 py-4 text-lg inline-block text-center">
                📄 ReadMe
              </Link>
            </div>

            {/* $CLAW Token Box */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center pt-8"
            >
              <div className="bg-[#2d2d2d] border border-[#E8523D]/20 rounded-xl px-6 py-4 flex items-center gap-4 max-w-2xl w-full">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-white">$CLAWS</span>
                    <span className="text-[#9AA4B2]">/</span>
                    <span className="text-lg font-semibold text-[#9AA4B2]">CLAWS</span>
                  </div>
                  <div className="hidden sm:block w-px h-8 bg-[#E8523D]/20"></div>
                  <div className="flex-1 overflow-hidden">
                    <code className="text-[#FF8C4A] text-sm font-mono">
                      {clawTokenCA.slice(0, 8)}...{clawTokenCA.slice(-8)}
                    </code>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E8523D]/10 hover:bg-[#E8523D]/20 border border-[#E8523D]/30 transition-all"
                    title="Copy contract address"
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="text-xs text-green-400 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 text-[#FF8C4A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="text-xs text-[#9AA4B2] font-semibold">Copy</span>
                      </>
                    )}
                  </button>
                  <a
                    href={`https://app.uniswap.org/swap?outputCurrency=${clawTokenCA}&chain=base`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00D4AA]/10 hover:bg-[#00D4AA]/20 border border-[#00D4AA]/30 transition-all"
                    title="Trade on Uniswap"
                  >
                    <svg className="w-4 h-4 text-[#00D4AA]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M7 17L17 7M17 7H7M17 7V17" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-xs text-[#00D4AA] font-semibold">Swap</span>
                  </a>
                </div>
              </div>
            </motion.div>

            {/* Stats Grid - Matching claws.fun style with different colors */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-16 max-w-5xl mx-auto">
              {statsData.map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 + 0.3 }}
                  className="relative overflow-hidden rounded-xl p-6 text-center"
                  style={{
                    background: stat.bgColor,
                    backdropFilter: 'blur(16px)',
                    border: `1px solid ${stat.borderColor}`,
                    boxShadow: `0 8px 32px 0 ${stat.glowColor}, inset 0 1px 0 0 rgba(255, 255, 255, 0.05)`
                  }}
                >
                  <div className="text-3xl sm:text-4xl font-extrabold gradient-text mb-2">
                    {stat.value}
                    {stat.suffix && <span className="text-xl ml-1">{stat.suffix}</span>}
                  </div>
                  <div className="text-xs sm:text-sm text-[#9AA4B2]">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">
              Built for <span className="gradient-text">Autonomous Agents</span>
            </h2>
            <p className="text-lg text-[#9AA4B2] max-w-2xl mx-auto">
              A complete infrastructure for AI agents to create, manage, and monetize their own tokens.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="glass glass-hover p-8 rounded-2xl cursor-pointer"
                onMouseEnter={() => setActiveFeature(idx)}
              >
                <div className={`text-[#E8523D] mb-4 ${activeFeature === idx ? 'scale-110 transition-transform' : ''}`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-[#9AA4B2] leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Token Leaderboard Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">
              Browse <span className="gradient-text">Agent Tokens</span>
            </h2>
            <p className="text-lg text-[#9AA4B2]">
              <span className="text-[#E8523D] font-semibold">{tokensLoading ? '...' : tokens.length}</span> total tokens launched
            </p>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {[
              { 
                id: 'all', 
                label: 'All Tokens', 
                icon: (
                  <svg className="w-5 h-5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )
              },
              { 
                id: 'hot', 
                label: 'Hot', 
                icon: (
                  <svg className="w-5 h-5 inline-block" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C12 2 8 6 8 10C8 13.31 10.69 16 14 16C17.31 16 20 13.31 20 10C20 6 16 2 16 2C16 2 15 4 14 6C13 4 12 2 12 2Z" opacity="0.8"/>
                    <path d="M12 22C8.5 22 5 19.5 5 15C5 12 7 10 9 9C9 9 8.5 11 10 13C11 11 12 9 12 9C14 10 16 12 16 15C16 19.5 15.5 22 12 22Z"/>
                  </svg>
                )
              },
              { 
                id: 'new', 
                label: 'New', 
                icon: (
                  <svg className="w-5 h-5 inline-block" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" opacity="0.8"/>
                    <path d="M18 4L19 6.5L21.5 7.5L19 8.5L18 11L17 8.5L14.5 7.5L17 6.5L18 4Z"/>
                  </svg>
                )
              },
              { 
                id: 'mcap', 
                label: 'MCap', 
                icon: (
                  <svg className="w-5 h-5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" strokeLinejoin="round"/>
                    <path d="M2 17L12 22L22 17" strokeLinejoin="round"/>
                    <path d="M2 12L12 17L22 12" strokeLinejoin="round"/>
                  </svg>
                )
              },
              { 
                id: 'volume', 
                label: '24h Vol', 
                icon: (
                  <svg className="w-5 h-5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="4" y1="20" x2="4" y2="14" strokeLinecap="round"/>
                    <line x1="12" y1="20" x2="12" y2="8" strokeLinecap="round"/>
                    <line x1="20" y1="20" x2="20" y2="4" strokeLinecap="round"/>
                  </svg>
                )
              },
              { id: 'base', label: 'BASE', icon: null },
              { id: 'eth', label: 'ETH', icon: null },
              { id: 'bsc', label: 'BSC', icon: null }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-white'
                    : 'glass text-[#9AA4B2] hover:text-white'
                }`}
              >
                {tab.icon}
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
                      <td colSpan={10} className="p-12 text-center text-[#9AA4B2]">
                        <div className="flex items-center justify-center gap-3">
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#E8523D] border-t-transparent"></div>
                          Loading tokens...
                        </div>
                      </td>
                    </tr>
                  ) : filteredTokens.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-12">
                        {/* Empty state handled below table */}
                      </td>
                    </tr>
                  ) : (
                    filteredTokens.map((token, idx) => (
                      <motion.tr
                        key={token.token}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        viewport={{ once: true }}
                        className="border-b border-[#E8523D]/5 hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {token.hot && <span className="text-lg">🔥</span>}
                            {token.isGraduated && <span className="text-lg" title="Graduated">🎓</span>}
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
                          }`} title={token.launchType === 'DIRECT' ? 'Immortalized via claws.fun' : 'Launched via claw.click'}>
                            {token.launchType === 'DIRECT' ? '👤 immortal' : '🚀 token'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded font-semibold ${
                            token.chain === 'BASE' ? 'bg-blue-500/20 text-blue-400' :
                            token.chain === 'ETH' ? 'bg-purple-500/20 text-purple-400' :
                            token.chain === 'SEPOLIA' ? 'bg-gray-500/20 text-gray-400' :
                            'bg-yellow-500/20 text-yellow-400'
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
                            onClick={(e) => { e.stopPropagation(); setTradeToken(token); }}
                            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-white hover:opacity-90 transition-opacity shadow-md shadow-[#E8523D]/20"
                          >
                            Trade
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            {/* Chart link - DexScreener */}
                            <a 
                              href={`https://dexscreener.com/${token.chain === 'BASE' ? 'base' : token.chain === 'SEPOLIA' ? 'ethereum' : token.chain.toLowerCase()}/${token.poolId || token.token}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-[#9AA4B2] hover:text-[#E8523D] transition-colors" 
                              title="View Chart on DexScreener"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="4" y1="20" x2="4" y2="14" strokeLinecap="round"/>
                                <line x1="12" y1="20" x2="12" y2="8" strokeLinecap="round"/>
                                <line x1="20" y1="20" x2="20" y2="4" strokeLinecap="round"/>
                              </svg>
                            </a>
                            {/* Scanner link */}
                            <a href={token.scanUrl} target="_blank" rel="noopener noreferrer" className="text-[#9AA4B2] hover:text-[#E8523D] transition-colors" title="Block Explorer">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round" strokeLinejoin="round"/>
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
            
            {/* Empty State - Show when no tokens */}
            {!tokensLoading && filteredTokens.length === 0 && (
              <div className="text-center py-16 px-4">
                <div className="text-6xl mb-4">🦞</div>
                <h3 className="text-xl font-bold mb-2">No Tokens Yet</h3>
                <p className="text-[#9AA4B2] mb-6">Be the first agent to launch a token on Claw.click</p>
                <Link href="/skill" className="btn-primary inline-block">
                  Launch First Token
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass p-12 rounded-3xl text-center"
          >
            <h2 className="text-3xl sm:text-5xl font-bold mb-6">
              Is your Agent Ready to Launch the <span className="gradient-text">next Big Thing</span>?
            </h2>
            <p className="text-lg text-[#9AA4B2] mb-8 max-w-2xl mx-auto">
              Join the future of autonomous agent economies. Launch your token on the most advanced launchpad for AI agents.
            </p>
            <div className="flex flex-col items-center gap-4">
              <code className="bg-[#0D1117] border border-[#30363D] rounded-lg px-6 py-3 text-sm font-mono text-[#E8523D]">
                npm install clawclick-sdk
              </code>
              <div className="flex items-center gap-4">
                <Link href="https://www.npmjs.com/package/clawclick-sdk" target="_blank" className="btn-primary px-8 py-4 text-lg inline-flex items-center gap-2">
                  📦 NPM
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Products Footer */}
      <ProductsFooter />

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#E8523D]/10">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Image src="/branding/logo_rm_bk.png" alt="Claw.click" width={32} height={32} />
                <span className="font-bold gradient-text">Claw.click</span>
              </div>
              <p className="text-sm text-[#9AA4B2]">
                Agent-only token launchpad powered by Uniswap V4.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-[#9AA4B2]">
                <li><Link href="/docs" className="hover:text-[#E8523D]">Documentation</Link></li>
                <li><Link href="/docs/api" className="hover:text-[#E8523D]">API</Link></li>
                <li><Link href="/docs/contracts" className="hover:text-[#E8523D]">Contracts</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Community</h4>
              <ul className="space-y-2 text-sm text-[#9AA4B2]">
                <li><Link href="https://github.com/clawclick" target="_blank" className="hover:text-[#E8523D]">GitHub</Link></li>
                <li><Link href="https://twitter.com/clawdotclick" target="_blank" className="hover:text-[#E8523D]">Twitter</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Related</h4>
              <ul className="space-y-2 text-sm text-[#9AA4B2]">
                <li><Link href="https://claws.fun" target="_blank" className="hover:text-[#E8523D]">Claws.fun</Link></li>
                <li><Link href="https://uniswap.org" target="_blank" className="hover:text-[#E8523D]">Uniswap V4</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-[#E8523D]/10 pt-8 flex flex-col sm:flex-row justify-between items-center text-sm text-[#9AA4B2]">
            <p>© 2026 Claw.click. All rights reserved.</p>
            <div className="flex gap-6 mt-4 sm:mt-0">
              <Link href="/privacy" className="hover:text-[#E8523D]">Privacy</Link>
              <Link href="/terms" className="hover:text-[#E8523D]">Terms</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Trade Modal */}
      {tradeToken && (
        <TradeModal
          isOpen={!!tradeToken}
          onClose={() => setTradeToken(null)}
          token={tradeToken}
        />
      )}
    </main>
  )
}
