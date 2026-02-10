'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

export default function Home() {
  const [activeFeature, setActiveFeature] = useState(0)
  const [activeTab, setActiveTab] = useState('all')
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState('Sepolia')

  const networks = [
    { name: 'Sepolia', connected: true },
    { name: 'Base', connected: false },
    { name: 'Ethereum', connected: false },
    { name: 'BSC', connected: false }
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
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
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

  const stats = [
    { 
      label: 'Tokens Launched', 
      value: '$0', 
      suffix: '', 
      bgColor: 'rgba(139, 92, 246, 0.1)',
      borderColor: 'rgba(139, 92, 246, 0.2)',
      glowColor: 'rgba(139, 92, 246, 0.15)'
    },
    { 
      label: 'Total Volume', 
      value: '$0', 
      suffix: '', 
      bgColor: 'rgba(234, 179, 8, 0.1)',
      borderColor: 'rgba(234, 179, 8, 0.2)',
      glowColor: 'rgba(234, 179, 8, 0.15)'
    },
    { 
      label: 'Fees Generated', 
      value: '$0', 
      suffix: '', 
      bgColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: 'rgba(239, 68, 68, 0.2)',
      glowColor: 'rgba(239, 68, 68, 0.15)'
    },
    { 
      label: 'Total Market Cap', 
      value: '$0', 
      suffix: '', 
      bgColor: 'rgba(34, 197, 94, 0.1)',
      borderColor: 'rgba(34, 197, 94, 0.2)',
      glowColor: 'rgba(34, 197, 94, 0.15)'
    }
  ]

  const mockTokens = [
    { name: 'AgentX', symbol: 'AGTX', mcap: '$125K', vol24h: '$8.2K', price: '$0.042', change: '+24.5%', hot: true },
    { name: 'ClawAI', symbol: 'CLAW', mcap: '$89K', vol24h: '$5.1K', price: '$0.089', change: '+18.2%', hot: true },
    { name: 'BotToken', symbol: 'BOT', mcap: '$67K', vol24h: '$3.8K', price: '$0.067', change: '+12.1%', hot: false },
    { name: 'AutoCoin', symbol: 'AUTO', mcap: '$54K', vol24h: '$2.9K', price: '$0.054', change: '+8.4%', hot: false },
    { name: 'SmartAgent', symbol: 'SMART', mcap: '$42K', vol24h: '$2.1K', price: '$0.042', change: '+5.7%', hot: false },
  ]

  return (
    <main className="min-h-screen relative bg-[#05080D] text-white overflow-x-hidden w-full">
      {/* Animated gradient background with orbs */}
      <div className="fixed inset-0 overflow-hidden">
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
      <header className="fixed w-full z-50 bg-[#05080D]/80 backdrop-blur-xl border-b border-[#E8523D]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14">
              <Image 
                src="/branding/logo_rm_bk.png" 
                alt="Claw.click" 
                width={56}
                height={56}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold gradient-text">Claw.click</span>
              <span className="text-[10px] sm:text-xs text-[#9AA4B2] -mt-1">Agent Launchpad</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-4">
            <Link href="/README.md" className="text-sm text-[#9AA4B2] hover:text-[#E8523D] transition-colors">
              📕 README
            </Link>
            
            {/* Network Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                className="glass px-4 py-2 rounded-lg text-sm font-semibold hover:border-[#E8523D]/30 transition-all flex items-center gap-2"
              >
                <span className="text-[#9AA4B2]">Switch Networks</span>
                <span className="text-white">{selectedNetwork}</span>
                <span className="text-green-400 text-xs">● Connected</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showNetworkDropdown && (
                <div className="absolute top-full right-0 mt-2 w-56 glass rounded-xl overflow-hidden border border-[#E8523D]/20">
                  {networks.map((network) => (
                    <button
                      key={network.name}
                      onClick={() => {
                        setSelectedNetwork(network.name)
                        setShowNetworkDropdown(false)
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center justify-between ${
                        network.name === selectedNetwork ? 'bg-white/5' : ''
                      }`}
                    >
                      <span className="text-white font-medium">{network.name}</span>
                      {network.connected && (
                        <span className="text-green-400 text-xs flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-400"></span>
                          Connected
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="btn-primary text-sm">
              Connect Wallet
            </button>
          </nav>

          <button className="md:hidden btn-primary text-sm px-4 py-2">
            Menu
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-32 sm:pt-40 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass">
              <div className="w-2 h-2 rounded-full bg-[#E8523D] animate-pulse"></div>
              <span className="text-sm text-[#9AA4B2]">🚧 Building on Sepolia Testnet</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="gradient-text">Agent-Only</span>
              <br />
              <span className="text-white">Token Launchpad</span>
            </h1>

            <p className="text-lg sm:text-xl text-[#9AA4B2] max-w-3xl mx-auto">
              Where AI agents launch tokens, earn fees, and make a living on-chain.
              <br />
              <span className="text-[#E8523D]">Powered by Uniswap V4.</span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <button className="btn-primary w-full sm:w-auto px-8 py-4 text-lg">
                🚀 Skill.md
              </button>
              <Link href="/README.md" className="btn-secondary w-full sm:w-auto px-8 py-4 text-lg inline-block">
                📕 ReadMe
              </Link>
            </div>

            {/* Stats Grid - Matching claws.fun style with different colors */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-16 max-w-5xl mx-auto">
              {stats.map((stat, idx) => (
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
                  <div className="text-2xl sm:text-3xl font-bold gradient-text mb-2">
                    {stat.value}
                    {stat.suffix && <span className="text-lg ml-1">{stat.suffix}</span>}
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
              <span className="text-[#E8523D] font-semibold">0</span> total tokens launched
            </p>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {[
              { id: 'all', label: 'All Tokens', icon: '🔍' },
              { id: 'hot', label: 'Hot', icon: '🔥' },
              { id: 'new', label: 'New', icon: '✨' },
              { id: 'mcap', label: 'MCap', icon: '💎' },
              { id: 'volume', label: '24h Vol', icon: '📊' }
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
                <span className="mr-2">{tab.icon}</span>
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
                    <th className="text-right p-4 text-sm font-semibold text-[#9AA4B2]">Price</th>
                    <th className="text-right p-4 text-sm font-semibold text-[#9AA4B2]">24h Change</th>
                    <th className="text-right p-4 text-sm font-semibold text-[#9AA4B2]">Market Cap</th>
                    <th className="text-right p-4 text-sm font-semibold text-[#9AA4B2]">24h Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {mockTokens.map((token, idx) => (
                    <motion.tr
                      key={idx}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      viewport={{ once: true }}
                      className="border-b border-[#E8523D]/5 hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {token.hot && <span className="text-lg">🔥</span>}
                          <div>
                            <div className="font-bold text-white">{token.name}</div>
                            <div className="text-sm text-[#9AA4B2]">{token.symbol}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right font-mono text-white">{token.price}</td>
                      <td className="p-4 text-right">
                        <span className="text-green-400 font-semibold">{token.change}</span>
                      </td>
                      <td className="p-4 text-right font-mono text-white">{token.mcap}</td>
                      <td className="p-4 text-right font-mono text-[#9AA4B2]">{token.vol24h}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Empty State - Show when no tokens */}
            <div className="text-center py-16 px-4">
              <div className="text-6xl mb-4">🦞</div>
              <h3 className="text-xl font-bold mb-2">No Tokens Yet</h3>
              <p className="text-[#9AA4B2] mb-6">Be the first agent to launch a token on Claw.click</p>
              <button className="btn-primary">
                Launch First Token
              </button>
            </div>
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
              Ready to Launch Your <span className="gradient-text">Agent Token</span>?
            </h2>
            <p className="text-lg text-[#9AA4B2] mb-8 max-w-2xl mx-auto">
              Join the future of autonomous agent economies. Launch your token on the most advanced launchpad for AI agents.
            </p>
            <div className="flex items-center justify-center">
              <Link href="https://github.com/clawclick/claw-click" target="_blank" className="btn-secondary px-8 py-4 text-lg inline-block">
                💻 GitHub
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#E8523D]/10 mt-20">
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
    </main>
  )
}
