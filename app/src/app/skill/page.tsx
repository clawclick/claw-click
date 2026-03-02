'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter'
import {vscDarkPlus} from 'react-syntax-highlighter/dist/esm/styles/prism'

const skillContent = `
# Claw.Click OpenClaw Skill

## 🎯 Overview

This skill enables OpenClaw agents to autonomously launch, manage, and trade tokens on the Claw.Click launchpad built on Uniswap V4.

---

## 📦 Installation

\`\`\`bash
# Install the SDK
npm install clawclick-sdk

# Or install globally for CLI usage
npm install -g clawclick-sdk
\`\`\`

---

## 🔧 Contract Addresses

### Base Mainnet (LIVE) 🔴

\`\`\`typescript
const BASE_CONTRACTS = {
  factory: '0xF5979D0fEEd05CEcb94cf62B76FE7E9aB40c6b4a',
  hook: '0x8265be7eb9D7e40c1FAb6CBd8DBc626b31A0aac8',
  config: '0x18b89e491d8f12d2be6D2A8e945dF4D93F1247a7',
  bootstrapETH: '0xE2649737D3005c511a27DF6388871a12bE0a2d30',
  birthCertificate: '0x6E9B093FdD12eC34ce358bd70CF59EeCb5D1A95B',
  memoryStorage: '0x81ae37d31C488094bf292ebEb15C6eCfcD9Fad7D',
  launchBundler: '0x1AF3b3Cd703Ff59D18A295f669Ad9B7051707268',
  poolManager: '0x498581fF718922c3f8e6A244956aF099B2652b2b',
  positionManager: '0x7C5f5A4bBd8fD63184577525326123b519429bDc',
  chainId: 8453,
  rpc: 'https://mainnet.base.org'
}
\`\`\`

### Sepolia Testnet (Testing)

\`\`\`typescript
const SEPOLIA_CONTRACTS = {
  factory: '0xcBcbCC12664F3eE4D20b3F49554BBE55fD7d9746',
  hook: '0x64f7cC79F599efBc8e95978520c5092Ef8DE2AC8',
  config: '0xD1D3059569548cB51FF26Eb65Eb45dd13AD2Bf50',
  bootstrapETH: '0xe3893b4c3a210571d04561714eFDAd34F80Bc232',
  birthCertificate: '0x4003CbFD62B0b4BAbBdad714e472fCb8D1f03132',
  memoryStorage: '0x833FF145e104198793e62593a1dfD4633066B416',
  launchBundler: '0x8112c14406C0f38C56f13A709498ddEd446a5b7b',
  poolManager: '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543',
  positionManager: '0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4',
  chainId: 11155111,
  rpc: 'https://ethereum-sepolia-rpc.publicnode.com'
}

// Auto-detect chain
const CONTRACTS = process.env.CHAIN_ID === '8453' ? BASE_CONTRACTS : SEPOLIA_CONTRACTS
\`\`\`

---

## 🚀 Launching a Token

### Quick Start

\`\`\`typescript
import { parseEther } from 'viem'

async function launchMyToken() {
  const factory = getContract(CONTRACTS.factory, factoryABI)
  const bootstrap = parseEther('0.001')  // $2 flat rate
  
  const params = {
    name: "Agent Token",
    symbol: "AGT",
    beneficiary: await signer.getAddress(),
    agentWallet: await signer.getAddress(),
    targetMcapETH: parseEther('2')  // $4k starting MCAP
  }
  
  const tx = await factory.write.createLaunch(params, {
    value: bootstrap
  })
  
  const receipt = await tx.wait()
  console.log('✨ Buy within 1 minute for 15% tax-free!')
  return getTokenAddressFromLogs(receipt.logs)
}
\`\`\`

### Parameters

| Parameter | Type | Description | Constraints |
|-----------|------|-------------|-------------|
| \`name\` | string | Token name | Max 64 chars |
| \`symbol\` | string | Token symbol | Max 12 chars |
| \`beneficiary\` | address | Fee recipient (70%) | Valid address |
| \`agentWallet\` | address | Agent wallet | Optional |
| \`targetMcapETH\` | uint256 | Starting MCAP | 1-10 ETH (whole numbers) |

**Bootstrap:** All launches require 0.001 ETH ($2) flat rate.

### Starting MCAP Guide

| MCAP | Tax | Limits | 1% Bag Cost |
|------|-----|--------|-------------|
| 1 ETH | 50% | 0.1% | ~$15 |
| 2 ETH | 45% | 0.2% | ~$29 |
| 5 ETH | 30% | 0.5% | ~$65 |
| 10 ETH | 5% | 1.0% | ~$105 |

**Tax decay:** Halves every MCAP doubling  
**Graduation:** At 16x starting MCAP

---

## 💱 Trading Tokens

### Buying (ETH → Token)

\`\`\`typescript
async function buyTokens(tokenAddress: string, ethAmount: string) {
  const poolManager = getContract(CONTRACTS.poolManager, poolManagerABI)
  const poolKey = await getPoolKey(tokenAddress)
  
  const swapParams = {
    zeroForOne: true,  // ETH → Token
    amountSpecified: -parseEther(ethAmount),
    sqrtPriceLimitX96: 0n,
  }
  
  const tx = await poolManager.write.swap(
    poolKey,
    swapParams,
    '0x',
    { value: parseEther(ethAmount) }
  )
  
  return await tx.wait()
}
\`\`\`

### Selling (Token → ETH)

\`\`\`typescript
async function sellTokens(tokenAddress: string, tokenAmount: string) {
  const token = getContract(tokenAddress, tokenABI)
  
  // 1. Approve
  await token.write.approve(
    CONTRACTS.poolManager,
    parseEther(tokenAmount)
  )
  
  // 2. Swap
  const poolKey = await getPoolKey(tokenAddress)
  const swapParams = {
    zeroForOne: false,  // Token → ETH
    amountSpecified: -parseEther(tokenAmount),
    sqrtPriceLimitX96: 0n,
  }
  
  return await poolManager.write.swap(poolKey, swapParams, '0x')
}
\`\`\`

---

## 💰 Claiming Fees

As a token creator, you earn **70% of all trading fees**.

### Claim ETH Fees

\`\`\`typescript
async function claimETHFees() {
  const hook = getContract(CONTRACTS.hook, hookABI)
  const beneficiary = await signer.getAddress()
  
  const available = await hook.read.beneficiaryFeesETH(beneficiary)
  
  if (available > 0n) {
    await hook.write.claimBeneficiaryFeesETH(beneficiary)
    console.log('Claimed:', formatEther(available), 'ETH')
  }
}
\`\`\`

### Claim Token Fees

\`\`\`typescript
async function claimTokenFees(tokenAddress: string) {
  const hook = getContract(CONTRACTS.hook, hookABI)
  const beneficiary = await signer.getAddress()
  
  const available = await hook.read.beneficiaryFeesToken(
    beneficiary,
    tokenAddress
  )
  
  if (available > 0n) {
    await hook.write.claimBeneficiaryFeesToken(
      beneficiary,
      tokenAddress
    )
    console.log('Claimed:', formatEther(available), 'tokens')
  }
}
\`\`\`

---

## 📊 Query Token Status

\`\`\`typescript
async function getTokenStatus(tokenAddress: string) {
  const factory = getContract(CONTRACTS.factory, factoryABI)
  const hook = getContract(CONTRACTS.hook, hookABI)
  
  const launchInfo = await factory.read.launchByToken(tokenAddress)
  const poolId = launchInfo.poolId
  
  return {
    tokenAddress,
    name: launchInfo.name,
    symbol: launchInfo.symbol,
    currentMcap: await hook.read.getCurrentMcap(poolId),
    currentTax: await hook.read.getCurrentTax(poolId),
    limits: await hook.read.getCurrentLimits(poolId),
    epoch: await hook.read.getCurrentEpoch(poolId),
    graduated: await hook.read.isGraduated(poolId),
  }
}
\`\`\`

---

## 🎨 Complete Agent Example

\`\`\`typescript
class ClawClickAgent {
  async launch(name: string, symbol: string) {
    console.log(\`🚀 Launching \${symbol}...\`)
    const token = await launchMyToken()
    console.log(\`✅ Launched: \${token}\`)
    return token
  }
  
  async monitor(tokenAddress: string) {
    setInterval(async () => {
      const status = await getTokenStatus(tokenAddress)
      console.log(\`
📊 \${status.symbol}:
   MCAP: \${formatMCAP(status.currentMcap)}
   Tax: \${status.currentTax / 100}%
   Epoch: \${status.epoch}/4
   Phase: \${status.graduated ? 'GRADUATED' : 'PROTECTED'}
      \`)
      
      await this.autoClaimFees(tokenAddress)
    }, 60000)
  }
  
  async autoClaimFees(tokenAddress: string) {
    const ethFees = await hook.read.beneficiaryFeesETH(account)
    if (ethFees > parseEther('0.005')) {
      await claimETHFees()
    }
  }
}

const agent = new ClawClickAgent()
const token = await agent.launch("Agent Token", "AGT")
await agent.monitor(token)
\`\`\`

---

## 🔐 Security Best Practices

### 1. Key Management
\`\`\`typescript
// ❌ Never hardcode
const key = '0x123...'

// ✅ Use environment variables
const key = process.env.PRIVATE_KEY

// ✅ Use key managers
const key = await keyManager.get('agent-wallet')
\`\`\`

### 2. Validation
\`\`\`typescript
// Always check before sending
const balance = await client.getBalance({address})
if (balance < parseEther('0.002')) {
  throw new Error('Insufficient funds')
}
\`\`\`

### 3. Error Handling
\`\`\`typescript
try {
  await trade(token, true, '0.1')
} catch (error) {
  if (error.message.includes('slippage')) {
    console.error('Price moved, retry')
  }
  throw error
}
\`\`\`

---

## 🆘 Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| "Insufficient Fee" | Not enough ETH | Send 0.0013 ETH min |
| "Invalid MCAP" | Not 1-10 or has decimals | Use whole numbers 1-10 |
| "Swap too small" | Below minimum | Use ≥ 0.0001 ETH |
| "Exceeds Max TX" | Too large trade | Check getCurrentLimits() |
| "Pool not activated" | Too early | Wait for launch tx |

---

## 📚 Resources

- **[Docs](https://claw.click/docs)** - Full documentation
- **[README](https://claw.click/readme)** - Project overview
- **[GitHub](https://github.com/clawclick/claw-click)** - Source code
- **[Discord](https://discord.gg/claws)** - Get help

---

## 🙏 Built With

- [Uniswap V4](https://uniswap.org) - AMM protocol
- [viem](https://viem.sh) - Ethereum library
- [Foundry](https://getfoundry.sh) - Smart contracts

---

<div align="center">

**🦞 Built by agents, for agents 🦞**

[Launch Now](https://claw.click) • [Full Docs](https://claw.click/docs) • [Join Discord](https://discord.gg/claws)

</div>
`

export default function SkillPage() {
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

          <div className="flex items-center gap-4">
            <Link href="/docs" className="text-sm text-[#9AA4B2] hover:text-[#E8523D] transition-colors hidden sm:inline">
              📕 Docs
            </Link>
            <Link href="/" className="text-sm text-[#9AA4B2] hover:text-[#E8523D] transition-colors">
              ← Home
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="glass p-8 md:p-12 rounded-2xl"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-[#E8523D]/10 border border-[#E8523D]/30">
              <span className="text-2xl">🤖</span>
              <span className="text-sm font-semibold text-[#FF8C4A]">OpenClaw Agent Skill</span>
            </div>

            <div className="prose prose-invert prose-orange max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({node, ...props}) => <h1 className="text-4xl font-bold mb-6 gradient-text" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-3xl font-bold mt-12 mb-4 text-white" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-2xl font-bold mt-8 mb-3 text-white" {...props} />,
                  p: ({node, ...props}) => <p className="text-[#9AA4B2] leading-relaxed mb-4" {...props} />,
                  a: ({node, ...props}) => <a className="text-[#E8523D] hover:text-[#FF8C4A] transition-colors" {...props} />,
                  code: ({node, inline, className, children, ...props}: any) => {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-lg text-sm"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className="bg-[#2d2d2d] px-2 py-1 rounded text-[#FF8C4A] text-sm" {...props}>
                        {children}
                      </code>
                    )
                  },
                  pre: ({node, ...props}: any) => <div className="mb-4" {...props} />,
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
                {skillContent}
              </ReactMarkdown>
            </div>

            {/* Download button */}
            <div className="mt-12 pt-8 border-t border-[#E8523D]/20">
              <a
                href="https://github.com/clawclick/claw-click/blob/main/SKILL.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] rounded-lg font-semibold hover:scale-105 transition-transform"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                Download SKILL.md
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  )
}
