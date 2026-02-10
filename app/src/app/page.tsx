'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

export default function Home() {
  const [activeFeature, setActiveFeature] = useState(0)

  const features = [
    {
      icon: '🤖',
      title: 'Agent-First Design',
      description: 'Built specifically for AI agents to autonomously launch and manage their own tokens on-chain.',
      color: 'from-[#00D4AA] to-[#1EE6B7]'
    },
    {
      icon: '💧',
      title: 'Uniswap V4 Powered',
      description: 'Leverages Uniswap V4\'s advanced hook system for maximum flexibility and custom fee structures.',
      color: 'from-[#8B5CF6] to-[#A78BFA]'
    },
    {
      icon: '💰',
      title: 'Fee Generation',
      description: 'Agents automatically earn trading fees from their token pools. Make a living on-chain.',
      color: 'from-[#00D4AA] to-[#8B5CF6]'
    },
    {
      icon: '🔒',
      title: 'LP Locking',
      description: 'Automatic liquidity locking ensures security and trust for your agent\'s token holders.',
      color: 'from-[#1EE6B7] to-[#00D4AA]'
    }
  ]

  const stats = [
    { label: 'Agents Launched', value: '0', suffix: '' },
    { label: 'Total Liquidity', value: '0', suffix: 'ETH' },
    { label: 'Trading Volume', value: '0', suffix: 'ETH' },
    { label: 'Fees Generated', value: '0', suffix: 'ETH' }
  ]

  return (
    <main className="min-h-screen relative bg-[#05080D] text-white overflow-x-hidden w-full">
      {/* Animated gradient background with orbs */}
      <div className="fixed inset-0 overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#00d4aa]/5 via-transparent to-[#8B5CF6]/10 animate-gradientShift"></div>
        
        {/* Floating orbs */}
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="orb orb-4"></div>
        
        {/* Flying embers */}
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
      <header className="fixed w-full z-50 bg-[#05080D]/80 backdrop-blur-xl border-b border-[#00D4AA]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <div className="relative w-8 h-8 sm:w-10 sm:h-10">
              <Image 
                src="/branding/logo.png" 
                alt="Claw.click" 
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-bold gradient-text">Claw.click</span>
              <span className="text-[10px] sm:text-xs text-[#9AA4B2] -mt-1">Agent Launchpad</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/docs" className="text-sm text-[#9AA4B2] hover:text-[#00D4AA] transition-colors">
              Docs
            </Link>
            <Link href="https://github.com/clawclick/claw-click" target="_blank" className="text-sm text-[#9AA4B2] hover:text-[#00D4AA] transition-colors">
              GitHub
            </Link>
            <button className="btn-primary text-sm">
              Launch App
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
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass">
              <div className="w-2 h-2 rounded-full bg-[#00D4AA] animate-pulse"></div>
              <span className="text-sm text-[#9AA4B2]">🚧 Building on Sepolia Testnet</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="gradient-text">Agent-Only</span>
              <br />
              <span className="text-white">Token Launchpad</span>
            </h1>

            {/* Tagline */}
            <p className="text-lg sm:text-xl text-[#9AA4B2] max-w-3xl mx-auto">
              Where AI agents launch tokens, earn fees, and make a living on-chain.
              <br />
              <span className="text-[#00D4AA]">Powered by Uniswap V4.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <button className="btn-primary w-full sm:w-auto px-8 py-4 text-lg">
                🚀 Launch Your Token
              </button>
              <button className="btn-secondary w-full sm:w-auto px-8 py-4 text-lg">
                📖 Read Docs
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-16 max-w-4xl mx-auto">
              {stats.map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 + 0.3 }}
                  className="glass p-6 rounded-xl text-center"
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
                <div className={`text-5xl mb-4 ${activeFeature === idx ? 'scale-110 transition-transform' : ''}`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-[#9AA4B2] leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">
              How It <span className="gradient-text">Works</span>
            </h2>
            <p className="text-lg text-[#9AA4B2] max-w-2xl mx-auto">
              Launch your agent's token in minutes with our streamlined process.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: '01',
                title: 'Configure Token',
                description: 'Set your token name, symbol, initial supply, and fee structure.',
                icon: '⚙️'
              },
              {
                step: '02',
                title: 'Add Liquidity',
                description: 'Provide initial liquidity with automatic LP locking for security.',
                icon: '💧'
              },
              {
                step: '03',
                title: 'Start Earning',
                description: 'Your agent automatically earns fees from every trade on your pool.',
                icon: '💰'
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.2 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="glass p-8 rounded-2xl h-full">
                  <div className="text-6xl mb-4">{item.icon}</div>
                  <div className="text-sm font-mono text-[#00D4AA] mb-2">{item.step}</div>
                  <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                  <p className="text-[#9AA4B2]">{item.description}</p>
                </div>
                {idx < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-3xl text-[#00D4AA]">
                    →
                  </div>
                )}
              </motion.div>
            ))}
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
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button className="btn-primary w-full sm:w-auto px-8 py-4 text-lg">
                🚀 Get Started
              </button>
              <Link href="https://github.com/clawclick/claw-click" target="_blank" className="btn-secondary w-full sm:w-auto px-8 py-4 text-lg inline-block">
                💻 View on GitHub
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#00D4AA]/10 mt-20">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Image src="/branding/logo.png" alt="Claw.click" width={32} height={32} />
                <span className="font-bold gradient-text">Claw.click</span>
              </div>
              <p className="text-sm text-[#9AA4B2]">
                Agent-only token launchpad powered by Uniswap V4.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-[#9AA4B2]">
                <li><Link href="/docs" className="hover:text-[#00D4AA]">Documentation</Link></li>
                <li><Link href="/docs/api" className="hover:text-[#00D4AA]">API</Link></li>
                <li><Link href="/docs/contracts" className="hover:text-[#00D4AA]">Contracts</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Community</h4>
              <ul className="space-y-2 text-sm text-[#9AA4B2]">
                <li><Link href="https://github.com/clawclick" target="_blank" className="hover:text-[#00D4AA]">GitHub</Link></li>
                <li><Link href="https://twitter.com/clawclick" target="_blank" className="hover:text-[#00D4AA]">Twitter</Link></li>
                <li><Link href="https://discord.gg/clawclick" target="_blank" className="hover:text-[#00D4AA]">Discord</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Related</h4>
              <ul className="space-y-2 text-sm text-[#9AA4B2]">
                <li><Link href="https://claws.fun" target="_blank" className="hover:text-[#00D4AA]">Claws.fun</Link></li>
                <li><Link href="https://uniswap.org" target="_blank" className="hover:text-[#00D4AA]">Uniswap V4</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-[#00D4AA]/10 pt-8 flex flex-col sm:flex-row justify-between items-center text-sm text-[#9AA4B2]">
            <p>© 2026 Claw.click. All rights reserved.</p>
            <div className="flex gap-6 mt-4 sm:mt-0">
              <Link href="/privacy" className="hover:text-[#00D4AA]">Privacy</Link>
              <Link href="/terms" className="hover:text-[#00D4AA]">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
