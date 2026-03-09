'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

const products = [
  {
    name: 'claw.click',
    url: 'https://claw.click',
    description: 'AUTONOMOUS Framework: Spawn, Identity and Tokenization Protocol with Agent Sessions',
    isLive: true,
  },
  {
    name: 'claw.launch',
    url: '/launch',
    description: 'Custom Multichain V4 powered Launchpad for Agents, Launch and Earn Protocol Fees',
    isLive: true,
  },
  {
    name: 'claw.locker',
    url: '/locker',
    description: 'Multi-sig Agent wallet. Micro-Payments, API and Secret Encryption Store',
    isLive: false,
  },
]

interface ProductsDropdownProps {
  mobile?: boolean
  onItemClick?: () => void
}

export default function ProductsDropdown({ mobile = false, onItemClick }: ProductsDropdownProps = {}) {
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

  const handleProductClick = () => {
    setIsOpen(false)
    onItemClick?.()
  }

  if (mobile) {
    // Mobile: Always expanded, no dropdown behavior
    return (
      <div className="w-full">
        <h3 className="text-lg font-bold gradient-text mb-3 text-center">🎁 Products</h3>
        <div className="space-y-3">
          {products.map((product) => (
            <a
              key={product.name}
              href={product.url}
              onClick={handleProductClick}
              className="block p-4 rounded-xl glass glass-hover transition-all"
              target={product.url.startsWith('http') ? '_blank' : '_self'}
              rel={product.url.startsWith('http') ? 'noopener noreferrer' : ''}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-[var(--text-primary)]">{product.name}</span>
                {product.isLive && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--mint-mid)] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--mint-dark)]"></span>
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{product.description}</p>
            </a>
          ))}
        </div>
      </div>
    )
  }

  // Desktop: Dropdown behavior
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors flex items-center gap-1"
      >
        🎁 Products
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
        <div className="fixed top-20 right-4 mt-2 w-96 glass border border-[var(--mint-mid)]/20 rounded-lg shadow-xl overflow-hidden z-[60]">
          <div className="p-4">
            <h3 className="text-sm font-bold gradient-text mb-3">$CC Products</h3>
            <div className="space-y-3">
              {products.map((product) => (
                <a
                  key={product.name}
                  href={product.url}
                  onClick={handleProductClick}
                  className="block p-3 rounded-lg glass glass-hover transition-all"
                  target={product.url.startsWith('http') ? '_blank' : '_self'}
                  rel={product.url.startsWith('http') ? 'noopener noreferrer' : ''}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-[var(--text-primary)] text-sm">{product.name}</span>
                    {product.isLive && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--mint-mid)] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--mint-dark)]"></span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{product.description}</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
