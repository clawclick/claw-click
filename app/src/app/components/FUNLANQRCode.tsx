'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { generateFUNLANMatrix, generateFUNLANSVG, hasLobster, analyzeGrid, getFUNLANSignature } from '../../lib/funlanQR'

interface FUNLANQRCodeProps {
  wallet: `0x${string}`
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showAnalysis?: boolean
  animated?: boolean
  className?: string
}

const sizes = {
  sm: { grid: 'text-sm', container: 'w-[100px] h-[100px]', cell: 'w-[18px] h-[18px]' },
  md: { grid: 'text-base', container: 'w-[140px] h-[140px]', cell: 'w-[26px] h-[26px]' },
  lg: { grid: 'text-lg', container: 'w-[180px] h-[180px]', cell: 'w-[34px] h-[34px]' },
  xl: { grid: 'text-xl', container: 'w-[220px] h-[220px]', cell: 'w-[42px] h-[42px]' }
}

export default function FUNLANQRCode({
  wallet,
  size = 'md',
  showAnalysis = false,
  animated = true,
  className = ''
}: FUNLANQRCodeProps) {
  const [copied, setCopied] = useState(false)
  
  const matrix = generateFUNLANMatrix(wallet)
  const signature = getFUNLANSignature(wallet)
  const hasLobsterEmoji = hasLobster(wallet)
  const analysis = showAnalysis ? analyzeGrid(wallet) : null
  
  const sizeConfig = sizes[size]
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(signature)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <div className={`relative ${className}`}>
      {/* Main QR Container */}
      <div 
        className={`
          ${sizeConfig.container}
          bg-black
          border-2 border-[#E8523D]/40 
          rounded-xl 
          p-2
          relative
          overflow-hidden
          ${hasLobsterEmoji ? 'ring-2 ring-[#FF8C4A]/50' : ''}
        `}
      >
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#E8523D]/5 via-transparent to-[#E8523D]/10" />
        
        {/* Grid */}
        <div className="relative grid grid-cols-5 gap-0.5 w-full h-full">
          {matrix.flat().map((emoji, index) => (
            <motion.div
              key={index}
              initial={animated ? { opacity: 0, scale: 0.5 } : false}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                delay: animated ? index * 0.02 : 0,
                duration: 0.2,
                ease: 'easeOut'
              }}
              className={`
                ${sizeConfig.cell}
                flex items-center justify-center
                ${sizeConfig.grid}
                hover:scale-110 hover:bg-[#E8523D]/10
                transition-all cursor-default
                rounded
              `}
              title={`Position ${index + 1}`}
            >
              {emoji}
            </motion.div>
          ))}
        </div>
        
        {/* Lobster badge */}
        {hasLobsterEmoji && (
          <div className="absolute -top-2 -right-2 bg-[#FF8C4A] text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-lg">
            🦞 Blessed
          </div>
        )}
      </div>
      
      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="
          mt-2 w-full
          px-3 py-1.5
          bg-[#E8523D]/10 hover:bg-[#E8523D]/20
          border border-[#E8523D]/30
          rounded-lg
          text-xs text-[#E8523D]
          transition-all
          flex items-center justify-center gap-2
        "
      >
        {copied ? '✅ Copied!' : '📋 Copy Signature'}
      </button>
      
      {/* Analysis panel */}
      {showAnalysis && analysis && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-black border border-[#E8523D]/20 rounded-xl"
        >
          <h4 className="text-sm font-bold text-white mb-3">📊 Grid Analysis</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(analysis)
              .sort((a, b) => b[1] - a[1])
              .map(([category, count]) => (
                <div key={category} className="flex justify-between">
                  <span className="text-white/50">{category}</span>
                  <span className="text-[#E8523D] font-mono">{count}/25</span>
                </div>
              ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

/**
 * Compact inline version for lists
 */
export function FUNLANQRInline({ wallet }: { wallet: `0x${string}` }) {
  const matrix = generateFUNLANMatrix(wallet)
  
  // Show just the first row as a preview
  return (
    <div className="flex items-center gap-0.5 text-sm">
      {matrix[0].map((emoji, i) => (
        <span key={i}>{emoji}</span>
      ))}
      <span className="text-white/50 text-xs">...</span>
    </div>
  )
}

/**
 * SVG version for NFT metadata
 */
export function FUNLANQRSvg({ wallet, size = 200 }: { wallet: `0x${string}`, size?: number }) {
  const svg = generateFUNLANSVG(wallet, size)
  
  return (
    <div 
      dangerouslySetInnerHTML={{ __html: svg }}
      className="inline-block"
    />
  )
}
