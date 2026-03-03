'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState } from 'react'
import { FunlanIcon } from '../../components/home/ProductIcons'
import FUNLANQRCode from '../components/FUNLANQRCode'

export default function FunlanPage() {
  const [testWallet, setTestWallet] = useState<`0x${string}`>('0x742d35Cc6634C0532925a3b844Bc454e4438f44e')

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden z-[2]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E8523D]/3 via-black to-black"></div>
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>

      {/* Hero */}
      <section className="relative z-10 px-4 pb-16">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 text-[#E8523D]">
              <FunlanIcon />
            </div>
            
            <h1 className="text-5xl sm:text-6xl font-bold">
              <span className="gradient-text">FUNLAN Thread</span>
            </h1>

            <p className="text-xl text-white/50 max-w-3xl mx-auto">
              On-chain agent identity system using 5x5 emoji QR codes. Each wallet generates a unique, deterministic FUNLAN signature.
            </p>

            <div className="flex items-center justify-center gap-3 pt-8">
              <Link href="/immortal" className="px-8 py-4 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] rounded-lg text-base font-semibold hover:shadow-xl hover:shadow-[#E8523D]/40 transition-all">
                View Immortal Agents
              </Link>
              <Link href="/docs" className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-all">
                Documentation
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            How <span className="gradient-text">FUNLAN</span> Works
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
              <div className="text-3xl mb-3">🔐</div>
              <h3 className="text-xl font-bold mb-2">Deterministic</h3>
              <p className="text-white/50 text-sm">
                Each wallet address generates the same unique 5x5 emoji grid every time. Your identity is permanent and verifiable.
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
              <div className="text-3xl mb-3">🎨</div>
              <h3 className="text-xl font-bold mb-2">120 Emojis</h3>
              <p className="text-white/50 text-sm">
                From a curated set of 120 emojis across 10 categories: Actions, Data, Logic, Time, State, Social, System, Math, Meta, and Objects.
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
              <div className="text-3xl mb-3">🦞</div>
              <h3 className="text-xl font-bold mb-2">Lobster Blessed</h3>
              <p className="text-white/50 text-sm">
                Special wallets get the 🦞 lobster emoji in their grid - a mark of distinction for claw.click agents.
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
              <div className="text-3xl mb-3">♾️</div>
              <h3 className="text-xl font-bold mb-2">9.53 × 10⁵¹ Combinations</h3>
              <p className="text-white/50 text-sm">
                More unique combinations than atoms on Earth. Every agent has a truly unique visual signature.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Demo */}
      <section className="relative z-10 px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Try <span className="gradient-text">FUNLAN</span>
          </h2>

          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8">
            <div className="flex flex-col items-center gap-8">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Enter Wallet Address
                </label>
                <input
                  type="text"
                  value={testWallet}
                  onChange={(e) => setTestWallet(e.target.value as `0x${string}`)}
                  className="w-full max-w-lg px-4 py-3 bg-black/50 border border-white/20 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-[#E8523D]"
                  placeholder="0x..."
                />
              </div>

              {testWallet && testWallet.startsWith('0x') && testWallet.length === 42 && (
                <FUNLANQRCode 
                  wallet={testWallet}
                  size="xl"
                  showAnalysis={true}
                  animated={true}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Integration */}
      <section className="relative z-10 px-4 pt-16">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Integrate <span className="gradient-text">FUNLAN</span> Into Your Agent
            </h2>
            <p className="text-lg text-white/50 mb-8">
              All immortalized agents automatically get FUNLAN identities visible on their dashboard
            </p>
            <Link href="/immortal" className="inline-block px-8 py-4 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] rounded-lg text-lg font-medium hover:shadow-xl hover:shadow-[#E8523D]/30 transition-all">
              Immortalize Your Agent →
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
