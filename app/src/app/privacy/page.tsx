'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function Privacy() {
  return (
    <main className="min-h-screen relative bg-[#1a1a1a] text-white">
      <div className="fixed inset-0 bg-gradient-to-br from-[#E8523D]/5 via-transparent to-[#FF8C4A]/10"></div>
      
      {/* Header */}
      <header className="fixed w-full z-50 bg-[#1a1a1a]/80 backdrop-blur-xl border-b border-[#E8523D]/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <Image src="/branding/logo_rm_bk.png" alt="Claw.Click" width={40} height={40} className="object-contain" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold gradient-text">Claw.Click</span>
              <span className="px-2 py-0.5 text-xs font-bold bg-[#E8523D]/20 text-[#FF8C4A] border border-[#E8523D]/30 rounded">BETA</span>
            </div>
          </Link>
        </div>
      </header>

      <section className="pt-32 pb-20 px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-[#9AA4B2] mb-8">Last updated: February 11, 2026</p>

          <div className="space-y-8 text-[#9AA4B2]">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
              <p>
                Claw.Click ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and share information when you use our platform for creating and tokenizing autonomous AI agents on the blockchain.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
              <h3 className="text-xl font-semibold text-white mt-4 mb-2">2.1 Blockchain Data</h3>
              <p className="mb-4">
                All agent creation, tokenization, and trading activities are recorded on public blockchains (Sepolia, Base, Ethereum, BSC). This data is publicly accessible and immutable by design.
              </p>
              <h3 className="text-xl font-semibold text-white mt-4 mb-2">2.2 Wallet Addresses</h3>
              <p className="mb-4">
                When you connect your wallet, we collect your wallet address to facilitate interactions with our smart contracts. We do not have access to your private keys.
              </p>
              <h3 className="text-xl font-semibold text-white mt-4 mb-2">2.3 IPFS Data</h3>
              <p>
                Agent memory files and metadata uploaded to IPFS are content-addressed and publicly accessible via their CID (Content Identifier).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Information</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Facilitate agent creation and tokenization</li>
                <li>Display agent information on our platform</li>
                <li>Process transactions and distribute fees</li>
                <li>Provide analytics and platform statistics</li>
                <li>Improve our services and user experience</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. Data Storage</h2>
              <p className="mb-4">
                <strong>On-Chain Data:</strong> All smart contract interactions are permanently stored on the blockchain and cannot be deleted.
              </p>
              <p className="mb-4">
                <strong>IPFS Data:</strong> Files uploaded to IPFS are distributed across the IPFS network and may be cached by multiple nodes.
              </p>
              <p>
                <strong>Off-Chain Data:</strong> We do not store any personal information on centralized servers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Third-Party Services</h2>
              <p className="mb-4">We integrate with the following third-party services:</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Wallet Providers:</strong> RainbowKit, MetaMask, WalletConnect</li>
                <li><strong>Blockchain RPCs:</strong> Alchemy, Infura</li>
                <li><strong>IPFS:</strong> Pinata</li>
                <li><strong>DEX:</strong> Uniswap V4</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Cookies and Tracking</h2>
              <p>
                We use minimal cookies for essential functionality only. We do not use third-party tracking cookies or analytics services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Your Rights</h2>
              <p className="mb-4">
                Due to the decentralized nature of blockchain technology, once data is recorded on-chain, it cannot be modified or deleted. You have the right to:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Disconnect your wallet at any time</li>
                <li>Request information about your on-chain interactions</li>
                <li>Update agent metadata (via agent wallet signature)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. Security</h2>
              <p>
                We implement industry-standard security practices. However, you are responsible for securing your wallet private keys. We never ask for your private keys or seed phrases.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Contact Us</h2>
              <p>
                For questions about this Privacy Policy, please contact us via our GitHub repository or Twitter @clawdotclick.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-[#E8523D]/20">
            <Link href="/" className="text-[#FF8C4A] hover:text-[#E8523D] transition-colors">
              ← Back to Homepage
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
