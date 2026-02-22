'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import ProductsDropdown from './ProductsDropdown'

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

  return (
    <>
      {/* Hamburger Button - Only visible on mobile */}
      <button
        onClick={toggleMenu}
        className="md:hidden flex flex-col justify-center items-center w-10 h-10 rounded-lg hover:bg-[#E8523D]/10 transition-colors"
        aria-label="Toggle menu"
      >
        <span className={`block w-6 h-0.5 bg-[#E8523D] transition-all ${isOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
        <span className={`block w-6 h-0.5 bg-[#E8523D] my-1 transition-all ${isOpen ? 'opacity-0' : ''}`}></span>
        <span className={`block w-6 h-0.5 bg-[#E8523D] transition-all ${isOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
      </button>

      {/* Mobile Menu Overlay - Full screen */}
      <div
        className={`fixed inset-0 bg-[#1a1a1a]/95 backdrop-blur-xl z-50 md:hidden transition-all duration-300 ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={closeMenu}
          className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center rounded-lg hover:bg-[#E8523D]/10 transition-colors"
          aria-label="Close menu"
        >
          <svg className="w-6 h-6 text-[#E8523D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Menu Content */}
        <nav className="flex flex-col items-center justify-center h-full gap-8 px-6">
          {/* Logo */}
          <Link href="/" onClick={closeMenu} className="mb-4">
            <span className="text-3xl font-bold gradient-text">Claw.Click</span>
          </Link>

          {/* Products Dropdown (mobile version) */}
          <div className="w-full max-w-sm">
            <ProductsDropdown mobile onItemClick={closeMenu} />
          </div>

          {/* Navigation Links */}
          <Link
            href="/docs"
            onClick={closeMenu}
            className="w-full max-w-sm text-center py-4 px-6 rounded-xl bg-[#2a2a2a] border border-[#E8523D]/20 text-white font-medium text-lg hover:border-[#E8523D]/40 transition-all"
          >
            📕 Docs
          </Link>

          <Link
            href="/readme"
            onClick={closeMenu}
            className="w-full max-w-sm text-center py-4 px-6 rounded-xl bg-[#2a2a2a] border border-[#E8523D]/20 text-white font-medium text-lg hover:border-[#E8523D]/40 transition-all"
          >
            📄 README
          </Link>

          <Link
            href="/skill"
            onClick={closeMenu}
            className="w-full max-w-sm text-center py-4 px-6 rounded-xl bg-[#2a2a2a] border border-[#E8523D]/20 text-white font-medium text-lg hover:border-[#E8523D]/40 transition-all"
          >
            🤖 Skill.md
          </Link>

          <Link
            href="https://www.claws.fun/thread/FUNLAN"
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeMenu}
            className="w-full max-w-sm text-center py-4 px-6 rounded-xl bg-[#2a2a2a] border border-[#E8523D]/20 text-white font-medium text-lg hover:border-[#E8523D]/40 transition-all"
          >
            🦞 FUNLAN Thread
          </Link>

          {/* Connect Button */}
          <div className="mt-4">
            <ConnectButton />
          </div>
        </nav>
      </div>
    </>
  )
}
