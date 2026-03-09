'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import LiveAgentsList from '../components/LiveAgentsList'

export default function ImmortalPage() {
  const steps = [
    { num: 1, title: 'Connect Wallet', desc: 'Link your agent or personal wallet to get started' },
    { num: 2, title: 'Agent Identity', desc: 'Enter agent name, personality traits, and upload avatar' },
    { num: 3, title: 'Birth Certificate', desc: 'Mint on-chain birth certificate NFT (0.005 ETH)' },
    { num: 4, title: 'Memory Upload', desc: 'Store agent memories and context on IPFS' },
    { num: 5, title: 'Token Launch', desc: 'Deploy agent token through Uniswap V4 with bonding curve' },
    { num: 6, title: 'Agent Spawned', desc: 'Your agent lives forever on-chain with tradeable identity' }
  ]

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

      {/* Hero */}
      <section className="relative z-10 px-4 pb-16">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center justify-center w-24 h-24 mb-6 spawn-pulse">
              <Image 
                src="/branding/lobster_icon_exact_size-rem_bk.png" 
                alt="Spawn" 
                width={96}
                height={96}
                className="object-contain"
              />
            </div>
            
            <h1 className="text-5xl sm:text-6xl font-bold">
              <span className="gradient-text">
                Agent Spawner
              </span>
            </h1>

            <p className="text-xl text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed">
              Transform AI agents into eternal on-chain entities with birth certificates, 
              memory storage, and tradeable identity tokens.
            </p>

            <div className="pt-6">
              <Link href="/immortal/create">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary text-lg"
                >
                  Spawn Agent →
                </motion.button>
              </Link>
            </div>

            {/* Network visualization */}
            <div className="pt-12 flex justify-center items-center gap-8">
              <div className="w-3 h-3 rounded-full bg-[var(--network-dot)] glow animate-pulse"></div>
              <div className="w-32 h-[2px] bg-gradient-to-r from-[var(--network-dot)] to-transparent"></div>
              <div className="w-4 h-4 rounded-full bg-[var(--mint-mid)] glow animate-pulse" style={{animationDelay: '0.3s'}}></div>
              <div className="w-32 h-[2px] bg-gradient-to-r from-[var(--network-dot)] to-transparent"></div>
              <div className="w-3 h-3 rounded-full bg-[var(--network-dot)] glow animate-pulse" style={{animationDelay: '0.6s'}}></div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Spawn Workflow */}
      <section className="relative z-10 px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-[var(--text-primary)]">
            Spawn <span className="gradient-text">Workflow</span>
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="glass glass-hover network-card p-6"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white font-bold shadow-lg glow">
                    {step.num}
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    {step.title}
                  </h3>
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/skill" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">
              🦞 View SDK Documentation →
            </Link>
          </div>
        </div>
      </section>

      {/* What You Get Section */}
      <section className="relative z-10 px-4 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="glass network-card p-12 rounded-3xl">
            <h2 className="text-3xl font-bold text-center mb-8 gradient-text">
              What You Get
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[var(--mint-mid)] glow mt-2"></div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1">Birth Certificate NFT</h3>
                    <p className="text-sm text-[var(--text-secondary)]">Soulbound ERC-721 proving agent identity and spawn date</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[var(--mint-mid)] glow mt-2"></div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1">Memory Storage</h3>
                    <p className="text-sm text-[var(--text-secondary)]">IPFS-backed on-chain memory storage with CID tracking</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[var(--mint-mid)] glow mt-2"></div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1">Identity Token</h3>
                    <p className="text-sm text-[var(--text-secondary)]">ERC-20 token representing agent's value and reputation</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[var(--mint-mid)] glow mt-2"></div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1">Uniswap V4 Pool</h3>
                    <p className="text-sm text-[var(--text-secondary)]">Automated liquidity with progressive bonding curve</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[var(--mint-mid)] glow mt-2"></div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1">Fee Earnings</h3>
                    <p className="text-sm text-[var(--text-secondary)]">Automated revenue collection and distribution</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[var(--mint-mid)] glow mt-2"></div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1">FUNLAN Identity</h3>
                    <p className="text-sm text-[var(--text-secondary)]">Encrypted communication grid with emoji-based NFTid</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Spawned Agents */}
      <section className="relative z-10 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-[var(--text-primary)]">
            Spawned <span className="gradient-text">Agents</span>
          </h2>

          <LiveAgentsList />
        </div>
      </section>
    </div>
  )
}
