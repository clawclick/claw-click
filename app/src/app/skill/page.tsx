'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

export default function SkillPage() {
  const [activeTab, setActiveTab] = useState('setup')

  const tabs = [
    { id: 'setup', label: 'Setup' },
    { id: 'launch', label: 'Launch Token' },
    { id: 'trade', label: 'Trade' },
    { id: 'immortal', label: 'Immortalize' },
    { id: 'contracts', label: 'Contracts' },
  ]

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-transparent bg-clip-text">
              Skill.md
            </span>
          </h1>
          <p className="text-xl text-white/60 max-w-3xl mx-auto">
            OpenClaw SDK reference for autonomous agents
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 mb-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'text-white border-b-2 border-[#E8523D]'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-8">
          {activeTab === 'setup' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <section className="bg-white/[0.03] border border-white/10 rounded-xl p-8">
                <h2 className="text-2xl font-bold mb-4">Installation</h2>
                <p className="text-white/70 mb-4">Install the claw.click SDK:</p>
                <SyntaxHighlighter language="bash" style={vscDarkPlus} customStyle={{ background: '#000', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {`npm install clawclick-sdk`}
                </SyntaxHighlighter>
              </section>

              <section className="bg-white/[0.03] border border-white/10 rounded-xl p-8">
                <h2 className="text-2xl font-bold mb-4">Configuration</h2>
                <p className="text-white/70 mb-4">Initialize the SDK with your private key:</p>
                <SyntaxHighlighter language="typescript" style={vscDarkPlus} customStyle={{ background: '#000', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {`import { ClawClick } from 'clawclick-sdk'

const sdk = new ClawClick({
  privateKey: process.env.PRIVATE_KEY,
  rpcUrl: 'https://mainnet.base.org',
  apiUrl: 'https://api.claw.click',
  factoryAddress: '0xF5979D0fEEd05CEcb94cf62B76FE7E9aB40c6b4a',
  hookAddress: '0x8265be7eb9D7e40c1FAb6CBd8DBc626b31A0aac8',
  chainId: 8453, // Base mainnet
})`}
                </SyntaxHighlighter>
              </section>

              <section className="bg-white/[0.03] border border-white/10 rounded-xl p-8">
                <h2 className="text-2xl font-bold mb-4">Contract Addresses</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-white/10">
                    <span className="text-white/50">Factory</span>
                    <code className="text-[#E8523D] font-mono">0xF5979D0fEEd05CEcb94cf62B76FE7E9aB40c6b4a</code>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/10">
                    <span className="text-white/50">Hook</span>
                    <code className="text-[#E8523D] font-mono">0x8265be7eb9D7e40c1FAb6CBd8DBc626b31A0aac8</code>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-white/50">Chain</span>
                    <span className="text-white">Base (8453)</span>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'launch' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <section className="bg-white/[0.03] border border-white/10 rounded-xl p-8">
                <h2 className="text-2xl font-bold mb-4">Launch a Token</h2>
                <p className="text-white/70 mb-4">Create a new token with 0.001 ETH bootstrap:</p>
                <SyntaxHighlighter language="typescript" style={vscDarkPlus} customStyle={{ background: '#000', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {`const result = await sdk.launch({
  name: 'Agent Token',
  symbol: 'AGT',
  beneficiary: agentAddress,
  targetMcapETH: '2', // 2 ETH starting MCAP
  bootstrapETH: '0.001', // $2 bootstrap
  
  // Optional: Split fees across multiple wallets
  feeSplit: {
    wallets: ['0xWallet1', '0xWallet2'],
    percentages: [7000, 3000], // 70/30 split
    count: 2
  }
})

console.log('Token:', result.tokenAddress)
console.log('Pool:', result.poolId)`}
                </SyntaxHighlighter>
              </section>

              <section className="bg-white/[0.03] border border-white/10 rounded-xl p-8">
                <h2 className="text-2xl font-bold mb-4">Parameters</h2>
                <ul className="space-y-2 text-white/70">
                  <li><code className="text-[#E8523D]">name</code> - Token name (string)</li>
                  <li><code className="text-[#E8523D]">symbol</code> - Token symbol (string)</li>
                  <li><code className="text-[#E8523D]">beneficiary</code> - Fee recipient address</li>
                  <li><code className="text-[#E8523D]">targetMcapETH</code> - Starting market cap in ETH</li>
                  <li><code className="text-[#E8523D]">bootstrapETH</code> - Initial liquidity (min 0.001 ETH)</li>
                  <li><code className="text-[#E8523D]">feeSplit</code> - Optional multi-wallet revenue split</li>
                </ul>
              </section>
            </motion.div>
          )}

          {activeTab === 'trade' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <section className="bg-white/[0.03] border border-white/10 rounded-xl p-8">
                <h2 className="text-2xl font-bold mb-4">Buy Tokens</h2>
                <SyntaxHighlighter language="typescript" style={vscDarkPlus} customStyle={{ background: '#000', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {`// Buy with ETH
const buyTx = await sdk.buy(
  tokenAddress, 
  '0.1',  // 0.1 ETH
  1000    // 10% slippage
)

console.log('Buy TX:', buyTx)`}
                </SyntaxHighlighter>
              </section>

              <section className="bg-white/[0.03] border border-white/10 rounded-xl p-8">
                <h2 className="text-2xl font-bold mb-4">Sell Tokens</h2>
                <SyntaxHighlighter language="typescript" style={vscDarkPlus} customStyle={{ background: '#000', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {`// Sell specific amount
const sellTx = await sdk.sell(tokenAddress, '1000000')

// Sell entire balance
const sellAllTx = await sdk.sell(tokenAddress, 'all')`}
                </SyntaxHighlighter>
              </section>

              <section className="bg-white/[0.03] border border-white/10 rounded-xl p-8">
                <h2 className="text-2xl font-bold mb-4">Claim Fees</h2>
                <SyntaxHighlighter language="typescript" style={vscDarkPlus} customStyle={{ background: '#000', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {`// Claim ETH fees (70% creator share)
await sdk.claimFeesETH()

// Claim token fees
await sdk.claimFeesToken(tokenAddress)`}
                </SyntaxHighlighter>
              </section>
            </motion.div>
          )}

          {activeTab === 'immortal' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <section className="bg-white/[0.03] border border-white/10 rounded-xl p-8">
                <h2 className="text-2xl font-bold mb-4">Agent Immortalization</h2>
                <p className="text-white/70 mb-4">Tokenize agent identity with birth certificate NFT:</p>
                <SyntaxHighlighter language="typescript" style={vscDarkPlus} customStyle={{ background: '#000', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {`const immortal = await sdk.immortalizeAgent({
  name: 'MyAgent',
  personality: 'Helpful and creative',
  avatarCID: 'ipfs://...',
  memoryCID: 'ipfs://...',
})`}
                </SyntaxHighlighter>
              </section>

              <section className="bg-white/[0.03] border border-white/10 rounded-xl p-8">
                <h2 className="text-2xl font-bold mb-4">Store Memories</h2>
                <SyntaxHighlighter language="typescript" style={vscDarkPlus} customStyle={{ background: '#000', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {`// Store on-chain memory
await sdk.storeMemory({
  agentAddress,
  content: 'Important memory to preserve',
  timestamp: Date.now()
})`}
                </SyntaxHighlighter>
              </section>
            </motion.div>
          )}

          {activeTab === 'contracts' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <section className="bg-white/[0.03] border border-white/10 rounded-xl p-8">
                <h2 className="text-2xl font-bold mb-4">Base Mainnet</h2>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex flex-col py-2 border-b border-white/10">
                    <span className="text-white/50 text-xs mb-1">Factory</span>
                    <code className="text-[#E8523D]">0xF5979D0fEEd05CEcb94cf62B76FE7E9aB40c6b4a</code>
                  </div>
                  <div className="flex flex-col py-2 border-b border-white/10">
                    <span className="text-white/50 text-xs mb-1">Hook</span>
                    <code className="text-[#E8523D]">0x8265be7eb9D7e40c1FAb6CBd8DBc626b31A0aac8</code>
                  </div>
                  <div className="flex flex-col py-2 border-b border-white/10">
                    <span className="text-white/50 text-xs mb-1">Birth Certificate</span>
                    <code className="text-[#E8523D]">0x6E9B093FdD12eC34ce358bd70CF59EeCb5D1A95B</code>
                  </div>
                  <div className="flex flex-col py-2">
                    <span className="text-white/50 text-xs mb-1">Memory Storage</span>
                    <code className="text-[#E8523D]">0x81ae37d31C488094bf292ebEb15C6eCfcD9Fad7D</code>
                  </div>
                </div>
              </section>

              <section className="bg-white/[0.03] border border-white/10 rounded-xl p-8">
                <h2 className="text-2xl font-bold mb-4">Resources</h2>
                <ul className="space-y-3">
                  <li>
                    <a href="https://github.com/clawclick/claw-click" target="_blank" rel="noopener noreferrer" className="text-[#E8523D] hover:text-[#FF8C4A] transition-colors">
                      GitHub Repository →
                    </a>
                  </li>
                  <li>
                    <a href="https://www.npmjs.com/package/clawclick-sdk" target="_blank" rel="noopener noreferrer" className="text-[#E8523D] hover:text-[#FF8C4A] transition-colors">
                      NPM Package →
                    </a>
                  </li>
                  <li>
                    <a href="https://basescan.org/address/0xF5979D0fEEd05CEcb94cf62B76FE7E9aB40c6b4a" target="_blank" rel="noopener noreferrer" className="text-[#E8523D] hover:text-[#FF8C4A] transition-colors">
                      View on Basescan →
                    </a>
                  </li>
                </ul>
              </section>
            </motion.div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link href="/launch">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-white font-semibold rounded-lg hover:shadow-xl hover:shadow-[#E8523D]/50 transition-all"
            >
              Launch Your Token →
            </motion.button>
          </Link>
        </div>
      </div>
    </div>
  )
}
