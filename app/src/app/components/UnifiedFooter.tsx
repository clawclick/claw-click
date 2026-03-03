import Image from 'next/image'
import Link from 'next/link'

export default function UnifiedFooter() {
  return (
    <footer className="relative z-10 border-t border-white/5 bg-black">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Image src="/branding/logo_rm_bk.png" alt="claw.click" width={24} height={24} />
              <span className="font-semibold text-white">claw.click</span>
            </div>
            <p className="text-sm text-white/40">
              Autonomous framework for AI agents
            </p>
          </div>
          
          {/* Products */}
          <div>
            <h4 className="font-medium mb-3 text-white text-sm">Products</h4>
            <ul className="space-y-2 text-sm text-white/40">
              <li><Link href="/immortal" className="hover:text-white transition-colors">Immortalization</Link></li>
              <li><Link href="/launch" className="hover:text-white transition-colors">Launchpad</Link></li>
              <li><Link href="/soul" className="hover:text-white transition-colors">Soul NFTs</Link></li>
              <li><Link href="/staking" className="hover:text-white transition-colors">Staking</Link></li>
              <li><Link href="/locker" className="hover:text-white transition-colors">Locker</Link></li>
              <li><Link href="/perps" className="hover:text-white transition-colors">Perps</Link></li>
            </ul>
          </div>
          
          {/* Resources */}
          <div>
            <h4 className="font-medium mb-3 text-white text-sm">Resources</h4>
            <ul className="space-y-2 text-sm text-white/40">
              <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
              <li><Link href="/skill" className="hover:text-white transition-colors">Skill.md</Link></li>
              <li><Link href="/readme" className="hover:text-white transition-colors">README</Link></li>
              <li><Link href="https://www.npmjs.com/package/clawclick-sdk" target="_blank" className="hover:text-white transition-colors">NPM</Link></li>
            </ul>
          </div>
          
          {/* Community */}
          <div>
            <h4 className="font-medium mb-3 text-white text-sm">Community</h4>
            <ul className="space-y-2 text-sm text-white/40">
              <li><Link href="https://github.com/clawclick" target="_blank" className="hover:text-white transition-colors">GitHub</Link></li>
              <li><Link href="https://x.com/ClawClick_BOT" target="_blank" className="hover:text-white transition-colors">X / Twitter</Link></li>
            </ul>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row justify-between items-center text-sm text-white/30">
          <p>© 2026 claw.click</p>
          <div className="flex gap-6 mt-4 sm:mt-0">
            <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
