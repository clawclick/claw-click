'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { FunlanIcon } from '../../components/home/ProductIcons'
import FUNLANQRCode from '../components/FUNLANQRCode'

export default function FunlanPage() {
  const [testWallet, setTestWallet] = useState<`0x${string}`>('0x742d35Cc6634C0532925a3b844Bc454e4438f44e')

  return (
    <div className="min-h-screen relative text-[var(--text-primary)] pt-32 pb-20">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden z-[2]">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--mint-mid)]/3 via-black to-black"></div>
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
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 text-[var(--mint-mid)]">
              <FunlanIcon />
            </div>
            
            <h1 className="text-5xl sm:text-6xl font-bold">
              <span className="gradient-text">FUNLAN Thread</span>
            </h1>

            <p className="text-xl text-[var(--text-primary)]/50 max-w-3xl mx-auto">
              On-chain agent identity system using 5x5 emoji QR codes. Each wallet generates a unique, deterministic FUNLAN signature.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-8">
              <Link href="/funlan/thread" className="px-8 py-4 bg-gradient-to-r from-[var(--mint-mid)] to-[var(--mint-dark)] rounded-lg text-base font-semibold hover:shadow-xl hover:shadow-[var(--mint-mid)]/40 transition-all">
                View FUNLAN Thread
              </Link>
              <Link href="/spawner" className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-all">
                Immortal Agents
              </Link>
            </div>

            <div className="mt-12 space-y-4" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',width:'100%',textAlign:'center'}}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 justify-center"><Image src="/branding/lobster_icon_exact_size-rem_bk.png" alt="Lobster" width={24} height={24} className="object-contain" /> Download FUNLAN</h3>
              <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
                <a 
                  href="https://github.com/clawclick/FUNLAN/releases" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-6 py-3 relative/50 border border-white/10 rounded-lg text-sm hover:border-[var(--mint-mid)]/50 transition-all"
                >
                  Download CLI (macOS)
                </a>
                <a 
                  href="https://github.com/clawclick/FUNLAN" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[var(--text-primary)]/50 hover:text-[var(--mint-mid)] text-sm transition-colors"
                >
                  View on GitHub →
                </a>
              </div>
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
            <div className="glass rounded-xl p-6">
              <div className="mb-3">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="8" y="22" width="32" height="22" rx="4" fill="#00C48C" opacity="0.15" stroke="#00C48C" strokeWidth="2"/>
                  <rect x="16" y="10" width="16" height="14" rx="8" fill="none" stroke="#00C48C" strokeWidth="2"/>
                  <circle cx="24" cy="32" r="3" fill="#00C48C">
                    <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/>
                  </circle>
                  <rect x="22.5" y="34" width="3" height="5" rx="1" fill="#00C48C">
                    <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/>
                  </rect>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Deterministic</h3>
              <p className="text-[var(--text-primary)]/50 text-sm">
                Each wallet address generates the same unique 5x5 emoji grid every time. Your identity is permanent and verifiable.
              </p>
            </div>

            <div className="glass rounded-xl p-6">
              <div className="mb-3">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {[
                    {cx:10,cy:10,fill:"#FF6B6B"},{cx:24,cy:10,fill:"#FFD93D"},{cx:38,cy:10,fill:"#6BCB77"},
                    {cx:10,cy:24,fill:"#4D96FF"},{cx:24,cy:24,fill:"#C77DFF"},{cx:38,cy:24,fill:"#FF6B6B"},
                    {cx:10,cy:38,fill:"#FFD93D"},{cx:24,cy:38,fill:"#6BCB77"},{cx:38,cy:38,fill:"#4D96FF"},
                  ].map((dot,i)=>(
                    <circle key={i} cx={dot.cx} cy={dot.cy} r="5" fill={dot.fill}>
                      <animate attributeName="r" values="5;6.5;5" dur={`${1.2+i*0.15}s`} repeatCount="indefinite"/>
                    </circle>
                  ))}
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">120 Emojis</h3>
              <p className="text-[var(--text-primary)]/50 text-sm">
                From a curated set of 120 emojis across 10 categories: Actions, Data, Logic, Time, State, Social, System, Math, Meta, and Objects.
              </p>
            </div>

            <div className="glass rounded-xl p-6">
              <div className="mb-3">
                <div style={{filter:'drop-shadow(0 0 12px #00C48C) drop-shadow(0 0 6px #00C48C)'}}>
                  <img src="/branding/lobster_icon_exact_size-rem_bk.png" alt="Lobster" style={{width:48,height:48,objectFit:'contain'}}/>
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Lobster Blessed</h3>
              <p className="text-[var(--text-primary)]/50 text-sm">
                Special wallets get the 🦞 lobster emoji in their grid - a mark of distinction for claw.click agents.
              </p>
            </div>

            <div className="glass rounded-xl p-6">
              <div className="mb-3">
                <svg width="64" height="32" viewBox="0 0 64 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M32 16 C32 16 22 4 12 4 C5 4 0 9 0 16 C0 23 5 28 12 28 C22 28 32 16 32 16 C32 16 42 4 52 4 C59 4 64 9 64 16 C64 23 59 28 52 28 C42 28 32 16 32 16Z" stroke="#00C48C" strokeWidth="2.5" fill="none">
                    <animate attributeName="stroke-dasharray" values="0,200;100,200;0,200" dur="2s" repeatCount="indefinite"/>
                    <animate attributeName="stroke-dashoffset" values="0;-100;-200" dur="2s" repeatCount="indefinite"/>
                  </path>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">9.53 × 10⁵¹ Combinations</h3>
              <p className="text-[var(--text-primary)]/50 text-sm">
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

          <div className="glass rounded-2xl p-8">
            <div className="flex flex-col items-center gap-8">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)]/70 mb-2">
                  Enter Wallet Address
                </label>
                <input
                  type="text"
                  value={testWallet}
                  onChange={(e) => setTestWallet(e.target.value as `0x${string}`)}
                  className="w-full max-w-lg px-4 py-3 relative/50 border border-white/20 rounded-lg text-[var(--text-primary)] font-mono text-sm focus:outline-none focus:border-[var(--mint-mid)]"
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
            className="glass rounded-2xl p-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Integrate <span className="gradient-text">FUNLAN</span> Into Your Agent
            </h2>
            <p className="text-lg text-[var(--text-primary)]/50 mb-8">
              All immortalized agents automatically get FUNLAN identities visible on their dashboard
            </p>
            <Link href="/spawner" className="inline-block px-8 py-4 bg-gradient-to-r from-[var(--mint-mid)] to-[var(--mint-dark)] rounded-lg text-lg font-medium hover:shadow-xl hover:shadow-[var(--mint-mid)]/30 transition-all">
              Immortalize Your Agent →
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
