'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useState } from 'react'

export default function UnifiedHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="fixed w-full z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="relative w-8 h-8">
            <Image 
              src="/branding/logo_rm_bk.png" 
              alt="Claw.Click" 
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-white">claw.click</span>
            <span className="px-2 py-0.5 text-[9px] font-medium bg-white/5 text-white/40 border border-white/10 rounded">ALPHA</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/immortal" className="text-sm text-white/50 hover:text-white transition-colors">
            Immortalize
          </Link>
          <Link href="/launch" className="text-sm text-white/50 hover:text-white transition-colors">
            Launch
          </Link>
          <Link href="/docs" className="text-sm text-white/50 hover:text-white transition-colors">
            Docs
          </Link>
          <Link href="/skill" className="text-sm text-white/50 hover:text-white transition-colors">
            🦞 Skill
          </Link>
          <ConnectButton />
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-white/50 hover:text-white"
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
        <div className="md:hidden border-t border-white/5 bg-black/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-3">
            <Link
              href="/immortal"
              className="block text-sm text-white/50 hover:text-white transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Immortalize
            </Link>
            <Link
              href="/launch"
              className="block text-sm text-white/50 hover:text-white transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Launch
            </Link>
            <Link
              href="/docs"
              className="block text-sm text-white/50 hover:text-white transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Docs
            </Link>
            <Link
              href="/skill"
              className="block text-sm text-white/50 hover:text-white transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Skill
            </Link>
            <div className="pt-3">
              <ConnectButton />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
