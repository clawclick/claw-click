import React from 'react'

const ValueProp = () => {
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
    }
  ]

  const getRiskColor = (risk) => {
    const colors = {
      "Low": "#84cc16", 
      "Medium": "#eab308",
      "High": "#f97316"
    }
    return colors[risk] || "#6b7280"
  }

  const getChainColor = (chain) => {
    const colors = {
      "Ethereum": "#627eea",
      "Base": "#0052ff",
      "Multi-Chain": "#6b7280"
    }
    return colors[chain] || "#6b7280"
  }

  return (
    <section className="value-prop-section">
      <div className="value-prop-container">
        <div className="strategy-examples">
          {strategies.map((strategy) => (
            <div key={strategy.id} className="strategy-card-preview">
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
        
        <div className="strategy-wrappers-content">
          <h2 className="strategy-wrappers-title">Strategy Wrappers</h2>
          <p className="value-prop-text">
            Introducing Strategy Wrappers. Strategies can be packaged as parameterized API endpoints, allowing bots or applications to call trading logic directly while the underlying strategy remains private, allowing for a novel architecture for copy trading capital and allowing strategy creators to earn revenue while not risking capital all verified by the Click Oracle for Data validation in real time.
          </p>
        </div>
      </div>
    </section>
  )
}

export default ValueProp