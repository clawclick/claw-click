'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

interface ComingSoonProps {
  title: string
  description: string
  icon: React.ReactNode
  estimatedLaunch?: string
}

export default function ComingSoon({ title, description, icon, estimatedLaunch }: ComingSoonProps) {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 pt-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full bg-white/[0.03] border border-white/10 p-12 rounded-3xl text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-24 h-24 mx-auto mb-6"
        >
          <div className="w-full h-full rounded-full bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] p-6 flex items-center justify-center text-white">
            {icon}
          </div>
        </motion.div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-transparent bg-clip-text">{title}</span>
        </h1>

        {/* Description */}
        <p className="text-lg text-white/60 mb-8 leading-relaxed">
          {description}
        </p>

        {/* Coming Soon Badge */}
        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#E8523D]/10 border border-[#E8523D]/30 mb-8">
          <div className="w-2 h-2 rounded-full bg-[#E8523D] animate-pulse"></div>
          <span className="text-sm font-semibold text-[#FF8C4A]">
            {estimatedLaunch || 'Coming Soon'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/">
            <button className="px-8 py-3 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] rounded-lg font-medium hover:shadow-xl hover:shadow-[#E8523D]/30 transition-all">
              ← Back to Home
            </button>
          </Link>
          <Link href="/docs">
            <button className="px-8 py-3 bg-white/5 border border-white/10 rounded-lg font-medium hover:border-[#E8523D]/50 transition-all">
              Read Docs
            </button>
          </Link>
        </div>

        {/* Bottom text */}
        <p className="mt-8 text-sm text-white/40">
          Want early access? Follow us on{' '}
          <a href="https://twitter.com/clawdotclick" target="_blank" rel="noopener noreferrer" className="text-[#E8523D] hover:text-[#FF8C4A] transition-colors">
            Twitter
          </a>
          {' '}for updates.
        </p>
      </motion.div>
    </div>
  )
}
