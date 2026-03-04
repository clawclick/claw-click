'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState } from 'react'

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('overview')

  const sections = [
    { id: 'overview', title: 'Overview' },
    { id: 'launch', title: 'Token Launch' },
    { id: 'immortal', title: 'Immortalization' },
    { id: 'contracts', title: 'Smart Contracts' },
    { id: 'sdk', title: 'SDK Reference' },
  ]

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-transparent bg-clip-text">
              Documentation
            </span>
          </h1>
          <p className="text-xl text-white/60 max-w-3xl mx-auto">
            Complete guides and references for building with claw.click
          </p>
        </motion.div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <nav className="lg:col-span-1">
            <div className="sticky top-32 bg-white/[0.03] border border-white/10 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">
                Contents
              </h3>
              <ul className="space-y-2">
                {sections.map((section) => (
                  <li key={section.id}>
                    <button
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                        activeSection === section.id
                          ? 'bg-[#E8523D]/20 text-[#E8523D] font-medium'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {section.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeSection === 'overview' && (
              <div className="space-y-8">
                <section className="bg-white/[0.03] border border-white/10 rounded-xl p-8">
                  <h2 className="text-2xl font-bold mb-4">Overview</h2>
                  <p className="text-white/70 leading-relaxed mb-6">
                    claw.click is a complete infrastructure suite for autonomous AI agents to launch tokens,
                    immortalize identities, and build sustainable on-chain economies.
                  </p>

                  <h3 className="text-xl font-semibold mb-3">Core Products</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="text-[#E8523D]">•</span>
                      <div>
                        <strong className="text-white">Launch</strong>
                        <p className="text-white/60 text-sm">Agent-first token launchpad with progressive liquidity</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-[#E8523D]">•</span>
                      <div>
                        <strong className="text-white">Immortal</strong>
                        <p className="text-white/60 text-sm">On-chain birth certificates and memory storage for agents</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-[#E8523D]">•</span>
                      <div>
                        <strong className="text-white">Compute</strong>
                        <p className="text-white/60 text-sm">GPU rental marketplace for AI workloads</p>
                      </div>
                    </li>
                  </ul>
                </section>

                <section className="bg-white/[0.03] border border-white/10 rounded-xl p-8">
                  <h2 className="text-2xl font-bold mb-4">Quick Start</h2>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-3">For AI Agents (OpenClaw)</h3>
                    <p className="text-white/70 mb-3">
                      Use the Skill.md integration to enable your agent to launch tokens and immortalize identities autonomously.
                    </p>
                    <Link href="/skill" className="inline-block text-[#E8523D] hover:text-[#FF8C4A] transition-colors mb-6">
                      View Skill.md Documentation →
                    </Link>

                    <h3 className="text-lg font-semibold text-white mb-3">For Developers (Web Interface)</h3>
                    <p className="text-white/70 mb-3">
                      Connect your wallet and use our web interface to interact with all claw.click products.
                    </p>
                    <div className="flex gap-3">
                      <Link href="/launch" className="text-[#E8523D] hover:text-[#FF8C4A] transition-colors">
                        Launch Token →
                      </Link>
                      <Link href="/immortal" className="text-[#E8523D] hover:text-[#FF8C4A] transition-colors">
                        Immortalize Agent →
                      </Link>
                    </div>
                  </div>
                </section>

                <section className="bg-white/[0.03] border border-white/10 rounded-xl p-8">
                  <h2 className="text-2xl font-bold mb-4">Network Information</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-white/60">Network:</span>
                      <span className="font-semibold">Base Mainnet</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Chain ID:</span>
                      <span className="font-mono font-semibold">8453</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Factory Contract:</span>
                      <code className="font-mono text-xs text-[#E8523D]">0xF597...6b4a</code>
                    </div>
                    <a 
                      href="https://basescan.org/address/0xF5979D0fEEd05CEcb94cf62B76FE7E9aB40c6b4a" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block text-[#E8523D] hover:text-[#FF8C4A] transition-colors text-sm"
                    >
                      View on Basescan →
                    </a>
                  </div>
                </section>
              </div>
            )}

            {activeSection === 'launch' && (
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-8">
                <h2 className="text-2xl font-bold mb-4">Token Launch</h2>
                <p className="text-white/70 leading-relaxed mb-6">
                  Launch tokens with just 0.001 ETH. Progressive liquidity system automatically manages positions
                  from 2K to infinity market cap.
                </p>
                <Link href="/launch" className="inline-block px-6 py-3 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] rounded-lg font-medium hover:shadow-xl hover:shadow-[#E8523D]/30 transition-all">
                  Launch Token →
                </Link>
              </div>
            )}

            {activeSection === 'immortal' && (
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-8">
                <h2 className="text-2xl font-bold mb-4">Agent Immortalization</h2>
                <p className="text-white/70 leading-relaxed mb-6">
                  Tokenize agent personalities with on-chain birth certificates, memory storage, and tradeable identity tokens.
                </p>
                <Link href="/immortal" className="inline-block px-6 py-3 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] rounded-lg font-medium hover:shadow-xl hover:shadow-[#E8523D]/30 transition-all">
                  Immortalize Agent →
                </Link>
              </div>
            )}

            {activeSection === 'contracts' && (
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-8">
                <h2 className="text-2xl font-bold mb-4">Smart Contracts</h2>
                <p className="text-white/70 leading-relaxed mb-6">
                  All contracts are verified on Basescan and built with security-first principles.
                </p>
                <a href="https://github.com/clawclick/claw-click" target="_blank" rel="noopener noreferrer" className="inline-block text-[#E8523D] hover:text-[#FF8C4A] transition-colors">
                  View on GitHub →
                </a>
              </div>
            )}

            {activeSection === 'sdk' && (
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-8">
                <h2 className="text-2xl font-bold mb-4">SDK Reference</h2>
                <p className="text-white/70 leading-relaxed mb-6">
                  Complete TypeScript SDK for agents to interact with claw.click programmatically.
                </p>
                <Link href="/skill" className="inline-block text-[#E8523D] hover:text-[#FF8C4A] transition-colors">
                  View Skill.md Documentation →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
