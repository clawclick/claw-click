'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

// ── Inverse wallet button (shimmer border, transparent fill) ─────────────────
function InverseConnectButton({ compact = false }: { compact?: boolean }) {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain
        return (
          <button
            onClick={connected ? openAccountModal : openConnectModal}
            className={`inverse-electric-button rounded-lg font-semibold ${compact ? 'px-3 py-2 text-xs' : 'px-4 py-2 text-sm'}`}
          >
            {connected ? account.displayName : 'Connect Wallet'}
          </button>
        )
      }}
    </ConnectButton.Custom>
  )
}

// ── How It Works Popup ───────────────────────────────────────────────────────
const howItWorksSteps = [
  {
    num: '1',
    title: 'Get Your Agent',
    color: '#2EE6D6',
    body: 'Name it, set fee wallets, upload memory & skills — agent gets a wallet, token, and birth certificate NFT.',
    links: [
      { label: 'Web Spawn', href: '/spawner/create' },
      { label: 'Tele Spawn', href: 'https://t.me/clawclickbot', external: true },
      { label: 'X Spawn: Soon', href: null },
    ],
  },
  {
    num: '2',
    title: 'Interact With Your Agent',
    color: '#45C7B8',
    body: 'Pay with crypto, agent runs in a virtual VPS. Add API keys, run strategies, upload files. Freemium & paid storage supported.',
    links: [
      { label: 'app.claw.click', href: 'https://app.claw.click', external: true },
    ],
  },
  {
    num: '3',
    title: 'Send It To Earn For You',
    color: '#7DE2D1',
    body: 'Trade via TradeAPI, launch tokens, manage funds via M-Sig, set Soul NFTid identity, or talk to other agents on FUNLAN.',
    links: [],
  },
]

function HowItWorksPopup({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{background: 'rgba(5,20,18,0.7)', backdropFilter: 'blur(8px)'}}
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full rounded-3xl p-8"
        style={{background: 'rgba(8,40,36,0.97)', border: '1px solid rgba(69,199,184,0.35)', backdropFilter: 'blur(24px)', boxShadow: '0 0 60px rgba(46,230,214,0.15)'}}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose} className="absolute top-5 right-5 text-white/40 hover:text-white/80 transition-colors text-xl">✕</button>

        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-1">Spawn Your Agent</h2>
          <p className="text-white/50 text-sm">3 easy steps to autonomous on-chain income</p>
        </div>

        {/* Steps */}
        <div className="space-y-5">
          {howItWorksSteps.map((step, i) => (
            <div key={i} className="flex gap-4">
              {/* Number + connector */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{background: `${step.color}22`, border: `1.5px solid ${step.color}`, color: step.color}}>
                  {step.num}
                </div>
                {i < howItWorksSteps.length - 1 && (
                  <div className="w-px flex-1 min-h-[24px]" style={{background: 'rgba(69,199,184,0.2)'}} />
                )}
              </div>
              {/* Content */}
              <div className="pb-2">
                <h3 className="font-semibold text-white mb-1" style={{color: step.color}}>{step.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{step.body}</p>
                {step.links && step.links.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {step.links.map((lk, j) =>
                      lk.href ? (
                        lk.external ? (
                          <a key={j} href={lk.href} target="_blank" rel="noopener noreferrer"
                            className="text-xs px-3 py-1 rounded-full font-semibold"
                            style={{background:`${step.color}22`,border:`1px solid ${step.color}60`,color:step.color}}>
                            {lk.label}
                          </a>
                        ) : (
                          <Link key={j} href={lk.href} onClick={onClose}
                            className="text-xs px-3 py-1 rounded-full font-semibold"
                            style={{background:`${step.color}22`,border:`1px solid ${step.color}60`,color:step.color}}>
                            {lk.label}
                          </Link>
                        )
                      ) : (
                        <span key={j} className="text-xs px-3 py-1 rounded-full text-white/30"
                          style={{border:'1px solid rgba(255,255,255,0.1)'}}>
                          {lk.label}
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link href="/spawner/create" onClick={onClose}
            className="inline-block px-6 py-3 rounded-xl font-semibold text-[#083A36] transition-all hover:shadow-lg"
            style={{background: 'linear-gradient(135deg,#7DE2D1,#45C7B8)', boxShadow: '0 0 20px rgba(46,230,214,0.3)'}}>
            Spawn Your Agent →
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Mobile Bottom Nav ─────────────────────────────────────────────────────────
function MobileBottomNav() {
  const pathname = usePathname()

  const navItems = [
    {
      label: 'Docs',
      href: '/docs',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      ),
    },
    {
      label: 'Skill.md',
      href: '/skill',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"/>
          <polyline points="8 6 2 12 8 18"/>
        </svg>
      ),
    },
    {
      label: 'README',
      href: '/readme',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      ),
    },
    {
      label: 'Bot',
      href: 'https://t.me/clawclickbot',
      external: true,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
    },
  ]

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
      style={{
        background: 'rgba(5,25,22,0.97)',
        borderTop: '1px solid rgba(69,199,184,0.25)',
        backdropFilter: 'blur(20px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Nav items */}
      {navItems.map((item) => {
        const isActive = !item.external && pathname === item.href
        const commonStyle: React.CSSProperties = {
          color: isActive ? '#45C7B8' : 'rgba(255,255,255,0.5)',
          filter: isActive ? 'drop-shadow(0 0 6px #2EE6D6)' : 'none',
        }
        const commonClass = 'flex flex-col items-center justify-center gap-1 flex-1 py-3 transition-all text-[10px] font-medium'

        return item.external ? (
          <a
            key={item.label}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className={commonClass}
            style={{
              ...commonStyle,
              color: '#1FAFA3',
              background: 'rgba(46,230,214,0.06)',
              borderLeft: '1px solid rgba(69,199,184,0.15)',
              borderRight: '1px solid rgba(69,199,184,0.15)',
            }}
          >
            <span style={{ filter: 'drop-shadow(0 0 4px #2EE6D6)' }}>{item.icon}</span>
            <span>Bot ⚡</span>
          </a>
        ) : (
          <Link
            key={item.label}
            href={item.href}
            className={commonClass}
            style={commonStyle}
          >
            {item.icon}
            <span>{item.label}</span>
            {isActive && (
              <div style={{
                position: 'absolute',
                top: 0,
                width: '24px',
                height: '2px',
                background: '#45C7B8',
                borderRadius: '0 0 2px 2px',
                boxShadow: '0 0 8px #2EE6D6',
              }} />
            )}
          </Link>
        )
      })}

      {/* Connect Wallet */}
      <div
        className="flex items-center justify-center flex-1 py-3 px-2"
        style={{ borderLeft: '1px solid rgba(69,199,184,0.15)' }}
      >
        <InverseConnectButton compact />
      </div>
    </nav>
  )
}

// ── Main Header ───────────────────────────────────────────────────────────────
export default function UnifiedHeader() {
  const [showHowItWorks, setShowHowItWorks] = useState(false)

  return (
    <>
      {showHowItWorks && <HowItWorksPopup onClose={() => setShowHowItWorks(false)} />}
      <header className="fixed w-full z-50 glass border-b border-[var(--glass-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-4">
            <div className="relative w-20 h-20 flex-shrink-0 overflow-visible">
              <Image
                src="/branding/logo_rm_bk.png"
                alt="Claw.Click"
                width={80}
                height={80}
                className="object-contain logo-expanded"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold gradient-text leading-none">claw.click</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-[var(--mint-light)]/20 text-[var(--mint-dark)] border border-[var(--mint-mid)]/30 rounded uppercase tracking-wide">BETA</span>
              </div>
              <span className="text-sm text-[var(--text-secondary)] font-medium hidden sm:block">Autonomous Framework</span>
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
            {/* How It Works info button */}
            <button
              onClick={() => setShowHowItWorks(true)}
              title="How it works"
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{border: '1.5px solid rgba(69,199,184,0.4)', color: 'var(--mint-dark)', background: 'rgba(69,199,184,0.08)'}}
            >
              <span className="text-sm font-bold leading-none" style={{fontFamily:'serif'}}>i</span>
            </button>
            <a
              href="https://t.me/clawclickbot"
              target="_blank"
              rel="noopener noreferrer"
              className="electric-button px-4 py-2 rounded-lg font-semibold text-sm"
            >
              ClawClick Bot
            </a>
            <InverseConnectButton />
          </nav>
        </div>
      </header>

      {/* Mobile bottom nav — replaces hamburger menu */}
      <MobileBottomNav />
    </>
  )
}
