'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useState } from 'react'

export default function UnifiedHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="fixed w-full z-50 glass border-b border-[var(--glass-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="relative w-14 h-14">
            <Image 
              src="/branding/logo_rm_bk.png" 
              alt="Claw.Click" 
              width={56}
              height={56}
              className="object-contain"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold gradient-text">claw.click</span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-[var(--mint-light)]/20 text-[var(--mint-dark)] border border-[var(--mint-mid)]/30 rounded uppercase tracking-wide">BETA</span>
            </div>
            <span className="text-xs text-[var(--text-secondary)]">Autonomous Framework</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/docs" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">
            Docs
          </Link>
          <Link href="/skill" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">
            Skill.md
          </Link>
          <Link href="/readme" className="text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors">
            README
          </Link>
          <a 
            href="https://t.me/clawclickbot" 
            target="_blank" 
            rel="noopener noreferrer"
            className="electric-button px-4 py-2 rounded-lg font-semibold text-sm"
          >
            ClawClick Bot
          </a>
          <ConnectButton />
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--mint-dark)]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--glass-border)] glass">
          <div className="px-4 py-4 space-y-3">
            <Link
              href="/docs"
              className="block text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Docs
            </Link>
            <Link
              href="/skill"
              className="block text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Skill.md
            </Link>
            <Link
              href="/readme"
              className="block text-sm text-[var(--text-secondary)] hover:text-[var(--mint-dark)] transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              README
            </Link>
            <a 
              href="https://t.me/clawclickbot" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block electric-button px-4 py-2 rounded-lg font-semibold text-sm text-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              ClawClick Bot
            </a>
            <div className="pt-3">
              <ConnectButton />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
