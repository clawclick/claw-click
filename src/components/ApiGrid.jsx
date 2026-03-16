import React from 'react'

const ApiGrid = () => {
  const apiLogosRow1 = [
    'Dexscreener',
    'CoinGecko', 
    'DeFiLlama',
    'Etherscan',
    'Uniswap',
    'Moralis',
    'X (Twitter)',
    'Telegram',
    'PancakeSwap',
    'Alchemy',
    'GoPlus',
    'Birdeye'
  ]

  const apiLogosRow2 = [
    'CoinMarketCap',
    'GeckoTerminal',
    'Dune Analytics',
    'BaseScan',
    'Solana RPC',
    'Nansen',
    'Reddit',
    'Bubblemaps',
    'Honeypot',
    'Arkham',
    'BSC Scan',
    'DeBank'
  ]

  const apiLogosRow3 = [
    'Dextools',
    'Sim (Dune)',
    'LunarCrush',
    'Santiment', 
    'Polymarket',
    'QuickIntel',
    'Base Chain',
    'BSC Chain',
    'Ethereum',
    '1inch',
    'Jupiter',
    'Raydium'
  ]

  return (
    <section className="api-grid-section">
      <div className="api-grid-container">
        <h2 className="api-grid-heading">Integrated APIs</h2>
        
        <div className="api-carousel">
          <div className="api-row slide-right">
            {[...apiLogosRow1, ...apiLogosRow1].map((apiName, index) => (
              <div key={index} className="api-logo-item">
                <div className="logo-placeholder">{apiName}</div>
              </div>
            ))}
          </div>
          
          <div className="api-row slide-left">
            {[...apiLogosRow2, ...apiLogosRow2].map((apiName, index) => (
              <div key={index} className="api-logo-item">
                <div className="logo-placeholder">{apiName}</div>
              </div>
            ))}
          </div>
          
          <div className="api-row slide-right">
            {[...apiLogosRow3, ...apiLogosRow3].map((apiName, index) => (
              <div key={index} className="api-logo-item">
                <div className="logo-placeholder">{apiName}</div>
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