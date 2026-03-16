import React from 'react'

const ApiDocs = () => {
  const endpointCategories = [
    {
      category: "Market Data",
      description: "Real-time and historical market data from multiple sources",
      endpoints: [
        {
          method: "GET",
          path: "/api/v1/market/token",
          description: "Get token price and market data",
          params: ["address", "chain", "timeframe?"]
        },
        {
          method: "GET", 
          path: "/api/v1/market/trending",
          description: "Get trending tokens across all chains",
          params: ["limit?", "timeframe?", "chain?"]
        },
        {
          method: "GET",
          path: "/api/v1/market/pairs/new",
          description: "Monitor new token pairs creation",
          params: ["chain", "dex?", "limit?"]
        }
      ]
    },
    {
      category: "Risk Assessment", 
      description: "Token security analysis and risk scoring",
      endpoints: [
        {
          method: "POST",
          path: "/api/v1/risk/analyze",
          description: "Comprehensive token risk analysis",
          params: ["address", "chain", "depth?"]
        },
        {
          method: "GET",
          path: "/api/v1/risk/honeypot",
          description: "Check for honeypot contracts",
          params: ["address", "chain"]
        }
      ]
    },
    {
      category: "Sentiment Analysis",
      description: "Social sentiment aggregation from multiple platforms",
      endpoints: [
        {
          method: "GET",
          path: "/api/v1/sentiment/token",
          description: "Get social sentiment for token",
          params: ["address", "sources?", "timeframe?"]
        },
        {
          method: "GET",
          path: "/api/v1/sentiment/kol",
          description: "KOL activity and sentiment tracking",
          params: ["token?", "influencer?", "platform?"]
        }
      ]
    },
    {
      category: "Wallet Tracking",
      description: "Track alpha wallets and smart money movements",
      endpoints: [
        {
          method: "GET",
          path: "/api/v1/wallet/portfolio",
          description: "Get wallet portfolio breakdown",
          params: ["address", "chain?", "include_nft?"]
        },
        {
          method: "GET",
          path: "/api/v1/wallet/transactions",
          description: "Get wallet transaction history",
          params: ["address", "chain?", "limit?", "token?"]
        }
      ]
    },
    {
      category: "DEX Operations",
      description: "Multi-chain DEX interactions and data",
      endpoints: [
        {
          method: "POST",
          path: "/api/v1/dex/quote",
          description: "Get swap quotes across DEXs",
          params: ["tokenA", "tokenB", "amount", "chain", "slippage?"]
        },
        {
          method: "GET",
          path: "/api/v1/dex/pools",
          description: "Get liquidity pool information",
          params: ["token?", "chain", "dex?", "min_liquidity?"]
        }
      ]
    }
  ]

  const integrations = [
    { name: "Dexscreener", category: "Market Data", status: "Live" },
    { name: "CoinGecko", category: "Market Data", status: "Live" },
    { name: "DeFiLlama", category: "DeFi", status: "Live" },
    { name: "GoPlus", category: "Risk", status: "Live" },
    { name: "Honeypot.is", category: "Risk", status: "Live" },
    { name: "Bubblemaps", category: "Risk", status: "Beta" },
    { name: "X (Twitter)", category: "Sentiment", status: "Live" },
    { name: "Telegram", category: "Sentiment", status: "Live" },
    { name: "Reddit", category: "Sentiment", status: "Beta" },
    { name: "LunarCrush", category: "Sentiment", status: "Beta" },
    { name: "Moralis", category: "Infrastructure", status: "Live" },
    { name: "Alchemy", category: "Infrastructure", status: "Live" },
    { name: "Etherscan", category: "Infrastructure", status: "Live" },
    { name: "Uniswap V4", category: "DEX", status: "Live" },
    { name: "PancakeSwap", category: "DEX", status: "Live" },
    { name: "Raydium", category: "DEX", status: "Live" },
    { name: "Nansen", category: "Analytics", status: "Beta" },
    { name: "Dune Analytics", category: "Analytics", status: "Beta" }
  ]

  return (
    <div className="api-docs-page">
      {/* Header */}
      <header className="api-docs-header">
        <div className="api-docs-container">
          <div className="api-docs-hero">
            <h1 className="api-docs-title">API Documentation</h1>
            <p className="api-docs-subtitle">
              Unified trading infrastructure API - One endpoint, 100+ data sources
            </p>
            <div className="api-base-url">
              <span className="base-url-label">Base URL:</span>
              <code className="base-url">https://api.claw.click</code>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Start */}
      <section className="quick-start-section">
        <div className="api-docs-container">
          <h2 className="section-title">Quick Start</h2>
          <div className="code-example">
            <div className="code-header">
              <span className="code-language">curl</span>
            </div>
            <pre className="code-block">
{`curl -X GET "https://api.claw.click/api/v1/market/token" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "address": "0x...",
    "chain": "ethereum"
  }'`}
            </pre>
          </div>
        </div>
      </section>

      {/* Endpoints */}
      <section className="endpoints-section">
        <div className="api-docs-container">
          <h2 className="section-title">API Endpoints</h2>
          
          {endpointCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="endpoint-category">
              <div className="category-header">
                <h3 className="category-title">{category.category}</h3>
                <p className="category-description">{category.description}</p>
              </div>
              
              <div className="endpoints-list">
                {category.endpoints.map((endpoint, endpointIndex) => (
                  <div key={endpointIndex} className="endpoint-item">
                    <div className="endpoint-summary">
                      <span className={`method method-${endpoint.method.toLowerCase()}`}>
                        {endpoint.method}
                      </span>
                      <code className="endpoint-path">{endpoint.path}</code>
                    </div>
                    <p className="endpoint-description">{endpoint.description}</p>
                    <div className="endpoint-params">
                      <span className="params-label">Parameters:</span>
                      {endpoint.params.map((param, paramIndex) => (
                        <code key={paramIndex} className="param-item">
                          {param}
                        </code>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section className="integrations-section">
        <div className="api-docs-container">
          <h2 className="section-title">Data Sources & Integrations</h2>
          <p className="integrations-description">
            Our API aggregates data from {integrations.length}+ premium sources to provide comprehensive market intelligence.
          </p>
          
          <div className="integrations-grid">
            {integrations.map((integration, index) => (
              <div key={index} className="integration-item">
                <div className="integration-header">
                  <span className="integration-name">{integration.name}</span>
                  <span className={`integration-status status-${integration.status.toLowerCase()}`}>
                    {integration.status}
                  </span>
                </div>
                <span className="integration-category">{integration.category}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="api-cta-section">
        <div className="api-docs-container">
          <div className="api-cta">
            <h2 className="cta-title">Ready to Build?</h2>
            <p className="cta-description">
              Get your API key and start building with unified trading infrastructure.
            </p>
            <div className="cta-buttons">
              <button className="cta-button primary">Get API Key</button>
              <button className="cta-button secondary">View Examples</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default ApiDocs