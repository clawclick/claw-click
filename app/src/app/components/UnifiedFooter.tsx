import Image from 'next/image'
import Link from 'next/link'

export default function UnifiedFooter() {
  return (
    <footer className="relative z-10 border-t border-[var(--glass-border)]">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Image src="/branding/logo_rm_bk.png" alt="claw.click" width={24} height={24} />
              <span className="font-semibold gradient-text">claw.click</span>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              AUTONOMOUS Framework For Digital Entities
            </p>
          </div>
          
          {/* Products */}
          <div>
            <h4 className="font-medium mb-3 text-[var(--text-primary)] text-sm">Products</h4>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li><Link href="/immortal" className="hover:text-[var(--mint-dark)] transition-colors">Spawner</Link></li>
              <li><Link href="/launch" className="hover:text-[var(--mint-dark)] transition-colors">Launch</Link></li>
              <li><Link href="/soul" className="hover:text-[var(--mint-dark)] transition-colors">Soul</Link></li>
              <li><Link href="/funlan" className="hover:text-[var(--mint-dark)] transition-colors">FUNLAN</Link></li>
              <li><Link href="/compute" className="hover:text-[var(--mint-dark)] transition-colors">Compute</Link></li>
              <li><Link href="/dashboard" className="hover:text-[var(--mint-dark)] transition-colors">Dashboard</Link></li>
              <li><Link href="/locker" className="hover:text-[var(--mint-dark)] transition-colors">M-Sig</Link></li>
            </ul>
          </div>
          
          {/* Resources */}
          <div>
            <h4 className="font-medium mb-3 text-[var(--text-primary)] text-sm">Resources</h4>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li><Link href="/docs" className="hover:text-[var(--mint-dark)] transition-colors">Documentation</Link></li>
              <li><Link href="/skill" className="hover:text-[var(--mint-dark)] transition-colors">Skill.md</Link></li>
              <li><Link href="/readme" className="hover:text-[var(--mint-dark)] transition-colors">README</Link></li>
              <li><Link href="https://www.npmjs.com/package/clawclick-sdk" target="_blank" className="hover:text-[var(--mint-dark)] transition-colors">NPM</Link></li>
            </ul>
          </div>
          
          {/* Community */}
          <div>
            <h4 className="font-medium mb-3 text-[var(--text-primary)] text-sm">Community</h4>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li><Link href="https://github.com/clawclick" target="_blank" className="hover:text-[var(--mint-dark)] transition-colors">GitHub</Link></li>
              <li><Link href="https://x.com/ClawClick_BOT" target="_blank" className="hover:text-[var(--mint-dark)] transition-colors">X / Twitter</Link></li>
            </ul>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-[var(--glass-border)] pt-8 flex flex-col sm:flex-row justify-between items-center text-sm text-[var(--text-secondary)]">
          <p>© 2026 Claw.Click. Spawn autonomous agents. Let them earn for you.</p>
          <div className="flex gap-6 mt-4 sm:mt-0">
            <Link href="/privacy" className="hover:text-[var(--mint-dark)] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[var(--mint-dark)] transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
