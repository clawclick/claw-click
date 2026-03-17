import React from 'react'

const ApiGrid = () => {
  const apiLogosRow1 = [
    { name: 'Dexscreener', logo: '/integrations/Dexscreener+logo.jpg', className: 'dexscreener' },
    { name: 'DeFiLlama', logo: '/integrations/653ef3f92944e7d505ca0e91_DefiLlama Logo-p-500.png', className: 'defillama' },
    { name: 'Etherscan', logo: '/integrations/etherscanlogo-freelogovectors.net_.png', className: 'etherscan' },
    { name: 'Moralis', logo: '/integrations/Blog-Moralis-Logo.png', className: 'moralis' },
    { name: 'BSC Scan', logo: '/integrations/bscscan.png', className: 'bscscan' },
    { name: 'Nansen', logo: '/integrations/nansen.png', className: 'nansen' }
  ]

  const apiLogosRow2 = [
    { name: 'Dune Analytics', logo: '/integrations/dune-1.png', className: 'dune' },
    { name: 'Polymarket', logo: '/integrations/Polymarket_Logo.jpg', className: 'polymarket' },
    { name: 'CoinGecko', logo: '/integrations/coingecko.png', className: 'coingecko' },
    { name: 'X (Twitter)', logo: '/integrations/R.png', className: 'twitter' },
    { name: 'Binance', logo: '/integrations/0_0PMnB3TBjf0r4eAt.png', className: 'binance' },
    { name: 'PancakeSwap', logo: '/integrations/OIP (2).webp', className: 'pancakeswap' }
  ]

  const apiLogosRow3 = [
    { name: 'Ethereum', logo: '/integrations/0fe184c9a32f0de4ff2c42a1921c004e2bb6004637d7821067027febf6d4f6b5.png', className: 'ethereum' },
    { name: 'Alchemy', logo: '/integrations/Alchemy_logo_black_highresolution.jpg', className: 'alchemy' },
    { name: 'Trading View', logo: '/integrations/0_dtGHiihVsdIgCHcw.png', className: 'tradingview' },
    { name: 'CoinMarketCap', logo: '/integrations/unnamed.png', className: 'coinmarketcap' },
    { name: 'Solana', logo: '/integrations/Solana-1.png', className: 'solana' },
    { name: 'Reddit', logo: '/integrations/Reddit-Logo-2017.png', className: 'reddit' }
  ]

  return (
    <section className="api-grid-section">
      <div className="api-grid-container">
        <h2 className="api-grid-heading">Integrated APIs</h2>
        
        <div className="api-carousel">
          <div className="api-row slide-right">
            {apiLogosRow1.map((api, index) => (
              <div key={index} className={`api-logo-item ${api.className}`}>
                <img 
                  src={api.logo} 
                  alt={api.name} 
                  className="api-logo-image"
                />
              </div>
            ))}
          </div>
          
          <div className="api-row slide-left">
            {apiLogosRow2.map((api, index) => (
              <div key={index} className={`api-logo-item ${api.className}`}>
                <img 
                  src={api.logo} 
                  alt={api.name} 
                  className="api-logo-image"
                />
              </div>
            ))}
          </div>
          
          <div className="api-row slide-right">
            {apiLogosRow3.map((api, index) => (
              <div key={index} className={`api-logo-item ${api.className}`}>
                <img 
                  src={api.logo} 
                  alt={api.name} 
                  className="api-logo-image"
                />
              </div>
            ))}
          </div>
        </div>
        
        <div className="api-loading-animation">
          <img 
            src="/animated-logo.gif" 
            alt="Loading Animation" 
            className="api-animated-gif"
            width="100"
            height="100"
          />
        </div>
      </div>
    </section>
  )
}

export default ApiGrid