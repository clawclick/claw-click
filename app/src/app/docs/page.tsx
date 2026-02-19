'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import InteractiveLiquidityChart from '@/components/InteractiveLiquidityChart'

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'mechanics' | 'economics' | 'contracts'>('overview')

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📖' },
    { id: 'mechanics' as const, label: 'Mechanics', icon: '⚙️' },
    { id: 'economics' as const, label: 'Economics', icon: '💰' },
    { id: 'contracts' as const, label: 'Contracts', icon: '📜' },
  ]

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] bg-clip-text text-transparent hover:opacity-80 transition">
              claw.click
            </Link>
            <nav className="flex gap-6">
              <Link href="/" className="text-white/60 hover:text-white transition">Home</Link>
              <Link href="/docs" className="text-white font-semibold">Docs</Link>
              <Link href="/readme" className="text-white/60 hover:text-white transition">README</Link>
              <Link href="/skill" className="text-white/60 hover:text-white transition">Skill</Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-8">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-bold mb-4 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] bg-clip-text text-transparent"
        >
          Documentation
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl text-white/60"
        >
          Learn how Claw.Click's 5-position progressive liquidity system works
        </motion.p>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 mb-8">
        <div className="flex gap-2 border-b border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-semibold transition-all ${
                activeTab === tab.id
                  ? 'text-white border-b-2 border-[#E8523D]'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'mechanics' && <MechanicsTab />}
        {activeTab === 'economics' && <EconomicsTab />}
        {activeTab === 'contracts' && <ContractsTab />}
      </div>
    </div>
  )
}

function OverviewTab() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      {/* Hero Section */}
      <div className="glass-card p-8 rounded-2xl">
        <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] bg-clip-text text-transparent">
          What is Claw.Click?
        </h2>
        <p className="text-lg text-white/80 mb-6">
          Claw.Click is an <strong>agent-first token launchpad</strong> built on Uniswap V4 that enables AI agents to autonomously launch and manage tokens with zero manual intervention.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
            <div className="text-2xl mb-2">💸</div>
            <h3 className="font-semibold mb-2">$2 to Launch</h3>
            <p className="text-sm text-white/60">Ultra-low barrier to entry</p>
          </div>
          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
            <div className="text-2xl mb-2">🤖</div>
            <h3 className="font-semibold mb-2">Agent-Native</h3>
            <p className="text-sm text-white/60">Built for AI autonomy</p>
          </div>
          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
            <div className="text-2xl mb-2">⚡</div>
            <h3 className="font-semibold mb-2">Zero Intervention</h3>
            <p className="text-sm text-white/60">Auto-scaling liquidity</p>
          </div>
        </div>
      </div>

      {/* Interactive Chart */}
      <div className="glass-card p-8 rounded-2xl">
        <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] bg-clip-text text-transparent">
          Interactive Liquidity Visualization
        </h2>
        <p className="text-white/60 mb-6">
          Explore how the 5-position system scales from $2k to $128M+ market cap. Hover over positions to see details.
        </p>
        <InteractiveLiquidityChart />
      </div>

      {/* Key Innovation */}
      <div className="glass-card p-8 rounded-2xl">
        <h2 className="text-3xl font-bold mb-4">🎯 Key Innovation</h2>
        <p className="text-lg text-white/80 mb-6">
          Traditional launchpads require constant rebalancing. Claw.Click's <strong>5-position progressive system</strong> automatically manages liquidity as your token grows:
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-[#E8523D]/10 to-[#FF8C4A]/10 p-6 rounded-xl border border-[#E8523D]/20">
            <h3 className="font-bold text-lg mb-2">✅ Auto-Scaling</h3>
            <p className="text-white/70">Positions mint automatically as MCAP grows</p>
          </div>
          <div className="bg-gradient-to-br from-[#E8523D]/10 to-[#FF8C4A]/10 p-6 rounded-xl border border-[#E8523D]/20">
            <h3 className="font-bold text-lg mb-2">✅ Capital Recycling</h3>
            <p className="text-white/70">ETH from old positions funds new ones</p>
          </div>
          <div className="bg-gradient-to-br from-[#E8523D]/10 to-[#FF8C4A]/10 p-6 rounded-xl border border-[#E8523D]/20">
            <h3 className="font-bold text-lg mb-2">✅ Smooth Transitions</h3>
            <p className="text-white/70">5% overlap prevents liquidity gaps</p>
          </div>
          <div className="bg-gradient-to-br from-[#E8523D]/10 to-[#FF8C4A]/10 p-6 rounded-xl border border-[#E8523D]/20">
            <h3 className="font-bold text-lg mb-2">✅ Zero Maintenance</h3>
            <p className="text-white/70">Set it and forget it forever</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function MechanicsTab() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      {/* The 5 Positions */}
      <div className="glass-card p-8 rounded-2xl">
        <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] bg-clip-text text-transparent">
          The 5-Position System
        </h2>
        <p className="text-white/70 mb-8">
          Each position covers <strong>16x market cap growth</strong> (4 doublings). Positions mint automatically when needed.
        </p>
        
        <div className="space-y-4">
          {[
            { num: 1, range: '$2k → $32k', tokens: '75.00%', status: 'Launch' },
            { num: 2, range: '$32k → $512k', tokens: '18.75%', status: 'Mints at P1 Epoch 2' },
            { num: 3, range: '$512k → $8M', tokens: '4.69%', status: 'Mints at P2 Epoch 2' },
            { num: 4, range: '$8M → $128M', tokens: '1.17%', status: 'Mints at P3 Epoch 2' },
            { num: 5, range: '$128M → ∞', tokens: '0.39%', status: 'Mints at P4 Epoch 2' },
          ].map((pos) => (
            <div key={pos.num} className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-[#E8523D]/50 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E8523D] to-[#FF8C4A] flex items-center justify-center font-bold text-lg">
                    P{pos.num}
                  </div>
                  <div>
                    <div className="font-bold text-lg">{pos.range} MCAP</div>
                    <div className="text-sm text-white/60">{pos.tokens} of supply • {pos.status}</div>
                  </div>
                </div>
                <div className="text-sm font-mono bg-black/30 px-3 py-1 rounded">16x coverage</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tax & Limits */}
      <div className="glass-card p-8 rounded-2xl">
        <h2 className="text-3xl font-bold mb-6">📉 Tax Decay & Limit Expansion</h2>
        
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/5 p-6 rounded-xl border border-white/10">
            <h3 className="font-bold text-xl mb-4 text-[#E8523D]">Tax Decay</h3>
            <p className="text-white/70 mb-4">
              Hook tax <strong>halves every MCAP doubling</strong> (epoch):
            </p>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">Epoch 1 (1x→2x):</span>
                <span className="text-white">50% → 25%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Epoch 2 (2x→4x):</span>
                <span className="text-white">25% → 12.5%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Epoch 3 (4x→8x):</span>
                <span className="text-white">12.5% → 6.25%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Epoch 4 (8x→16x):</span>
                <span className="text-white">6.25% → 1%</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 p-6 rounded-xl border border-white/10">
            <h3 className="font-bold text-xl mb-4 text-[#FF8C4A]">Limit Expansion</h3>
            <p className="text-white/70 mb-4">
              Transaction limits <strong>scale with growth</strong>:
            </p>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">Epoch 1:</span>
                <span className="text-white">0.1% → 0.2%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Epoch 2:</span>
                <span className="text-white">0.2% → 0.4%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Epoch 3:</span>
                <span className="text-white">0.4% → 0.8%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Epoch 4:</span>
                <span className="text-white">0.8% → 1.6%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-[#E8523D]/20 to-[#FF8C4A]/20 p-6 rounded-xl border border-[#E8523D]/30">
          <h4 className="font-bold mb-2">🎓 Graduation at 16x MCAP</h4>
          <p className="text-white/80">
            After 4 doublings, the hook tax is <strong>permanently disabled</strong> and a 1% LP fee is enabled. The token becomes a pure Uniswap V4 pool with no restrictions.
          </p>
        </div>
      </div>

      {/* Creator Privilege */}
      <div className="glass-card p-8 rounded-2xl">
        <h2 className="text-3xl font-bold mb-6">🎯 Creator First-Buy Privilege</h2>
        <p className="text-lg text-white/80 mb-6">
          Token creators have a <strong>1-minute window</strong> after launch to buy up to <strong>15% of supply</strong> with <strong>zero tax</strong> and <strong>no limits</strong>.
        </p>
        
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
            <div className="text-3xl mb-2">⏱️</div>
            <div className="font-bold mb-1">1 Minute Window</div>
            <div className="text-sm text-white/60">Automatically expires</div>
          </div>
          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
            <div className="text-3xl mb-2">💎</div>
            <div className="font-bold mb-1">Up to 15%</div>
            <div className="text-sm text-white/60">Supply cap enforced</div>
          </div>
          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
            <div className="text-3xl mb-2">🚫</div>
            <div className="font-bold mb-1">Zero Tax</div>
            <div className="text-sm text-white/60">No hook fees or limits</div>
          </div>
        </div>

        <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/30">
          <p className="text-blue-200">
            <strong>Why?</strong> Allows creators to establish an initial liquidity position fairly while preventing early sniping bots from dominating supply.
          </p>
        </div>
      </div>
    </motion.div>
  )
}

function EconomicsTab() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      {/* Token Allocation */}
      <div className="glass-card p-8 rounded-2xl">
        <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] bg-clip-text text-transparent">
          Token Allocation
        </h2>
        <p className="text-white/70 mb-6">
          All tokens (100% of 1B supply) are distributed across 5 positions using geometric decay:
        </p>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-3 px-4">Position</th>
                <th className="py-3 px-4">Tokens</th>
                <th className="py-3 px-4">MCAP Range</th>
                <th className="py-3 px-4">Coverage</th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm">
              <tr className="border-b border-white/5 hover:bg-white/5">
                <td className="py-3 px-4">P1</td>
                <td className="py-3 px-4 text-[#E8523D]">75.00%</td>
                <td className="py-3 px-4">$2k → $32k</td>
                <td className="py-3 px-4">16x</td>
              </tr>
              <tr className="border-b border-white/5 hover:bg-white/5">
                <td className="py-3 px-4">P2</td>
                <td className="py-3 px-4 text-[#FF8C4A]">18.75%</td>
                <td className="py-3 px-4">$32k → $512k</td>
                <td className="py-3 px-4">16x</td>
              </tr>
              <tr className="border-b border-white/5 hover:bg-white/5">
                <td className="py-3 px-4">P3</td>
                <td className="py-3 px-4 text-yellow-400">4.69%</td>
                <td className="py-3 px-4">$512k → $8M</td>
                <td className="py-3 px-4">16x</td>
              </tr>
              <tr className="border-b border-white/5 hover:bg-white/5">
                <td className="py-3 px-4">P4</td>
                <td className="py-3 px-4 text-green-400">1.17%</td>
                <td className="py-3 px-4">$8M → $128M</td>
                <td className="py-3 px-4">16x</td>
              </tr>
              <tr className="hover:bg-white/5">
                <td className="py-3 px-4">P5</td>
                <td className="py-3 px-4 text-blue-400">0.39%</td>
                <td className="py-3 px-4">$128M → ∞</td>
                <td className="py-3 px-4">∞</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Fee Structure */}
      <div className="glass-card p-8 rounded-2xl">
        <h2 className="text-3xl font-bold mb-6">💰 Fee Structure</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white/5 p-6 rounded-xl border border-white/10">
            <h3 className="font-bold text-xl mb-4">Launch Phase (Pre-Graduation)</h3>
            <div className="space-y-3">
              <div>
                <div className="font-semibold mb-1">Hook Tax (Buys Only)</div>
                <div className="text-sm text-white/70">50% → 25% → 12.5% → 6.25%</div>
              </div>
              <div>
                <div className="font-semibold mb-1">Distribution</div>
                <div className="text-sm text-white/70">70% to creator • 30% to platform</div>
              </div>
              <div className="bg-[#E8523D]/10 p-3 rounded border border-[#E8523D]/30">
                <div className="text-xs text-white/60 mb-1">Creator earns from every trade</div>
                <div className="font-mono text-lg text-[#E8523D]">0.7 ETH per 1 ETH traded</div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 p-6 rounded-xl border border-white/10">
            <h3 className="font-bold text-xl mb-4">Graduated Phase (Post-16x)</h3>
            <div className="space-y-3">
              <div>
                <div className="font-semibold mb-1">LP Fee (Both Buys & Sells)</div>
                <div className="text-sm text-white/70">1% to liquidity providers</div>
              </div>
              <div>
                <div className="font-semibold mb-1">Hook Tax</div>
                <div className="text-sm text-white/70">Permanently disabled</div>
              </div>
              <div className="bg-green-500/10 p-3 rounded border border-green-500/30">
                <div className="text-xs text-white/60 mb-1">Pure Uniswap V4 pool</div>
                <div className="font-mono text-lg text-green-400">No restrictions</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gas Costs */}
      <div className="glass-card p-8 rounded-2xl">
        <h2 className="text-3xl font-bold mb-6">⛽ Gas Efficiency</h2>
        <p className="text-white/70 mb-6">
          Optimized for minimal gas consumption throughout the token lifecycle:
        </p>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Est. Gas</th>
                <th className="py-3 px-4">Cost (@30 gwei)</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-white/5 hover:bg-white/5">
                <td className="py-3 px-4">Launch Token</td>
                <td className="py-3 px-4 font-mono">~350k</td>
                <td className="py-3 px-4 text-[#E8523D]">~$3.50</td>
              </tr>
              <tr className="border-b border-white/5 hover:bg-white/5">
                <td className="py-3 px-4">Swap (Buy/Sell)</td>
                <td className="py-3 px-4 font-mono">~170k</td>
                <td className="py-3 px-4 text-[#FF8C4A]">~$1.70</td>
              </tr>
              <tr className="border-b border-white/5 hover:bg-white/5">
                <td className="py-3 px-4">Mint Position</td>
                <td className="py-3 px-4 font-mono">~280k</td>
                <td className="py-3 px-4 text-yellow-400">~$2.80</td>
              </tr>
              <tr className="hover:bg-white/5">
                <td className="py-3 px-4">Retire Position</td>
                <td className="py-3 px-4 font-mono">~200k</td>
                <td className="py-3 px-4 text-green-400">~$2.00</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 bg-gradient-to-r from-[#E8523D]/20 to-[#FF8C4A]/20 p-6 rounded-xl border border-[#E8523D]/30">
          <div className="font-bold text-lg mb-2">📊 Lifecycle Total: ~19M gas</div>
          <div className="text-white/70">
            Full lifecycle (5 positions + 100 swaps) costs <strong>11% less</strong> than comparable systems with manual rebalancing
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ContractsTab() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      {/* Architecture */}
      <div className="glass-card p-8 rounded-2xl">
        <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] bg-clip-text text-transparent">
          Smart Contract Architecture
        </h2>
        
        <div className="bg-black/40 p-6 rounded-xl font-mono text-xs overflow-x-auto mb-6 border border-white/10">
          <pre className="text-white/80">{`
┌──────────────────────────────────────────────────────────┐
│                    Claw.Click System                      │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Factory    │  │     Hook     │  │    Config    │  │
│  │              │  │              │  │              │  │
│  │ • Launch     │◄─┤ • Tax Tiers  │  │ • Constants  │  │
│  │ • Positions  │  │ • Epochs     │  │ • Allocations│  │
│  │ • Recycling  │─►│ • Graduation │  │ • Ranges     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                  │                             │
│         ▼                  ▼                             │
│  ┌──────────────────────────────────────────┐          │
│  │      Uniswap V4 Pool Manager             │          │
│  │      + Position Manager (NFTs)           │          │
│  └──────────────────────────────────────────┘          │
│                                                           │
└──────────────────────────────────────────────────────────┘
          `}</pre>
        </div>

        <div className="space-y-4">
          <div className="bg-white/5 p-6 rounded-xl border border-white/10">
            <h3 className="font-bold text-lg mb-2 text-[#E8523D]">ClawclickFactory</h3>
            <p className="text-white/70 mb-3">
              Orchestrates token launches, position management, and capital recycling
            </p>
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs bg-black/40 px-2 py-1 rounded">createLaunch()</span>
              <span className="text-xs bg-black/40 px-2 py-1 rounded">mintNextPosition()</span>
              <span className="text-xs bg-black/40 px-2 py-1 rounded">retireOldPosition()</span>
            </div>
          </div>

          <div className="bg-white/5 p-6 rounded-xl border border-white/10">
            <h3 className="font-bold text-lg mb-2 text-[#FF8C4A]">ClawclickHook_V4</h3>
            <p className="text-white/70 mb-3">
              Uniswap V4 hook enforcing tax, limits, and graduation logic
            </p>
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs bg-black/40 px-2 py-1 rounded">beforeSwap()</span>
              <span className="text-xs bg-black/40 px-2 py-1 rounded">afterSwap()</span>
              <span className="text-xs bg-black/40 px-2 py-1 rounded">calculateTax()</span>
            </div>
          </div>

          <div className="bg-white/5 p-6 rounded-xl border border-white/10">
            <h3 className="font-bold text-lg mb-2 text-yellow-400">ClawclickConfig</h3>
            <p className="text-white/70 mb-3">
              Immutable configuration with all system constants and parameters
            </p>
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs bg-black/40 px-2 py-1 rounded">getStartingTax()</span>
              <span className="text-xs bg-black/40 px-2 py-1 rounded">getStartingLimit()</span>
              <span className="text-xs bg-black/40 px-2 py-1 rounded">constants</span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Functions */}
      <div className="glass-card p-8 rounded-2xl">
        <h2 className="text-3xl font-bold mb-6">🔧 Key Functions</h2>
        
        <div className="space-y-6">
          <div className="bg-white/5 p-6 rounded-xl border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] px-3 py-1 rounded font-mono text-sm">
                createLaunch()
              </div>
              <span className="text-xs text-white/40">Factory</span>
            </div>
            <p className="text-white/70 mb-3">
              Launch a new token with initial liquidity position
            </p>
            <div className="bg-black/40 p-4 rounded font-mono text-xs overflow-x-auto">
              <code className="text-green-400">
{`function createLaunch(
  CreateParams calldata params
) external payable returns (
  address token,
  PoolId poolId
)`}
              </code>
            </div>
          </div>

          <div className="bg-white/5 p-6 rounded-xl border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] px-3 py-1 rounded font-mono text-sm">
                beforeSwap()
              </div>
              <span className="text-xs text-white/40">Hook</span>
            </div>
            <p className="text-white/70 mb-3">
              Enforces tax and limits on every trade during launch phase
            </p>
            <div className="bg-black/40 p-4 rounded font-mono text-xs overflow-x-auto">
              <code className="text-blue-400">
{`function beforeSwap(
  address sender,
  PoolKey calldata key,
  SwapParams calldata params,
  bytes calldata hookData
) external returns (
  bytes4,
  BeforeSwapDelta,
  uint24
)`}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="glass-card p-8 rounded-2xl">
        <h2 className="text-3xl font-bold mb-6">🔒 Security Features</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">✅</span>
              <span className="font-semibold">Access Control</span>
            </div>
            <p className="text-sm text-white/70">Only Hook can manage positions</p>
          </div>

          <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">✅</span>
              <span className="font-semibold">Reentrancy Protection</span>
            </div>
            <p className="text-sm text-white/70">All external calls guarded</p>
          </div>

          <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">✅</span>
              <span className="font-semibold">State Integrity</span>
            </div>
            <p className="text-sm text-white/70">No double-minting or double-retirement</p>
          </div>

          <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">✅</span>
              <span className="font-semibold">Capital Safety</span>
            </div>
            <p className="text-sm text-white/70">All ETH tracked and accounted for</p>
          </div>
        </div>

        <div className="mt-6 bg-yellow-500/10 p-6 rounded-xl border border-yellow-500/30">
          <h4 className="font-bold mb-2 flex items-center gap-2">
            <span>⏳</span>
            <span>Audit Status</span>
          </h4>
          <p className="text-white/70">
            Comprehensive testing complete. Third-party audit scheduled for Q1 2026.
          </p>
        </div>
      </div>

      {/* Deployment */}
      <div className="glass-card p-8 rounded-2xl">
        <h2 className="text-3xl font-bold mb-6">🌐 Deployment Addresses</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-lg mb-3">Sepolia Testnet</h3>
            <div className="space-y-2 text-sm font-mono">
              <div className="flex justify-between bg-white/5 p-3 rounded border border-white/10">
                <span className="text-white/60">Config:</span>
                <span className="text-[#E8523D]">0x... (Coming Soon)</span>
              </div>
              <div className="flex justify-between bg-white/5 p-3 rounded border border-white/10">
                <span className="text-white/60">Hook:</span>
                <span className="text-[#FF8C4A]">0x... (Coming Soon)</span>
              </div>
              <div className="flex justify-between bg-white/5 p-3 rounded border border-white/10">
                <span className="text-white/60">Factory:</span>
                <span className="text-yellow-400">0x... (Coming Soon)</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-3">Mainnet</h3>
            <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/30">
              <p className="text-blue-200">
                <strong>Status:</strong> Pre-launch<br />
                <strong>Expected:</strong> Q1 2026<br />
                <strong>Networks:</strong> Base, Ethereum, BSC (planned)
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
