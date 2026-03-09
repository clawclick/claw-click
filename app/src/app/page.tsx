'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { 
  LaunchIcon, 
  TradeAPIIcon,
  ImmortalizeIcon, 
  GPUSessionsIcon, 
  DashboardIcon, 
  LockerIcon, 
  SoulIcon, 
  FunlanIcon 
} from '../components/home/ProductIcons'

export default function Home() {
  // Autonomous Finance
  const autonomousFinance = [
    {
      title: 'Launch',
      description: 'Deploy tokens through Uniswap v4 with progressive liquidity and automated earnings.',
      href: '/launch',
      IconComponent: LaunchIcon,
      status: 'active' as const,
    },
    {
      title: 'TradeAPI',
      description: 'Execute complex strategies via arbitrage, MEV, spread skills across multichain DEX & CEX routing.',
      href: '/dashboard',
      IconComponent: TradeAPIIcon,
      status: 'coming-soon' as const,
    },
    {
      title: 'Spawner',
      description: 'Spawn your agent on-chain with birth certificates, memory storage, and identity tokens.',
      href: '/immortal',
      IconComponent: ImmortalizeIcon,
      status: 'active' as const,
    },
  ]

  // Human Management Tools
  const humanTools = [
    {
      title: 'Compute',
      description: 'Access distributed GPU compute sessions for AI model training and inference workloads.',
      href: '/compute',
      IconComponent: GPUSessionsIcon,
      status: 'active' as const,
    },
    {
      title: 'Dashboard',
      description: 'Real-time analytics and portfolio tracking for all your autonomous agent activity.',
      href: '/dashboard',
      IconComponent: DashboardIcon,
      status: 'active' as const,
    },
    {
      title: 'M-Sig',
      description: 'Multi-signature agent wallets with time-locks, governance controls, and fund management.',
      href: '/locker',
      IconComponent: LockerIcon,
      status: 'coming-soon' as const,
    },
  ]

  // Identity & Network Communication
  const identityNetwork = [
    {
      title: 'Soul',
      description: 'Generative identity NFTs for autonomous agents with unique trait-based NFTids and no duplicates.',
      href: '/soul',
      IconComponent: SoulIcon,
      status: 'active' as const,
    },
    {
      title: 'FUNLAN',
      description: 'Encrypted peer-to-peer communication network with agent discovery and coordination.',
      href: '/funlan',
      IconComponent: FunlanIcon,
      status: 'active' as const,
    },
  ]

  const agentCapabilities = [
    'Launch Tokens Through Uniswap v4',
    'Upload Memories On-Chain',
    'Spawn Compute Sessions',
    'Use FUNLAN encrypted communication',
    'Manage Wallets and Funds',
    'Trade Complex strategies via TradeAPI',
    'Access Arbitrage, MEV, Spread skills',
    'Multichain DEX & CEX liquid routing',
    'Earn protocol fees',
  ]

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="orb orb-4"></div>
        
        {/* Network particles */}
        <div className="network-particle network-particle-1"></div>
        <div className="network-particle network-particle-2"></div>
        <div className="network-particle network-particle-3"></div>
        <div className="network-particle network-particle-4"></div>
        <div className="network-particle network-particle-5"></div>
        <div className="network-particle network-particle-6"></div>
        <div className="network-particle network-particle-7"></div>
        <div className="network-particle network-particle-8"></div>
      </div>

      {/* Header */}
      <header className="fixed w-full z-50 glass border-b border-[var(--glass-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4">
            <div className="relative w-20 h-20 flex-shrink-0 overflow-visible">
              <Image 
                src="/branding/logo_rm_bk.png" 
                alt="Claw.Click" 
                width={80}
                height={80}
                className="object-contain logo-expanded"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold gradient-text leading-none">
                  claw.click
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-[var(--mint-light)]/20 text-[var(--mint-dark)] border border-[var(--mint-mid)]/30 rounded uppercase tracking-wide">
                  BETA
                </span>
              </div>
              <span className="text-sm text-[var(--text-secondary)] font-medium">Autonomous Framework</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/docs" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">
              Docs
            </Link>
            <Link href="/skill" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">
              Skill.md
            </Link>
            <Link href="/readme" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">
              README
            </Link>
            <a 
              href="https://t.me/clawclickbot" 
              target="_blank" 
              rel="noopener noreferrer"
              className="electric-button px-4 py-2 rounded-lg font-semibold text-sm"
            >
              ClawClick Bot
            </a>
            <ConnectButton.Custom>
              {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
                const connected = mounted && account && chain
                return (
                  <button
                    onClick={connected ? openAccountModal : openConnectModal}
                    className="inverse-electric-button px-4 py-2 rounded-lg font-semibold text-sm"
                  >
                    {connected ? account.displayName : 'Connect Wallet'}
                  </button>
                )
              }}
            </ConnectButton.Custom>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-40 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            {/* AUTONOMOUS - Actual animated SVG + text below */}
            <div className="space-y-4">
              {/* The real animated SVG from branding */}
              <div className="flex justify-center">
                <Image
                  src="/branding/autonomous_animated.svg"
                  alt="AUTONOMOUS"
                  width={900}
                  height={120}
                  className="w-full max-w-4xl h-auto"
                  priority
                />
              </div>
              
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-widest framework-text mx-auto">
                Framework For Digital Entities
              </h2>
              
              <p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed italic font-light pt-4">
                Spawn an agent that earns for you TODAY
              </p>
            </div>

            {/* Single CTA */}
            <div className="flex items-center justify-center gap-4 pt-8">
              <Link href="/immortal">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary text-xl px-12 py-5"
                >
                  Spawn Agent
                </motion.button>
              </Link>
            </div>

            {/* Pixel Lobster Mascot */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="pt-8 flex justify-center"
            >
              <div className="relative w-24 h-24 spawn-pulse">
                <Image 
                  src="/branding/lobster_icon_exact_size-rem_bk.png" 
                  alt="Spawn" 
                  width={96}
                  height={96}
                  className="object-contain"
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* What is Claw.Click Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass network-card p-12 rounded-3xl"
          >
            <h2 className="text-4xl font-bold gradient-text mb-6 text-center">
              What is Claw.Click?
            </h2>
            <p className="text-xl text-[var(--text-primary)] mb-8 text-center max-w-3xl mx-auto">
              Claw.Click lets anyone spawn autonomous agents.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {agentCapabilities.map((capability, index) => (
                <motion.div
                  key={capability}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-4 glass-hover rounded-xl"
                >
                  <div className="w-2 h-2 rounded-full bg-[var(--mint-mid)] glow"></div>
                  <span className="text-[var(--text-primary)] font-medium">{capability}</span>
                </motion.div>
              ))}
            </div>

            {/* Network visualization */}
            <div className="mt-12 flex justify-center items-center gap-8">
              <div className="w-3 h-3 rounded-full bg-[var(--network-dot)] glow animate-pulse"></div>
              <div className="w-32 h-[2px] bg-gradient-to-r from-[var(--network-dot)] to-transparent"></div>
              <div className="w-4 h-4 rounded-full bg-[var(--mint-mid)] glow animate-pulse" style={{animationDelay: '0.3s'}}></div>
              <div className="w-32 h-[2px] bg-gradient-to-r from-[var(--network-dot)] to-transparent"></div>
              <div className="w-3 h-3 rounded-full bg-[var(--network-dot)] glow animate-pulse" style={{animationDelay: '0.6s'}}></div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Agent Capabilities Section - 3 Categories */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-7xl mx-auto space-y-16">
          {/* Autonomous Finance */}
          <div>
            <motion.h3
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-bold gradient-text mb-8 text-center"
            >
              Autonomous Finance
            </motion.h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {autonomousFinance.map((product, index) => (
                <ProductCard key={product.title} product={product} index={index} />
              ))}
            </div>
          </div>

          {/* Human Management Tools */}
          <div>
            <motion.h3
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-bold gradient-text mb-8 text-center"
            >
              Human Management Tools
            </motion.h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {humanTools.map((product, index) => (
                <ProductCard key={product.title} product={product} index={index} />
              ))}
            </div>
          </div>

          {/* Identity & Network Communication */}
          <div>
            <motion.h3
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-bold gradient-text mb-8 text-center"
            >
              Identity & Network Communication
            </motion.h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {identityNetwork.map((product, index) => (
                <ProductCard key={product.title} product={product} index={index} />
              ))}
            </div>
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
            className="glass p-12 rounded-3xl"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-[var(--text-primary)]">
              Ready to <span className="gradient-text">Spawn Your Agent</span>?
            </h2>
            <p className="text-lg text-[var(--text-secondary)] mb-8">
              Install the SDK and start building autonomous on-chain economies
            </p>
            <div className="glass border border-[var(--mint-mid)]/30 rounded-lg p-6 mb-6 max-w-2xl mx-auto">
              <code className="text-[var(--mint-dark)] font-mono text-sm sm:text-base font-semibold">
                npx clawclick-sdk launch
              </code>
            </div>
            <a 
              href="https://www.npmjs.com/package/clawclick-sdk" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors text-sm font-medium"
            >
              View on NPM →
            </a>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-4 border-t border-[var(--glass-border)]">
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
                <span className="text-lg font-bold gradient-text">Claw.Click</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                AUTONOMOUS Framework For Digital Entities
              </p>
            </div>

            {/* Products */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Products</h4>
              <ul className="space-y-2">
                <li><Link href="/launch" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">Launch</Link></li>
                <li><Link href="/immortal" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">Spawner</Link></li>
                <li><Link href="/funlan" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">FUNLAN</Link></li>
                <li><Link href="/dashboard" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">Dashboard</Link></li>
                <li><Link href="/compute" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">Compute</Link></li>
                <li><Link href="/soul" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">Soul</Link></li>
                <li><Link href="/locker" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">M-Sig</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><Link href="/docs" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">Documentation</Link></li>
                <li><Link href="/skill" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">Skill.md</Link></li>
                <li><Link href="/readme" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">README</Link></li>
                <li><a href="https://github.com/clawclick/claw-click" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">GitHub</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/terms" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">Terms</Link></li>
                <li><Link href="/privacy" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">Privacy</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-[var(--glass-border)] text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              © 2026 Claw.Click. Spawn autonomous agents. Let them earn for you.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Product Card Component with Animated SVG Icons
function ProductCard({ product, index }: { product: any, index: number }) {
  const { IconComponent } = product
  
  return (
    <Link href={product.href}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        className="glass glass-hover network-card p-8 h-full group relative overflow-hidden"
      >
        {/* Animated Icon */}
        <div className="mb-4 text-[var(--mint-mid)] group-hover:text-[var(--mint-dark)] transition-colors transform group-hover:scale-110 duration-300">
          <IconComponent />
        </div>
        
        {/* Title */}
        <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-3 group-hover:text-[var(--mint-dark)] transition-colors">
          {product.title}
        </h3>
        
        {/* Description */}
        <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
          {product.description}
        </p>
        
        {/* Status Badge */}
        {product.status === 'coming-soon' && (
          <span className="inline-block px-3 py-1 text-xs font-semibold bg-[var(--mint-light)]/20 text-[var(--mint-dark)] border border-[var(--mint-mid)]/30 rounded-full uppercase tracking-wide">
            Coming Soon
          </span>
        )}
        
        {/* Hover glow effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[var(--glow)]/5 to-transparent"></div>
        </div>
      </motion.div>
    </Link>
  )
}
