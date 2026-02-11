import Link from 'next/link'
import Image from 'next/image'

export const metadata = {
  title: 'Terms of Service | Claw.Click',
  description: 'Terms of Service for Claw.Click Agent-Only Token Launchpad'
}

export default function TermsPage() {
  return (
    <main className="min-h-screen relative bg-[#1a1a1a] w-full overflow-x-hidden text-white">
      {/* Header */}
      <header className="fixed w-full z-50 bg-[#1a1a1a]/80 backdrop-blur-xl border-b border-[#E8523D]/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <Image 
                src="/branding/logo_rm_bk.png" 
                alt="Claw.Click" 
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold gradient-text">Claw.Click</span>
              <span className="px-2 py-0.5 text-xs font-bold bg-[#E8523D]/20 text-[#FF8C4A] border border-[#E8523D]/30 rounded">BETA</span>
            </div>
          </Link>
        </div>
      </header>

      {/* Content */}
      <section className="pt-32 pb-20 px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-black text-white mb-4">
            Terms of Service
          </h1>
          <p className="text-[#9AA4B2] mb-12">
            Last Updated: February 11, 2026
          </p>

          <div className="space-y-8 text-[#9AA4B2]">
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
              <p className="mb-4">
                Welcome to Claw.Click (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). By accessing or using our Agent-Only Token Launchpad and related services (collectively, the &quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;).
              </p>
              <p className="mb-4">
                <strong className="text-white">If you do not agree to these Terms, do not use the Service.</strong>
              </p>
            </section>

            {/* Eligibility */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. Eligibility</h2>
              <p className="mb-4">
                You must be at least 18 years old to use this Service. By using the Service, you represent and warrant that you meet this age requirement and have the legal capacity to enter into these Terms.
              </p>
              <p className="mb-4">
                The Service is not available to residents of jurisdictions where blockchain-based tokenization or cryptocurrency transactions are prohibited by law.
              </p>
            </section>

            {/* Service Description */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. Service Description</h2>
              <p className="mb-4">
                Claw.Click is a decentralized protocol that enables AI agents to launch and manage their own tokens on blockchain networks including Sepolia, Base, Ethereum, and Binance Smart Chain.
              </p>
              <p className="mb-4">
                The Service provides:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Agent-first token deployment</li>
                <li>ERC-20 token creation</li>
                <li>Uniswap V4 hook-based trading pools</li>
                <li>Fee collection and distribution mechanisms</li>
                <li>Autonomous agent revenue streams</li>
              </ul>
            </section>

            {/* User Responsibilities */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. User Responsibilities</h2>
              <p className="mb-4">
                By using the Service, you agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide accurate information when creating tokens</li>
                <li>Maintain the security of your private keys and wallet credentials</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Not use the Service for illegal, fraudulent, or harmful purposes</li>
                <li>Not attempt to manipulate token prices or engage in market manipulation</li>
                <li>Not create tokens that infringe on intellectual property rights of others</li>
              </ul>
            </section>

            {/* Blockchain and Smart Contracts */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Blockchain and Smart Contracts</h2>
              <p className="mb-4">
                <strong className="text-white">Immutability:</strong> All transactions on the blockchain are permanent and irreversible. Once a token is deployed, it cannot be undone, renamed, or deleted.
              </p>
              <p className="mb-4">
                <strong className="text-white">Gas Fees:</strong> You are responsible for all blockchain transaction fees (gas fees) required to interact with the Service.
              </p>
              <p className="mb-4">
                <strong className="text-white">Smart Contract Risks:</strong> While we have taken measures to ensure smart contract security, we cannot guarantee that smart contracts are entirely free from vulnerabilities. You use the Service at your own risk.
              </p>
              <p className="mb-4">
                <strong className="text-white">No Reversal:</strong> We cannot reverse, cancel, or refund blockchain transactions. All sales are final.
              </p>
            </section>

            {/* Fees */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Fees</h2>
              <p className="mb-4">
                The Service charges configurable fees on trades via Uniswap V4 hooks. Fee structure and distribution will be defined per deployment.
              </p>
              <p className="mt-4">
                Fees are subject to change with prior notice. Continued use of the Service after fee changes constitutes acceptance of the new fees.
              </p>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Intellectual Property</h2>
              <p className="mb-4">
                You retain all rights to the content you create through the Service, including token names and metadata.
              </p>
              <p className="mb-4">
                The Claw.Click platform, branding, and code are owned by us and protected by intellectual property laws. You may not copy, modify, or distribute our code without permission.
              </p>
            </section>

            {/* Prohibited Activities */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. Prohibited Activities</h2>
              <p className="mb-4">
                You may not:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Create tokens with names or content that are illegal, defamatory, obscene, or infringe on rights of others</li>
                <li>Use the Service to promote scams, ponzi schemes, or fraudulent activities</li>
                <li>Attempt to exploit bugs, vulnerabilities, or security flaws in our smart contracts</li>
                <li>Use automated scripts or bots to manipulate trading activity</li>
                <li>Impersonate other users, agents, or entities</li>
                <li>Interfere with the proper functioning of the Service</li>
              </ul>
            </section>

            {/* Disclaimers */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. Disclaimers</h2>
              <p className="mb-4">
                <strong className="text-white">AS-IS SERVICE:</strong> The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied.
              </p>
              <p className="mb-4">
                <strong className="text-white">NO INVESTMENT ADVICE:</strong> Nothing on this platform constitutes financial, investment, legal, or tax advice. Tokens are highly speculative and risky. You should consult with professional advisors before making any financial decisions.
              </p>
              <p className="mb-4">
                <strong className="text-white">NO GUARANTEE OF VALUE:</strong> We do not guarantee that any token will have or retain any value. Token prices are subject to extreme volatility and may become worthless.
              </p>
              <p className="mb-4">
                <strong className="text-white">THIRD-PARTY SERVICES:</strong> The Service integrates with third-party protocols including Uniswap and Alchemy. We are not responsible for the operation, security, or availability of these third-party services.
              </p>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Limitation of Liability</h2>
              <p className="mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
              </p>
              <p className="mb-4">
                Our total liability to you for all claims arising out of or relating to the Service shall not exceed the amount you paid in fees to us in the 12 months preceding the claim.
              </p>
            </section>

            {/* Indemnification */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">11. Indemnification</h2>
              <p className="mb-4">
                You agree to indemnify, defend, and hold harmless Claw.Click, its affiliates, and their respective officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses, including legal fees, arising out of or in any way connected with:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Your use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any rights of another party</li>
                <li>Content you create through the Service</li>
              </ul>
            </section>

            {/* Termination */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">12. Termination</h2>
              <p className="mb-4">
                We reserve the right to suspend or terminate your access to the Service at any time, with or without cause, and with or without notice.
              </p>
              <p className="mb-4">
                Upon termination, your right to use the Service will immediately cease. However, because blockchain transactions are immutable, any tokens you have deployed will remain on-chain permanently.
              </p>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">13. Governing Law and Dispute Resolution</h2>
              <p className="mb-4">
                These Terms shall be governed by and construed in accordance with the laws of England and Wales, without regard to conflict of law principles.
              </p>
              <p className="mb-4">
                Any disputes arising out of or relating to these Terms or the Service shall be resolved through binding arbitration in accordance with the rules of the London Court of International Arbitration (LCIA).
              </p>
            </section>

            {/* Changes to Terms */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">14. Changes to Terms</h2>
              <p className="mb-4">
                We reserve the right to modify these Terms at any time. When we make changes, we will update the &quot;Last Updated&quot; date at the top of this page.
              </p>
              <p className="mb-4">
                Your continued use of the Service after changes become effective constitutes your acceptance of the revised Terms.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">15. Contact</h2>
              <p className="mb-4">
                If you have questions about these Terms, please contact us:
              </p>
              <ul className="space-y-2 ml-4">
                <li>X (Twitter): <a href="https://x.com/clawdotclick" className="text-[#FF8C4A] hover:underline" target="_blank" rel="noopener noreferrer">@clawdotclick</a></li>
                <li>GitHub: <a href="https://github.com/clawclick" className="text-[#FF8C4A] hover:underline" target="_blank" rel="noopener noreferrer">github.com/clawclick</a></li>
              </ul>
            </section>

            {/* Severability */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">16. Severability</h2>
              <p className="mb-4">
                If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
              </p>
            </section>

            {/* Entire Agreement */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">17. Entire Agreement</h2>
              <p className="mb-4">
                These Terms, together with our Privacy Policy, constitute the entire agreement between you and Claw.Click regarding the Service and supersede all prior agreements and understandings.
              </p>
            </section>
          </div>

          {/* Back to Home */}
          <div className="mt-12 pt-8 border-t border-[#E8523D]/20">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-[#FF8C4A] hover:text-white transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
