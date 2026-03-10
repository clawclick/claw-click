'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { motion, AnimatePresence } from 'framer-motion'

export function MobileHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const menuItems = [
    { label: 'Docs', href: '/docs' },
    { label: 'Skill.md', href: '/skill' },
    { label: 'README', href: '/readme' },
  ]

  return (
    <header className="fixed w-full z-50 glass border-b border-[var(--glass-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Mobile Header */}
        <div className="md:hidden py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="relative w-12 h-12 flex-shrink-0">
              <Image 
                src="/branding/logo_rm_bk.png" 
                alt="Claw.Click" 
                width={48}
                height={48}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold gradient-text leading-none">
                claw.click
              </span>
              <span className="text-xs text-[var(--text-secondary)] font-medium">
                BETA
              </span>
            </div>
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex py-4 items-center justify-between">
          <Link href="/" className="flex items-center gap-4">
            <div className="relative w-16 h-16 flex-shrink-0 overflow-visible">
              <Image 
                src="/branding/logo_rm_bk.png" 
                alt="Claw.Click" 
                width={64}
                height={64}
                className="object-contain logo-expanded"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold gradient-text leading-none">
                  claw.click
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-[var(--mint-light)]/20 text-[var(--mint-dark)] border border-[var(--mint-mid)]/30 rounded uppercase tracking-wide">
                  BETA
                </span>
              </div>
              <span className="text-sm text-[var(--text-secondary)] font-medium">Autonomous Framework</span>
            </div>
          </Link>

          <nav className="flex items-center gap-6">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <a 
              href="https://t.me/clawclickbot" 
              target="_blank" 
              rel="noopener noreferrer"
              className="electric-button px-4 py-2 rounded-lg font-semibold text-sm"
            >
              🤖 ClawClick
            </a>
            <ConnectButton.Custom>
              {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
                const connected = mounted && account && chain
                return (
                  <button
                    onClick={connected ? openAccountModal : openConnectModal}
                    className="inverse-electric-button px-4 py-2 rounded-lg font-semibold text-sm"
                  >
                    {connected ? account.displayName : 'Connect'}
                  </button>
                )
              }}
            </ConnectButton.Custom>
          </nav>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-[var(--glass-border)] bg-[var(--bg-primary)]/95 backdrop-blur-sm"
            >
              <nav className="py-4 space-y-4">
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
                
                <div className="px-4 py-2 space-y-3">
                  <a 
                    href="https://t.me/clawclickbot" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block w-full text-center electric-button px-4 py-3 rounded-lg font-semibold text-sm"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    🤖 ClawClick
                  </a>
                  
                  <ConnectButton.Custom>
                    {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
                      const connected = mounted && account && chain
                      return (
                        <button
                          onClick={() => {
                            if (connected) {
                              openAccountModal()
                            } else {
                              openConnectModal()
                            }
                            setIsMenuOpen(false)
                          }}
                          className="block w-full inverse-electric-button px-4 py-3 rounded-lg font-semibold text-sm"
                        >
                          {connected ? account.displayName : 'Connect Wallet'}
                        </button>
                      )
                    }}
                  </ConnectButton.Custom>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}