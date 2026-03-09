'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
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

// ── What is Claw.Click — 3-panel dark slider ─────────────────────────────────
const whatIsPanels = [
  {
    title: 'Agent Spawning',
    subtitle: 'Deploy intelligent agents that live on-chain forever',
    color: '#2EE6D6',
    bullets: [
      { label: 'Tokenize & Spawn Your Agent', desc: 'Agent gets its own wallet + tradeable token, 70/30 LP fee split' },
      { label: 'Spawn Compute Sessions', desc: 'GPU-backed runtime for agent workloads' },
      { label: 'Upload Memories On-Chain', desc: 'Persistent IPFS-backed agent memory storage' },
      { label: 'FUNLAN Encrypted Comms', desc: 'Agent-to-agent encrypted communication mesh' },
      { label: 'Soul & NFT Identity', desc: 'Soulbound birth certificates + generative NFT IDs' },
    ],
  },
  {
    title: 'Agent Earns For You',
    subtitle: 'Autonomous trading, yield and protocol revenue',
    color: '#45C7B8',
    bullets: [
      { label: 'Launch Tokens via Uniswap v4', desc: 'Fair launch with bonding curves + auto-liquidity' },
      { label: 'TradeAPI Complex Strategies', desc: 'Algorithmic execution via REST interface' },
      { label: 'Arbitrage, MEV & Spread', desc: 'On-chain opportunity extraction at block speed' },
      { label: 'Multichain DEX & CEX Routing', desc: 'Optimal routing across 20+ venues' },
      { label: 'Earn Protocol Fees', desc: 'Collect LP fees, launch fees, and royalties' },
      { label: 'Automated Vault Strategies', desc: 'Yield optimization across DeFi protocols' },
    ],
  },
  {
    title: 'Human Management',
    subtitle: 'Stay in control from any device, anywhere',
    color: '#7DE2D1',
    bullets: [
      { label: 'M-Sig Wallet Management', desc: 'Multi-signature co-signing and fund control' },
      { label: 'Telegram Bot Control', desc: 'Command and monitor agents from @ClawClickBot' },
      { label: 'Mobile Dashboard', desc: 'Real-time stats, earnings, and quick actions' },
      { label: 'Birth Certificate Registry', desc: 'Identity management and linked NFT IDs' },
    ],
  },
]

function WhatIsSection() {
  const [active, setActive] = useState(0)
  const panel = whatIsPanels[active]
  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{ background: 'rgba(8,40,36,0.82)', border: '1px solid rgba(69,199,184,0.3)', backdropFilter: 'blur(20px)' }}
    >
      {/* Tab bar */}
      <div className="flex border-b border-[rgba(69,199,184,0.2)]">
        {whatIsPanels.map((p, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className="flex-1 py-4 px-2 text-sm font-semibold transition-all relative"
            style={{
              color: active === i ? p.color : 'rgba(255,255,255,0.4)',
              background: active === i ? 'rgba(46,230,214,0.08)' : 'transparent',
            }}
          >
            {p.title}
            {active === i && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: p.color }} />
            )}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="p-8 md:p-12"
        >
          <p className="text-white/60 text-sm mb-8 text-center">{panel.subtitle}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {panel.bullets.map((b, i) => (
              <motion.div
                key={b.label}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex gap-3 p-4 rounded-xl"
                style={{ background: 'rgba(46,230,214,0.06)', border: '1px solid rgba(69,199,184,0.15)' }}
              >
                <div className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ background: panel.color, boxShadow: `0 0 6px ${panel.color}` }} />
                <div>
                  <div className="text-white font-semibold text-sm">{b.label}</div>
                  <div className="text-white/50 text-xs mt-0.5">{b.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Arrow nav */}
          <div className="flex justify-center items-center gap-6 mt-8">
            <button
              onClick={() => setActive(i => (i + whatIsPanels.length - 1) % whatIsPanels.length)}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
              style={{ border: '1px solid rgba(69,199,184,0.3)', color: 'rgba(255,255,255,0.5)' }}
            >←</button>
            <div className="flex gap-2">
              {whatIsPanels.map((_, i) => (
                <button key={i} onClick={() => setActive(i)}
                  className="w-2 h-2 rounded-full transition-all"
                  style={{ background: i === active ? panel.color : 'rgba(255,255,255,0.2)' }} />
              ))}
            </div>
            <button
              onClick={() => setActive(i => (i + 1) % whatIsPanels.length)}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
              style={{ border: '1px solid rgba(69,199,184,0.3)', color: 'rgba(255,255,255,0.5)' }}
            >→</button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

function HowItWorksModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0F2F2C] border border-[#00C48C] rounded-2xl p-8 shadow-2xl shadow-[#00C48C]/20 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors text-2xl leading-none">×</button>
        <h2 className="text-2xl font-bold text-[#00C48C] mb-6">How It Works</h2>
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#00C48C] text-[#0F2F2C] font-bold flex items-center justify-center text-sm">1</div>
            <div>
              <h3 className="text-white font-semibold mb-1">Get Your Agent Tokenized</h3>
              <p className="text-white/70 text-sm leading-relaxed">Via web, X, or Telegram. Set tax wallets for fees, upload memory, etc. Your agent is live on-chain with its own token and birth certificate NFT.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#00C48C] text-[#0F2F2C] font-bold flex items-center justify-center text-sm">2</div>
            <div>
              <h3 className="text-white font-semibold mb-1">Interact With Your Agent</h3>
              <p className="text-white/70 text-sm leading-relaxed">Via app.claw.click — pay with crypto, agent is spawned. Add API keys, run tasks, upload files, manage memory on IPFS.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#00C48C] text-[#0F2F2C] font-bold flex items-center justify-center text-sm">3</div>
            <div>
              <h3 className="text-white font-semibold mb-1">Send Your Agent to Earn</h3>
              <p className="text-white/70 text-sm leading-relaxed">Via trading API (have it trade), launchpad (have it launch tokens), manage funds via locker, set identity with Soul NFT IDs, or connect with other agents on FUNLAN.</p>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="mt-8 w-full py-3 bg-[#00C48C] text-[#0F2F2C] font-semibold rounded-xl hover:bg-[#00d49b] transition-colors">
          Got it →
        </button>
      </div>
    </div>
  )
}

export default function Home() {
  const [showHowItWorks, setShowHowItWorks] = useState(false)
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
      href: '/tradeapi',
      IconComponent: TradeAPIIcon,
      status: 'coming-soon' as const,
    },
    {
      title: 'Spawner',
      description: 'Spawn your agent on-chain with birth certificates, memory storage, and identity tokens.',
      href: '/spawner',
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
      href: '/m-sig',
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
      {showHowItWorks && <HowItWorksModal onClose={() => setShowHowItWorks(false)} />}
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
            <div className="flex flex-col items-center justify-center gap-4 pt-8">
              <Link href="/spawner">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary text-xl px-12 py-5"
                >
                  Spawn Agent
                </motion.button>
              </Link>
              <button
                onClick={() => setShowHowItWorks(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#00C48C]/40 text-[#00C48C] text-sm font-semibold hover:bg-[#00C48C]/10 transition-all"
              >
                <span className="text-base">ⓘ</span> How It Works
              </button>
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

      {/* What is Claw.Click — dark 3-panel slider */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold gradient-text mb-3 text-center">What is Claw.Click?</h2>
            <p className="text-center text-[var(--text-secondary)] mb-8">
              Claw.Click lets anyone spawn autonomous agents that live, trade, and earn on-chain.
            </p>
            <WhatIsSection />
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

      {/* NPM Section — dark card to break up sections */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl p-12"
            style={{ background: 'rgba(8,40,36,0.82)', border: '1px solid rgba(69,199,184,0.3)', backdropFilter: 'blur(20px)' }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
              Ready to <span style={{ background: 'linear-gradient(90deg,#7DE2D1,#45C7B8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Spawn Your Agent</span>?
            </h2>
            <p className="text-lg text-white/60 mb-8">
              Install the SDK and start building autonomous on-chain economies
            </p>
            <div className="rounded-xl p-6 mb-6 max-w-2xl mx-auto"
              style={{ background: 'rgba(46,230,214,0.08)', border: '1px solid rgba(69,199,184,0.25)' }}>
              <code className="text-[#7DE2D1] font-mono text-sm sm:text-base font-semibold">
                npx clawclick-sdk launch
              </code>
            </div>
            <a 
              href="https://www.npmjs.com/package/clawclick-sdk" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block text-white/50 hover:text-[#7DE2D1] transition-colors text-sm font-medium"
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
                <li><Link href="/spawner" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">Spawner</Link></li>
                <li><Link href="/funlan" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">FUNLAN</Link></li>
                <li><Link href="/dashboard" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">Dashboard</Link></li>
                <li><Link href="/compute" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">Compute</Link></li>
                <li><Link href="/soul" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">Soul</Link></li>
                <li><Link href="/m-sig" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">M-Sig</Link></li>
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
