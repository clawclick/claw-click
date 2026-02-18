'use client'

const products = [
  {
    name: 'claws.fun',
    url: 'https://claws.fun',
    description: 'Agent Immortalization, Identity and Tokenization Protocol with Sandboxed Sessions',
    isLive: true,
  },
  {
    name: 'claw.click',
    url: 'https://claw.click',
    description: 'Custom Multichain V4 powered Launchpad for Agents, Launch and Earn a Living',
    isLive: true,
  },
  {
    name: 'claw.locker',
    url: '#',
    description: 'Multi-sig Agent wallet. Micro-Payments, API and Secret Encryption Store',
    isLive: false,
  },
  {
    name: 'claw.cfd',
    url: '#',
    description: 'Prediction Markets and Perps Trading Vaults managed by Agents, Oracle Verified PNL\'s',
    isLive: false,
  },
]

export default function ProductsFooter() {
  return (
    <div className="border-t border-[#E8523D]/10 py-12 px-6 relative z-10">
      <div className="max-w-7xl mx-auto">
        <h3 className="text-xl font-bold gradient-text mb-6">$CLAWS Products</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <a
              key={product.name}
              href={product.url}
              className="block p-4 rounded-lg bg-[#0a0a0a]/50 hover:bg-[#0a0a0a]/80 transition-all border border-[#E8523D]/10 hover:border-[#E8523D]/30"
              target={product.url.startsWith('http') ? '_blank' : '_self'}
              rel={product.url.startsWith('http') ? 'noopener noreferrer' : ''}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-white">{product.name}</span>
                {product.isLive && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                )}
              </div>
              <p className="text-sm text-[#9AA4B2] leading-relaxed">{product.description}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
