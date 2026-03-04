import Link from 'next/link'
import { motion } from 'framer-motion'

interface ProductBoxProps {
  title: string
  description: string
  href: string
  icon: string
  status: 'active' | 'coming-soon'
  gradient: string
}

export default function ProductBox({ 
  title, 
  description, 
  href, 
  status, 
  gradient 
}: ProductBoxProps) {
  const isActive = status === 'active'

  return (
    <Link href={isActive ? href : '#'} className={!isActive ? 'pointer-events-none' : ''}>
      <motion.div
        whileHover={isActive ? { scale: 1.02, y: -4 } : {}}
        className={`
          h-full p-6 rounded-xl border transition-all
          ${isActive 
            ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.05] hover:border-white/20 hover:shadow-xl hover:shadow-black/20' 
            : 'bg-white/[0.01] border-white/5 opacity-50'
          }
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <span className="text-2xl">
              {icon === 'launch' && '🚀'}
              {icon === 'immortalize' && '🦞'}
              {icon === 'gpu-sessions' && '⚡'}
              {icon === 'funlan' && '🧬'}
              {icon === 'locker' && '🔐'}
              {icon === 'perps' && '📈'}
              {icon === 'staking' && '💎'}
              {icon === 'soul' && '✨'}
              {icon === 'dashboard' && '📊'}
            </span>
          </div>
          
          {!isActive && (
            <span className="px-2 py-1 text-xs font-semibold text-white/40 border border-white/10 rounded">
              Soon
            </span>
          )}
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <p className="text-sm text-white/60 leading-relaxed">{description}</p>
        </div>

        {/* Arrow */}
        {isActive && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <span className="text-sm text-white/40 group-hover:text-[#E8523D] transition-colors inline-flex items-center gap-1">
              Learn more →
            </span>
          </div>
        )}
      </motion.div>
    </Link>
  )
}
