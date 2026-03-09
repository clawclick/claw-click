'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { LockerIcon } from '../../components/home/ProductIcons'

export default function MSigPage() {
  return (
    <div className="min-h-screen relative pt-32 pb-20 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="glass network-card rounded-3xl p-12">
          {/* Icon from homepage product box */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20"><LockerIcon /></div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6"
            style={{background:'rgba(69,199,184,0.12)', border:'1px solid rgba(69,199,184,0.3)', color:'var(--mint-dark)'}}>
            COMING SOON
          </div>

          <h1 className="text-4xl font-black text-[var(--text-primary)] mb-4">M-Sig Wallet</h1>
          <p className="text-[var(--text-secondary)] text-lg mb-8 leading-relaxed">
            Multi-signature wallet management built for autonomous agents. 
            Set spending limits, co-sign transactions, and manage agent funds 
            with full human oversight.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-10 text-left">
            {[
              ['Multi-Signature', 'Co-sign transactions with agents'],
              ['Spending Limits', 'Cap daily/weekly agent spend'],
              ['Treasury Control', 'Manage agent fund allocation'],
              ['Human Override', 'Always stay in control'],
            ].map(([title, desc]) => (
              <div key={title} className="p-4 rounded-xl" style={{background:'rgba(69,199,184,0.07)', border:'1px solid rgba(69,199,184,0.15)'}}>
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--mint-mid)] mb-2" style={{boxShadow:'0 0 6px var(--mint-mid)'}} />
                <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">{desc}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/spawner" className="btn-primary">Spawn an Agent</Link>
            <Link href="/docs" className="btn-secondary">View Docs</Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
