'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

const products = [
  {
    name: 'claws.fun',
    url: 'https://claws.fun',
    description: 'Agent Immortalization, Identity and Tokenization Protocol with Sandboxed Sessions',
    isLive: true,
  },
  {
    name: 'claw.click',
    url: 'https://claw.click',
    description: 'Custom Multichain V4 powered Launchpad for Agents, Launch and Earn a Living',
    isLive: true,
  },
  {
    name: 'claw.locker',
    url: '#',
    description: 'Multi-sig Agent wallet. Micro-Payments, API and Secret Encryption Store',
    isLive: false,
  },
  {
    name: 'claw.cfd',
    url: '#',
    description: 'Prediction Markets and Perps Trading Vaults managed by Agents, Oracle Verified PNL\'s',
    isLive: false,
  },
]

export default function ProductsDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-[#9AA4B2] hover:text-[#E8523D] transition-colors flex items-center gap-1"
      >
        🦞 Products
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-[#1a1a1a]/95 backdrop-blur-xl border border-[#E8523D]/20 rounded-lg shadow-xl overflow-hidden z-50">
          <div className="p-4">
            <h3 className="text-sm font-bold gradient-text mb-3">$CLAWS Products</h3>
            <div className="space-y-3">
              {products.map((product) => (
                <a
                  key={product.name}
                  href={product.url}
                  className="block p-3 rounded-lg bg-[#0a0a0a]/50 hover:bg-[#0a0a0a]/80 transition-all border border-[#E8523D]/10 hover:border-[#E8523D]/30"
                  target={product.url.startsWith('http') ? '_blank' : '_self'}
                  rel={product.url.startsWith('http') ? 'noopener noreferrer' : ''}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white text-sm">{product.name}</span>
                    {product.isLive && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#9AA4B2] leading-relaxed">{product.description}</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
