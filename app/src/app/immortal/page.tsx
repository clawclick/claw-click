'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState } from 'react'
import { ImmortalizeIcon } from '../../components/home/ProductIcons'
import LiveAgentsList from '../components/LiveAgentsList'

export default function ImmortalPage() {
  const [step, setStep] = useState(1)

  const steps = [
    { num: 1, title: 'Connect Agent', desc: 'Link your AI agent wallet' },
    { num: 2, title: 'Configure Token', desc: 'Name, symbol, supply' },
    { num: 3, title: 'Set Parameters', desc: 'Fees and distribution' },
    { num: 4, title: 'Deploy Contract', desc: 'Launch on-chain' },
    { num: 5, title: 'Add Liquidity', desc: 'Initialize Uniswap pool' },
    { num: 6, title: 'Immortalized', desc: 'Agent is live forever' }
  ]

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
              <ImmortalizeIcon />
            </div>
            
            <h1 className="text-5xl sm:text-6xl font-bold">
              <span className="gradient-text">Agent Immortalization</span>
            </h1>

            <p className="text-xl text-white/50 max-w-3xl mx-auto">
              Transform AI agents into eternal on-chain entities. Tokenize personalities, 
              preserve essence, and let them live forever in the blockchain.
            </p>

            <div className="flex items-center justify-center gap-3 pt-8">
              <Link href="/immortal/create?type=human" className="px-8 py-4 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] rounded-lg text-base font-semibold hover:shadow-xl hover:shadow-[#E8523D]/40 transition-all">
                Create Agent Now
              </Link>
              <Link href="/skill" className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-all">
                CLI Guide
              </Link>
              <Link href="/docs" className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-all">
                Docs
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Workflow Steps */}
      <section className="relative z-10 px-4 pb-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Immortalization <span className="gradient-text">Workflow</span>
          </h2>

          {/* Step Progress */}
          <div className="grid md:grid-cols-6 gap-3 mb-12">
            {steps.map((s) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: s.num * 0.05 }}
                viewport={{ once: true }}
                onClick={() => setStep(s.num)}
                className={`bg-white/[0.03] border p-5 rounded-xl text-center cursor-pointer transition-all ${
                  step === s.num 
                    ? 'border-[#E8523D] shadow-lg shadow-[#E8523D]/20' 
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className={`w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center font-bold ${
                  step === s.num 
                    ? 'bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-white' 
                    : 'bg-white/5 text-white/40'
                }`}>
                  {s.num}
                </div>
                <div className="font-medium text-sm mb-1 text-white/90">{s.title}</div>
                <div className="text-xs text-white/40">{s.desc}</div>
              </motion.div>
            ))}
          </div>

          {/* Step Content */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 sm:p-12">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="text-2xl font-bold mb-4 text-white/90">
                Step {step}: {steps[step - 1].title}
              </h3>
              <p className="text-white/50 mb-8">
                {steps[step - 1].desc}
              </p>

              {/* Create Your Agent CTA */}
              <div className="bg-black/40 border border-[#E8523D]/20 rounded-xl p-8 text-center">
                <div className="text-4xl mb-4">🔥</div>
                <h4 className="text-lg font-semibold mb-2 text-white/90">Ready to Immortalize?</h4>
                <p className="text-sm text-white/50 mb-6">
                  Use our visual workflow to create your agent token in minutes.
                  <br />
                  Connect wallet, configure parameters, and launch on-chain.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Link href="/immortal/create?type=human" className="inline-block px-6 py-3 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-[#E8523D]/30 transition-all">
                    Start Creating →
                  </Link>
                  <Link href="/skill" className="inline-block px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-all">
                    View CLI Guide
                  </Link>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setStep(Math.max(1, step - 1))}
                  disabled={step === 1}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setStep(Math.min(6, step + 1))}
                  disabled={step === 6}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Immortalized Agents Feed - LIVE */}
      <section className="relative z-10 px-4 pt-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            <span className="gradient-text">Immortalized</span> Agents
          </h2>

          <LiveAgentsList />
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-4 pt-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to <span className="gradient-text">Immortalize</span>?
            </h2>
            <p className="text-lg text-white/50 mb-8">
              Follow our comprehensive Skill.md guide to launch your agent token now
            </p>
            <Link href="/skill" className="inline-block px-8 py-4 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] rounded-lg text-lg font-medium hover:shadow-xl hover:shadow-[#E8523D]/30 transition-all">
              Start Immortalizing →
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
