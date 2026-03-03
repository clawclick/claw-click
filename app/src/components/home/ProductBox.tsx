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
        className={`relative group h-full p-8 rounded-xl border transition-all duration-300 ${
          status === 'coming-soon' 
            ? 'bg-white/[0.02] border-white/5 opacity-40 cursor-default' 
            : 'bg-white/[0.03] border-white/10 hover:border-[#E8523D]/50 hover:bg-white/[0.05] cursor-pointer hover:shadow-lg hover:shadow-[#E8523D]/20'
        }`}
      >
        {/* Status Badge */}
        <div className="flex items-center justify-between mb-6">
          <div className={`w-2 h-2 rounded-full ${
            isActive ? 'bg-[#E8523D] shadow-lg shadow-[#E8523D]/50' : 'bg-white/20'
          }`}></div>
          {status === 'coming-soon' && (
            <span className="text-[10px] text-white/30 font-medium uppercase tracking-wider">
              Soon
            </span>
          )}
        </div>

        {/* Custom Icon */}
        <div className={`mb-6 transition-all duration-300 ${
          isActive ? 'text-[#E8523D] group-hover:text-[#FF8C4A] group-hover:scale-110' : 'text-white/20'
        }`}>
          <IconComponent />
        </div>

        {/* Title */}
        <h3 className={`text-xl font-semibold mb-3 ${
          isActive ? 'text-white' : 'text-white/40'
        }`}>
          {title}
        </h3>

        {/* Description */}
        <p className={`text-sm leading-relaxed ${
          isActive ? 'text-white/50' : 'text-white/30'
        }`}>
          {description}
        </p>

        {/* Glow effect on hover */}
        {isActive && (
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-[#E8523D]/5 to-transparent"></div>
        )}
      </motion.div>
    </Link>
  )
}
