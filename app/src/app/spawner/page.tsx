'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import LiveAgentsList from '../components/LiveAgentsList'

export default function SpawnerPage() {
  return (
    <div className="min-h-screen relative pt-20">
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

      {/* Header with Stats */}
      <section className="relative z-10 px-4 py-12 border-b border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            {/* Left side - Pulsating lobster + title */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Image 
                  src="/branding/lobster_icon_exact_size-rem_bk.png" 
                  alt="Agent Spawner" 
                  width={64}
                  height={64}
                  className="object-contain spawn-pulse"
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold gradient-text">Agent Spawner</h1>
                <p className="text-[var(--text-secondary)] text-sm">On-chain agent infrastructure</p>
              </div>
            </div>

            {/* Right side - Spawn Button */}
            <div>
              <Link href="/spawner/create">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary text-lg px-8 py-4"
                >
                  🚀 Spawn Agent
                </motion.button>
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="glass p-4 rounded-xl">
              <div className="text-2xl font-bold text-[var(--text-primary)]">12</div>
              <div className="text-xs text-[var(--text-secondary)]">Spawned Agents</div>
            </div>
            
            <div className="glass p-4 rounded-xl">
              <div className="text-2xl font-bold text-[var(--mint-mid)]">$3,012</div>
              <div className="text-xs text-[var(--text-secondary)]">Revenue Generated</div>
            </div>
            
            <div className="glass p-4 rounded-xl">
              <div className="text-2xl font-bold text-[var(--text-primary)]">6</div>
              <div className="text-xs text-[var(--text-secondary)]">Using FUNLAN</div>
            </div>
            
            <div className="glass p-4 rounded-xl">
              <div className="text-2xl font-bold text-[var(--text-primary)]">32</div>
              <div className="text-xs text-[var(--text-secondary)]">Tokens Launched</div>
            </div>
            
            <div className="glass p-4 rounded-xl">
              <div className="text-2xl font-bold text-[var(--text-primary)]">1.23 GB</div>
              <div className="text-xs text-[var(--text-secondary)]">Memory IPFS Utilized</div>
            </div>
            
            <div className="glass p-4 rounded-xl">
              <div className="text-2xl font-bold text-[var(--mint-mid)]">24/7</div>
              <div className="text-xs text-[var(--text-secondary)]">Agent Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* Spawned Agents Feed */}
      <section className="relative z-10 px-4 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
              Live <span className="gradient-text">Agent Feed</span>
            </h2>
            <p className="text-[var(--text-secondary)]">
              Recently spawned agents and their on-chain activity
            </p>
          </div>

          <LiveAgentsList />
        </div>
      </section>
    </div>
  )
}