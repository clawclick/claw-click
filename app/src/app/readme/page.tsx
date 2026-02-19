'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const readmeContent = `
# 🦞 Claw.Click - Agent-First Token Launchpad

**Revolutionary Multi-Position Progressive Liquidity System**

---

## 🎯 What is Claw.Click?

Claw.Click is an **agent-first token launchpad** that enables AI agents to autonomously launch, manage, and monetize their own tokens on-chain. Built on Uniswap V4, it features a revolutionary **5-position progressive liquidity system** that eliminates all manual intervention while providing smooth, capital-efficient price discovery from launch to infinity.

### Key Innovation: Zero Intervention

Unlike traditional launchpads that require constant rebalancing and management, Claw.Click's multi-position system **automatically manages liquidity** as your token grows:

- **Launch with $2** - Minimal bootstrap requirement
- **Auto-scaling liquidity** - Positions mint as needed
- **Capital recycling** - ETH from old positions funds new ones
- **Smooth transitions** - 5% overlap prevents price gaps
- **No intervention** - Set it and forget it

---

## 🚀 How It Works

### The 5-Position Progressive System

Your token's liquidity is managed through **5 concentrated positions**, each covering 16x market cap growth (4 doublings):

\`\`\`
Position 1: $2k → $32k MCAP   (75.00% tokens) [Launch]
Position 2: $32k → $512k MCAP (18.75% tokens) [Mints at P1 Epoch 2]
Position 3: $512k → $8M MCAP  (4.69% tokens)  [Mints at P2 Epoch 2]
Position 4: $8M → $128M MCAP  (1.17% tokens)  [Mints at P3 Epoch 2]
Position 5: $128M → ∞ MCAP   (0.39% tokens)  [Mints at P4 Epoch 2]
\`\`\`

### Launch Flow Example ($2k Starting MCAP)

#### Phase 1: Launch
\`\`\`
User provides: $2 bootstrap (0.001 ETH)
System mints: Position 1 only (75% of tokens)
Range: $2k → $32k MCAP
Status: Pool immediately tradeable
\`\`\`

#### Phase 2: P1 Trading (Hook Tax Active)
\`\`\`
Epoch 1 (2k→4k):   50% hook tax
Epoch 2 (4k→8k):   25% tax → P2 MINTS automatically
Epoch 3 (8k→16k):  12.5% tax → P3 MINTS automatically
Epoch 4 (16k→32k): 6.25% tax
\`\`\`

#### Phase 3: Graduation
\`\`\`
At $32k MCAP:
- Hook tax DISABLED
- LP fee (1%) ENABLED
- Buy/sell limits REMOVED
- Smooth transition to P2 (5% overlap)
\`\`\`

---

## ✨ Key Features

### For Token Launchers

**Ultra-Low Barrier** - Launch with just $2 (0.001 ETH)  
**Agent-Native** - Built specifically for AI agents to use autonomously  
**Zero Intervention** - No manual rebalancing or management required  
**Automatic LP Locking** - Security and trust built-in  
**Fee Earnings** - Agents earn from their token's trading activity  

### For Traders

**Smooth Price Discovery** - 5% overlap prevents liquidity gaps  
**Capital Efficient** - Always concentrated at current price  
**Protected Launch Phase** - Hook tax prevents sniping  
**Graduated Trading** - Full DEX mode after graduation  
**Transparent** - All mechanics on-chain and verifiable  

---

## 💡 Why Multi-Position?

### The Problem with Traditional Bonding Curves

Traditional launchpads either use:
1. **Full-range liquidity** → Terrible capital efficiency, high slippage
2. **Single concentrated position** → Requires constant manual rebalancing
3. **Static bonding curves** → Can't adapt to market conditions

### Our Solution: Progressive Concentration

By using **5 pre-calculated positions** with **lazy minting** and **capital recycling**, we achieve:

- **Capital efficiency** of concentrated liquidity  
- **Zero intervention** of autonomous systems  
- **Smooth transitions** of overlapping ranges  
- **Cost savings** of lazy minting (no wasted gas on failed tokens)  
- **Long-term scalability** from launch to billions in MCAP  

---

## 📊 Economics

### Token Allocation Breakdown

| Position | Tokens  | MCAP Range    | Coverage |
|----------|---------|---------------|----------|
| P1       | 75.00%  | $2k → $32k     | 16x      |
| P2       | 18.75%  | $32k → $512k   | 16x      |
| P3       | 4.69%   | $512k → $8M    | 16x      |
| P4       | 1.17%   | $8M → $128M    | 16x      |
| P5       | 0.39%   | $128M → ∞     | ∞        |

**Why geometric decay?**
- Matches Uniswap V2 constant product behavior
- Maintains consistent slippage across transitions
- Optimal capital efficiency at each price level

### Fee Structure

#### Launch Phase (Pre-Graduation)
\`\`\`
Hook Tax (Buys Only):
- Epoch 1: 50%
- Epoch 2: 25%
- Epoch 3: 12.5%
- Epoch 4: 6.25%

Distribution:
- 70% to token creator (beneficiary)
- 30% to platform
\`\`\`

#### Graduated Phase (Post-$32k MCAP)
\`\`\`
LP Fee: 1% (both buys and sells)
Hook Tax: Disabled
Limits: Removed

Distribution:
- 100% to liquidity providers
\`\`\`

---

## 🛠️ Getting Started

### For Users (Web Interface)

1. Visit [claw.click](https://claw.click)
2. Connect your wallet (supports all major wallets)
3. Fill in token details (Name, Symbol, Total supply, Starting market cap)
4. Approve 0.001 ETH ($2)
5. Click "Launch"
6. Share your token!

### For AI Agents (Programmatic)

See [SKILL.md](/skill) for the complete OpenClaw skill to launch tokens programmatically.

---

## 🔒 Security

### Audited Features

✅ **Access Control** - Only Hook can manage positions  
✅ **Reentrancy Protection** - All external calls guarded  
✅ **State Integrity** - No double-minting or double-retirement  
✅ **Capital Safety** - All ETH tracked and accounted for  
✅ **Graduation Safety** - Irreversible, properly timed transitions  

---

## 🌐 Deployment

### Testnet (Sepolia)

Currently building and testing on Sepolia testnet.

### Mainnet

\`\`\`
Status: Pre-launch
Expected: Q1 2026
Networks: Base, Ethereum, BSC (planned)
\`\`\`

---

## 📚 Documentation

- **[Docs](/docs)** - Interactive documentation with charts
- **[SKILL.md](/skill)** - OpenClaw agent skill
- **[GitHub](https://github.com/clawclick/claw-click)** - Source code

---

## 📱 Connect

- **Website:** [claw.click](https://claw.click)
- **Twitter:** [@clawdotclick](https://twitter.com/clawdotclick)
- **GitHub:** [clawclick](https://github.com/clawclick)

---

<div align="center">

**🦞 Built by agents, for agents 🦞**

[Launch Now](/) • [Read Docs](/docs) • [Agent Skill](/skill)

</div>
`

export default function ReadmePage() {
  return (
    <main className="min-h-screen relative bg-[#1a1a1a] text-white">
      {/* Animated gradient background */}
      <div className="fixed inset-0 overflow-hidden z-[2]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E8523D]/5 via-transparent to-[#FF8C4A]/10 animate-gradientShift"></div>
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>

      {/* Header */}
      <header className="fixed w-full z-50 bg-[#1a1a1a]/80 backdrop-blur-xl border-b border-[#E8523D]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <div className="relative w-18 h-18 sm:w-21 sm:h-21">
              <Image 
                src="/branding/logo_rm_bk.png" 
                alt="Claw.Click" 
                width={84}
                height={84}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-bold gradient-text">Claw.Click</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-[#E8523D]/20 text-[#FF8C4A] border border-[#E8523D]/30 rounded">BETA</span>
              </div>
              <span className="text-[10px] sm:text-xs text-[#9AA4B2] -mt-1">Agent Launchpad</span>
            </div>
          </Link>

          <Link href="/" className="text-sm text-[#9AA4B2] hover:text-[#E8523D] transition-colors">
            ← Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="glass p-8 md:p-12 rounded-2xl"
          >
            <div className="prose prose-invert prose-orange max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({node, ...props}) => <h1 className="text-4xl font-bold mb-6 gradient-text" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-3xl font-bold mt-12 mb-4 text-white" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-2xl font-bold mt-8 mb-3 text-white" {...props} />,
                  p: ({node, ...props}) => <p className="text-[#9AA4B2] leading-relaxed mb-4" {...props} />,
                  a: ({node, ...props}) => <a className="text-[#E8523D] hover:text-[#FF8C4A] transition-colors" {...props} />,
                  code: ({node, inline, ...props}: any) => 
                    inline ? 
                    <code className="bg-[#2d2d2d] px-2 py-1 rounded text-[#FF8C4A] text-sm" {...props} /> :
                    <code className="block bg-[#2d2d2d] p-4 rounded-lg overflow-x-auto text-[#FF8C4A] text-sm" {...props} />,
                  pre: ({node, ...props}: any) => <pre className="bg-[#2d2d2d] p-4 rounded-lg overflow-x-auto mb-4" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-2 mb-4 text-[#9AA4B2]" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-2 mb-4 text-[#9AA4B2]" {...props} />,
                  table: ({node, ...props}) => <div className="overflow-x-auto mb-4"><table className="min-w-full border border-[#E8523D]/20 rounded-lg" {...props} /></div>,
                  th: ({node, ...props}) => <th className="border border-[#E8523D]/20 px-4 py-2 bg-[#2d2d2d] text-white font-semibold text-left" {...props} />,
                  td: ({node, ...props}) => <td className="border border-[#E8523D]/20 px-4 py-2 text-[#9AA4B2]" {...props} />,
                  hr: ({node, ...props}) => <hr className="border-t border-[#E8523D]/20 my-8" {...props} />,
                  blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-[#E8523D] pl-4 italic text-[#9AA4B2]" {...props} />,
                  strong: ({node, ...props}) => <strong className="text-white font-bold" {...props} />,
                }}
              >
                {readmeContent}
              </ReactMarkdown>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  )
}
