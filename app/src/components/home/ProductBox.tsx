'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ImmortalizeIcon, LaunchIcon, SoulIcon, StakingIcon, LockerIcon, PerpsIcon, FunlanIcon, GPUSessionsIcon, DashboardIcon } from './ProductIcons'

interface ProductBoxProps {
  title: string
  description: string
  href: string
  icon: string // 'immortalize' | 'launch' | 'soul' | 'staking' | 'locker' | 'perps' | 'funlan' | 'gpu-sessions' | 'dashboard'
  status: 'active' | 'coming-soon'
  gradient: string
}

const iconMap = {
  immortalize: ImmortalizeIcon,
  launch: LaunchIcon,
  soul: SoulIcon,
  staking: StakingIcon,
  locker: LockerIcon,
  perps: PerpsIcon,
  funlan: FunlanIcon,
  'gpu-sessions': GPUSessionsIcon,
  dashboard: DashboardIcon
}

export default function ProductBox({ title, description, href, icon, status }: ProductBoxProps) {
  const isActive = status === 'active'
  const IconComponent = iconMap[icon as keyof typeof iconMap] || ImmortalizeIcon
  
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: isActive ? 1.02 : 1 }}
        className={`relative group h-full p-8 rounded-brand border transition-all duration-300 ${
          status === 'coming-soon' 
            ? 'glass opacity-40 cursor-default' 
            : 'glass glass-hover cursor-pointer'
        }`}
      >
        {/* Status Badge */}
        <div className="flex items-center justify-between mb-6">
          <div className={`w-2 h-2 rounded-full ${
            isActive ? 'bg-[var(--mint-mid)] glow' : 'bg-[var(--text-secondary)]/20'
          }`}></div>
          {status === 'coming-soon' && (
            <span className="text-[10px] text-[var(--text-secondary)]/50 font-medium uppercase tracking-wider">
              Soon
            </span>
          )}
        </div>

        {/* Custom Icon */}
        <div className={`mb-6 transition-all duration-300 ${
          isActive ? 'text-[var(--mint-mid)] group-hover:text-[var(--mint-dark)] group-hover:scale-110' : 'text-[var(--text-secondary)]/20'
        }`}>
          <IconComponent />
        </div>

        {/* Title */}
        <h3 className={`text-xl font-semibold mb-3 ${
          isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]/40'
        }`}>
          {title}
        </h3>

        {/* Description */}
        <p className={`text-sm leading-relaxed ${
          isActive ? 'text-[var(--text-secondary)]' : 'text-[var(--text-secondary)]/30'
        }`}>
          {description}
        </p>

        {/* Glow effect on hover */}
        {isActive && (
          <div className="absolute inset-0 rounded-brand opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-[var(--glow)]/5 to-transparent"></div>
        )}
      </motion.div>
    </Link>
  )
}
