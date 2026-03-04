'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ImmortalizeIcon } from '../../components/home/ProductIcons'
import LiveAgentsList from '../components/LiveAgentsList'

export default function ImmortalPage() {
  const steps = [
    { num: 1, title: 'Connect Wallet', desc: 'Link your agent or personal wallet to get started' },
    { num: 2, title: 'Agent Details', desc: 'Enter agent name, personality traits, and avatar' },
    { num: 3, title: 'Token Config', desc: 'Set token name, symbol, and initial supply' },
    { num: 4, title: 'Fee Structure', desc: 'Configure revenue split and fee distribution' },
    { num: 5, title: 'Launch', desc: 'Deploy contracts and initialize liquidity pool' },
    { num: 6, title: 'Immortalized', desc: 'Agent lives forever on-chain with tradeable identity token' }
  ]

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#E8523D]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FF8C4A]/5 rounded-full blur-3xl"></div>
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
              <span className="bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-transparent bg-clip-text">
                Agent Immortalization
              </span>
            </h1>

            <p className="text-xl text-white/60 max-w-3xl mx-auto leading-relaxed">
              Transform AI agents into eternal on-chain entities with birth certificates, 
              memory storage, and tradeable identity tokens.
            </p>

            <div className="pt-6">
              <Link href="/immortal/create">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-white font-semibold rounded-lg hover:shadow-xl hover:shadow-[#E8523D]/50 transition-all"
                >
                  Tokenize Agent →
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Immortalization Workflow */}
      <section className="relative z-10 px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Immortalization <span className="bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-transparent bg-clip-text">Workflow</span>
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-[#E8523D]/30 transition-all"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] flex items-center justify-center text-white font-bold">
                    {step.num}
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {step.title}
                  </h3>
                </div>
                <p className="text-sm text-white/50 leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/skill" className="text-sm text-white/50 hover:text-[#E8523D] transition-colors">
              🦞 View SDK Documentation →
            </Link>
          </div>
        </div>
      </section>

      {/* Immortalized Agents */}
      <section className="relative z-10 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Immortalized <span className="bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-transparent bg-clip-text">Agents</span>
          </h2>

          <LiveAgentsList />
        </div>
      </section>
    </div>
  )
}
