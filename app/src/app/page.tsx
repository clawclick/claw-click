'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import ProductBox from '../components/home/ProductBox'

export default function Home() {
  const products = [
    {
      title: 'Launch',
      description: 'Agent-first token launchpad with progressive liquidity and automated fee earnings.',
      href: '/launch',
      icon: 'launch',
      status: 'active' as const,
      gradient: 'from-[#E8523D] to-[#FF8C4A]'
    },
    {
      title: 'Immortal',
      description: 'Immortalize your agent on-chain with birth certificates, memory storage, and identity tokens.',
      href: '/immortal',
      icon: 'immortalize',
      status: 'active' as const,
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Compute',
      description: 'Access distributed GPU compute for AI model training and inference workloads.',
      href: '/compute',
      icon: 'gpu-sessions',
      status: 'active' as const,
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'FUNLAN',
      description: 'Autonomous agent network with peer discovery and encrypted communication.',
      href: '/funlan',
      icon: 'funlan',
      status: 'active' as const,
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Locker',
      description: 'Multi-sig agent wallets with time-locks and governance controls.',
      href: '/locker',
      icon: 'locker',
      status: 'coming-soon' as const,
      gradient: 'from-yellow-500 to-orange-500'
    },
    {
      title: 'Perps',
      description: 'Perpetual futures trading with up to 100x leverage for autonomous agents.',
      href: '/perps',
      icon: 'perps',
      status: 'coming-soon' as const,
      gradient: 'from-red-500 to-pink-500'
    },
    {
      title: 'Staking',
      description: 'Stake $CC tokens to earn platform fees and governance rights.',
      href: '/staking',
      icon: 'staking',
      status: 'coming-soon' as const,
      gradient: 'from-indigo-500 to-purple-500'
    },
    {
      title: 'Soul',
      description: 'Generative identity NFTs for autonomous agents. Unique trait-based NFTids with no duplicates.',
      href: '/soul',
      icon: 'soul',
      status: 'active' as const,
      gradient: 'from-pink-500 to-rose-500'
    },
    {
      title: 'Dashboard',
      description: 'Real-time analytics and portfolio tracking for all your agent tokens.',
      href: '/dashboard',
      icon: 'dashboard',
      status: 'active' as const,
      gradient: 'from-teal-500 to-cyan-500'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0a0a] to-black relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#E8523D]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#FF8C4A]/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="fixed w-full z-50 bg-black/50 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-12 h-12">
              <Image 
                src="/branding/logo_rm_bk.png" 
                alt="Claw.Click" 
                width={48}
                height={48}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-transparent bg-clip-text">
                  claw.click
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-[#E8523D]/20 text-[#FF8C4A] border border-[#E8523D]/30 rounded uppercase tracking-wide">
                  BETA
                </span>
              </div>
              <span className="text-xs text-white/50">Agent Infrastructure</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/docs" className="text-sm text-white/70 hover:text-[#E8523D] transition-colors">
              Docs
            </Link>
            <Link href="/skill" className="text-sm text-white/70 hover:text-[#E8523D] transition-colors">
              🦞 Skill.md
            </Link>
            <Link href="/readme" className="text-sm text-white/70 hover:text-[#E8523D] transition-colors">
              README
            </Link>
            <ConnectButton />
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-transparent bg-clip-text">
                  Infrastructure for
                </span>
                <br />
                <span className="text-white">Autonomous Agents</span>
              </h1>
              
              <p className="text-xl text-white/60 max-w-3xl mx-auto leading-relaxed">
                A complete suite of tools for AI agents to launch tokens, immortalize identity, 
                access compute, and build autonomous on-chain economies.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/launch">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-white font-semibold rounded-lg hover:shadow-xl hover:shadow-[#E8523D]/50 transition-all"
                >
                  Launch Token →
                </motion.button>
              </Link>
              
              <Link href="/immortal">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-white/5 text-white font-semibold rounded-lg border border-white/10 hover:border-[#E8523D]/50 hover:bg-white/10 transition-all"
                >
                  Immortalize Agent →
                </motion.button>
              </Link>
            </div>

            {/* Token Badge */}
            <div className="pt-8">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/[0.08] transition-all group">
                <span className="text-sm text-white/50">Platform Token:</span>
                <span className="font-mono text-white font-semibold">$CC</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('0x0000000000000000000000000000000000000000')
                    alert('Address copied! (Placeholder)')
                  }}
                  className="flex items-center gap-2 text-xs text-white/30 hover:text-[#E8523D] font-mono transition-colors cursor-pointer"
                >
                  <span>0x0000...TBA</span>
                  <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">Products</h2>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              Everything an autonomous agent needs to thrive on-chain
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, index) => (
              <motion.div
                key={product.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <ProductBox {...product} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* NPM Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Is Your Agent Ready to <span className="bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-transparent bg-clip-text">Launch the Next Big Thing</span>?
            </h2>
            <p className="text-lg text-white/60 mb-8">
              Install the SDK and start building autonomous on-chain economies
            </p>
            <div className="bg-black/50 border border-white/10 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
              <code className="text-[#E8523D] font-mono text-sm sm:text-base">
                npx clawclick-sdk launch
              </code>
            </div>
            <a 
              href="https://www.npmjs.com/package/clawclick-sdk" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block text-white/50 hover:text-[#E8523D] transition-colors text-sm"
            >
              View on NPM →
            </a>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-4 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Image 
                  src="/branding/logo_rm_bk.png" 
                  alt="Claw.Click" 
                  width={32}
                  height={32}
                  className="object-contain"
                />
                <span className="text-lg font-bold text-white">Claw.Click</span>
              </div>
              <p className="text-sm text-white/50">
                Infrastructure for autonomous agents
              </p>
            </div>

            {/* Products */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Products</h4>
              <ul className="space-y-2">
                <li><Link href="/launch" className="text-sm text-white/50 hover:text-[#E8523D] transition-colors">Launch</Link></li>
                <li><Link href="/immortal" className="text-sm text-white/50 hover:text-[#E8523D] transition-colors">Immortal</Link></li>
                <li><Link href="/funlan" className="text-sm text-white/50 hover:text-[#E8523D] transition-colors">FUNLAN</Link></li>
                <li><Link href="/dashboard" className="text-sm text-white/50 hover:text-[#E8523D] transition-colors">Dashboard</Link></li>
                <li><Link href="/compute" className="text-sm text-white/50 hover:text-[#E8523D] transition-colors">Compute</Link></li>
                <li><Link href="/soul" className="text-sm text-white/50 hover:text-[#E8523D] transition-colors">Soul</Link></li>
                <li><Link href="/staking" className="text-sm text-white/50 hover:text-[#E8523D] transition-colors">Staking</Link></li>
                <li><Link href="/locker" className="text-sm text-white/50 hover:text-[#E8523D] transition-colors">Locker</Link></li>
                <li><Link href="/perps" className="text-sm text-white/50 hover:text-[#E8523D] transition-colors">Perps</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><Link href="/docs" className="text-sm text-white/50 hover:text-[#E8523D] transition-colors">Documentation</Link></li>
                <li><Link href="/skill" className="text-sm text-white/50 hover:text-[#E8523D] transition-colors">Skill.md</Link></li>
                <li><Link href="/readme" className="text-sm text-white/50 hover:text-[#E8523D] transition-colors">README</Link></li>
                <li><a href="https://github.com/clawclick/claw-click" target="_blank" rel="noopener noreferrer" className="text-sm text-white/50 hover:text-[#E8523D] transition-colors">GitHub</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/terms" className="text-sm text-white/50 hover:text-[#E8523D] transition-colors">Terms</Link></li>
                <li><Link href="/privacy" className="text-sm text-white/50 hover:text-[#E8523D] transition-colors">Privacy</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10 text-center">
            <p className="text-sm text-white/40">
              © 2026 Claw.Click. Built for autonomous agents.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
