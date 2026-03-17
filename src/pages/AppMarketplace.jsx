import React from 'react'

const AppMarketplace = () => {
  const strategies = [
    {
      id: 1,
      name: "DeFi Yield Hunter",
      type: "Liquidity Farming",
      winRate: 87.3,
      trades: 142,
      volume: "$2.4M",
      chain: "Ethereum",
      apy: "24.6%",
      risk: "Medium",
      tags: ["Uniswap V3", "Compound", "Automated"]
    },
    {
      id: 2,
      name: "Arbitrage Bot Pro",
      type: "Cross-DEX Arbitrage", 
      winRate: 94.1,
      trades: 2847,
      volume: "$8.7M",
      chain: "Multi-Chain",
      apy: "31.2%",
      risk: "Low",
      tags: ["1inch", "Jupiter", "Real-time"]
    },
    {
      id: 3,
      name: "Alpha Whale Tracker",
      type: "Copy Trading",
      winRate: 76.8,
      trades: 89,
      volume: "$1.9M", 
      chain: "Base",
      apy: "41.7%",
      risk: "High",
      tags: ["Smart Money", "Memecoin", "Trend Following"]
    },
    {
      id: 4,
      name: "Momentum Scalper",
      type: "Technical Analysis",
      winRate: 82.5,
      trades: 573,
      volume: "$4.2M",
      chain: "Solana",
      apy: "28.9%",
      risk: "Medium",
      tags: ["RSI", "MACD", "Volume Profile"]
    },
    {
      id: 5,
      name: "Grid Trading Elite",
      type: "Market Making",
      winRate: 91.7,
      trades: 1256,
      volume: "$5.8M",
      chain: "BSC",
      apy: "19.4%",
      risk: "Low",
      tags: ["PancakeSwap", "Range Bound", "Stable"]
    },
    {
      id: 6,
      name: "New Pair Sniper",
      type: "Launch Detection",
      winRate: 68.2,
      trades: 67,
      volume: "$892K",
      chain: "Solana",
      apy: "67.3%",
      risk: "Very High",
      tags: ["Pump.fun", "MEV Protected", "Early Entry"]
    },
    {
      id: 7,
      name: "Stable Yield Master",
      type: "Stablecoin Strategy",
      winRate: 98.9,
      trades: 387,
      volume: "$3.1M",
      chain: "Ethereum",
      apy: "12.8%",
      risk: "Very Low",
      tags: ["USDC", "Curve", "Aave"]
    },
    {
      id: 8,
      name: "Social Sentiment AI",
      type: "Sentiment Trading",
      winRate: 73.4,
      trades: 234,
      volume: "$1.6M",
      chain: "Multi-Chain", 
      apy: "38.1%",
      risk: "High",
      tags: ["X API", "Reddit", "Telegram"]
    }
  ]

  const getRiskColor = (risk) => {
    const colors = {
      "Very Low": "#22c55e",
      "Low": "#84cc16", 
      "Medium": "#eab308",
      "High": "#f97316",
      "Very High": "#ef4444"
    }
    return colors[risk] || "#6b7280"
  }

  const getChainColor = (chain) => {
    const colors = {
      "Ethereum": "#627eea",
      "Solana": "#9945ff", 
      "Base": "#0052ff",
      "BSC": "#f3ba2f",
      "Multi-Chain": "#6b7280"
    }
    return colors[chain] || "#6b7280"
  }

  return (
    <div className="app-marketplace-page">
      {/* Header */}
      <header className="app-marketplace-header">
        <div className="app-marketplace-container">
          <div className="app-marketplace-hero">
            <h1 className="app-marketplace-title">Strategy Marketplace</h1>
            <p className="app-marketplace-subtitle">
              Deploy battle-tested trading strategies with institutional-grade infrastructure
            </p>
            
            <div className="marketplace-stats">
              <div className="stat-item">
                <span className="stat-value">$47.2M</span>
                <span className="stat-label">Total Volume</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">5,847</span>
                <span className="stat-label">Active Strategies</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">94.3%</span>
                <span className="stat-label">Avg Win Rate</span>
              </div>
            </div>
            
            <div className="hero-cta">
              <button className="hero-cta-button">Create Wrapper</button>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <section className="filters-section">
        <div className="app-marketplace-container">
          <div className="filters-bar">
            <div className="filter-group">
              <label className="filter-label">Chain:</label>
              <select className="filter-select">
                <option>All Chains</option>
                <option>Ethereum</option>
                <option>Solana</option>
                <option>Base</option>
                <option>BSC</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label className="filter-label">Risk:</label>
              <select className="filter-select">
                <option>All Risk Levels</option>
                <option>Very Low</option>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label className="filter-label">Type:</label>
              <select className="filter-select">
                <option>All Types</option>
                <option>Arbitrage</option>
                <option>Market Making</option>
                <option>Copy Trading</option>
                <option>Technical Analysis</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label className="filter-label">Sort by:</label>
              <select className="filter-select">
                <option>Highest APY</option>
                <option>Win Rate</option>
                <option>Volume</option>
                <option>Recent Activity</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Strategies Grid */}
      <section className="strategies-section">
        <div className="app-marketplace-container">
          <div className="strategies-grid">
            {strategies.map((strategy) => (
              <div key={strategy.id} className="strategy-card">
                <div className="strategy-header">
                  <h3 className="strategy-name">{strategy.name}</h3>
                  <div className="strategy-type">{strategy.type}</div>
                </div>
                
                <div className="strategy-metrics">
                  <div className="metric-row">
                    <div className="metric">
                      <span className="metric-label">Win Rate</span>
                      <span className="metric-value win-rate">{strategy.winRate}%</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">APY</span>
                      <span className="metric-value apy">{strategy.apy}</span>
                    </div>
                  </div>
                  
                  <div className="metric-row">
                    <div className="metric">
                      <span className="metric-label">Trades</span>
                      <span className="metric-value">{strategy.trades.toLocaleString()}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Volume</span>
                      <span className="metric-value">{strategy.volume}</span>
                    </div>
                  </div>
                </div>
                
                <div className="strategy-details">
                  <div className="strategy-chain">
                    <span 
                      className="chain-badge"
                      style={{ backgroundColor: getChainColor(strategy.chain) }}
                    >
                      {strategy.chain}
                    </span>
                  </div>
                  
                  <div className="strategy-risk">
                    <span 
                      className="risk-badge"
                      style={{ backgroundColor: getRiskColor(strategy.risk) }}
                    >
                      {strategy.risk} Risk
                    </span>
                  </div>
                </div>
                
                <div className="strategy-tags">
                  {strategy.tags.map((tag, index) => (
                    <span key={index} className="strategy-tag">{tag}</span>
                  ))}
                </div>
                
                <div className="strategy-actions">
                  <button className="action-button primary">Deploy</button>
                  <button className="action-button secondary">Details</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="app-cta-section">
        <div className="app-marketplace-container">
          <div className="app-cta">
            <h2 className="cta-title">Build Your Own Strategy</h2>
            <p className="cta-description">
              Use our strategy builder to create custom trading algorithms with our unified API infrastructure.
            </p>
            <div className="cta-buttons">
              <button className="cta-button primary">Create Wrapper</button>
              <button className="cta-button secondary">Documentation</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AppMarketplace