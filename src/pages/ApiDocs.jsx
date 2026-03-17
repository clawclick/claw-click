import React from 'react'

const ApiDocs = () => {
  const endpointCategories = [
    {
      category: "Market Data",
      description: "Token prices, historical data, and market information",
      endpoints: [
        {
          method: "GET",
          path: "/tokenPoolInfo",
          description: "Token price, market cap, liquidity, volume, and pool info",
          params: ["tokenAddress*", "chain?", "poolAddress?", "symbol?", "tokenName?"]
        },
        {
          method: "GET",
          path: "/tokenPriceHistory",
          description: "Historical OHLCV price data for charting",
          params: ["tokenAddress*", "chain?", "limit?", "interval?", "asset?"]
        },
        {
          method: "GET",
          path: "/detailedTokenStats",
          description: "Bucketed token stats from Codex (cached 30 min)",
          params: ["tokenAddress*", "chain?", "durations?", "bucketCount?"]
        },
        {
          method: "GET",
          path: "/trendingTokens",
          description: "Currently trending tokens across all chains",
          params: []
        },
        {
          method: "GET",
          path: "/tokenSearch",
          description: "Search tokens by name, symbol, or address",
          params: ["query*"]
        },
        {
          method: "GET",
          path: "/filterTokens",
          description: "Filter and rank tokens by on-chain metrics",
          params: ["network?", "phrase?", "minLiquidity?", "sortBy?", "limit?"]
        }
      ]
    },
    {
      category: "Risk Assessment", 
      description: "Token security analysis and risk scoring",
      endpoints: [
        {
          method: "GET",
          path: "/isScam",
          description: "Quick scam check with risk score",
          params: ["tokenAddress*", "chain?"]
        },
        {
          method: "GET",
          path: "/fullAudit",
          description: "Deep contract audit (taxes, ownership, trading flags)",
          params: ["tokenAddress*", "chain?"]
        }
      ]
    },
    {
      category: "Wallet Analysis",
      description: "Wallet tracking, holder analysis, and smart money movements",
      endpoints: [
        {
          method: "GET",
          path: "/walletReview",
          description: "Comprehensive wallet analysis - PnL, holdings, protocols",
          params: ["walletAddress*", "chain?", "days?", "pageCount?"]
        },
        {
          method: "GET",
          path: "/holderAnalysis",
          description: "Holder distribution, concentration, whale tracking",
          params: ["tokenAddress*", "chain?"]
        },
        {
          method: "GET",
          path: "/tokenHolders",
          description: "Raw token-holder ledger for EVM tokens",
          params: ["tokenAddress*", "network?", "cursor?", "limit?"]
        },
        {
          method: "GET",
          path: "/topTraders",
          description: "Top traders for a specific token (multi-chain)",
          params: ["tokenAddress*", "chain?", "timeFrame?"]
        }
      ]
    },
    {
      category: "Trading & DEX",
      description: "Swap execution, quotes, and DEX operations",
      endpoints: [
        {
          method: "GET",
          path: "/swap",
          description: "Build unsigned swap transaction",
          params: ["chain*", "dex*", "walletAddress*", "tokenIn*", "tokenOut*", "amountIn*", "slippageBps?"]
        },
        {
          method: "GET",
          path: "/swapQuote",
          description: "Get swap quote without building transaction",
          params: ["chain*", "dex*", "tokenIn*", "tokenOut*", "amountIn*", "slippageBps?"]
        },
        {
          method: "GET",
          path: "/swapDexes",
          description: "List available DEXes for a chain",
          params: ["chain*"]
        },
        {
          method: "GET",
          path: "/approve",
          description: "Build unsigned approval transaction for swaps",
          params: ["chain*", "dex*", "walletAddress*", "tokenIn*", "tokenOut*", "amount?"]
        },
        {
          method: "GET",
          path: "/unwrap",
          description: "Build unsigned wrapped-native withdraw transaction",
          params: ["chain*", "walletAddress*", "amount*"]
        }
      ]
    },
    {
      category: "Social & Sentiment",
      description: "Social sentiment aggregation and market overview",
      endpoints: [
        {
          method: "GET",
          path: "/marketOverview",
          description: "Combined sentiment, social signals, pool data, and risk check",
          params: ["tokenAddress?", "chain?", "asset?", "poolAddress?"]
        },
        {
          method: "GET",
          path: "/fudSearch",
          description: "Search for FUD mentions across social platforms",
          params: ["symbol?", "tokenName?", "chain?", "tokenAddress?"]
        }
      ]
    },
    {
      category: "Discovery & Monitoring",
      description: "New pairs, gas feeds, and real-time events",
      endpoints: [
        {
          method: "GET",
          path: "/newPairs",
          description: "Recently created trading pairs/pools",
          params: ["source?", "limit?"]
        },
        {
          method: "GET",
          path: "/gasFeed",
          description: "Current gas prices for EVM chains",
          params: ["chain?"]
        },
        {
          method: "WS",
          path: "/ws/launchpadEvents",
          description: "Real-time launchpad token event stream",
          params: ["protocol?", "eventType?", "networkId?"]
        }
      ]
    }
  ]

  const integrations = [
    { name: "Moralis", category: "Infrastructure", status: "Live" },
    { name: "Birdeye", category: "Market Data", status: "Live" },
    { name: "DexScreener", category: "Market Data", status: "Live" },
    { name: "Codex.io", category: "Analytics", status: "Live" },
    { name: "Etherscan", category: "Infrastructure", status: "Live" },
    { name: "GoPlus", category: "Risk", status: "Live" },
    { name: "CoinGecko", category: "Market Data", status: "Live" },
    { name: "CoinMarketCap", category: "Market Data", status: "Live" },
    { name: "GeckoTerminal", category: "Market Data", status: "Live" },
    { name: "Zerion", category: "Portfolio", status: "Live" },
    { name: "DeBank", category: "Portfolio", status: "Live" },
    { name: "Arkham", category: "Analytics", status: "Live" },
    { name: "Dune Analytics", category: "Analytics", status: "Live" },
    { name: "Sim by Dune", category: "Analytics", status: "Live" },
    { name: "LunarCrush", category: "Sentiment", status: "Live" },
    { name: "Reddit API", category: "Sentiment", status: "Live" },
    { name: "X (Twitter)", category: "Sentiment", status: "Live" },
    { name: "Telegram", category: "Sentiment", status: "Live" },
    { name: "Bubblemaps", category: "Risk", status: "Live" },
    { name: "QuickIntel", category: "Risk", status: "Live" },
    { name: "Honeypot.is", category: "Risk", status: "Live" },
    { name: "Santiment", category: "Analytics", status: "Live" },
    { name: "DexTools", category: "Market Data", status: "Live" },
    { name: "Nansen", category: "Analytics", status: "Live" },
    { name: "Uniswap V2/V3/V4", category: "DEX", status: "Live" },
    { name: "PancakeSwap V2/V3", category: "DEX", status: "Live" },
    { name: "Aerodrome V2/V3", category: "DEX", status: "Live" },
    { name: "Raydium", category: "DEX", status: "Live" },
    { name: "Meteora", category: "DEX", status: "Live" },
    { name: "Pump.fun", category: "Launchpad", status: "Live" },
    { name: "Clanker", category: "Launchpad", status: "Live" },
    { name: "Virtuals Protocol", category: "Launchpad", status: "Live" }
  ]

  return (
    <div className="api-docs-page">
      {/* Header */}
      <header className="api-docs-header">
        <div className="api-docs-container">
          <div className="api-docs-hero">
            <h1 className="api-docs-title">API Documentation</h1>
            <p className="api-docs-subtitle">
              Unified crypto intelligence API - 50+ data providers behind clean REST endpoints
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
{`curl -X GET "https://api.claw.click/tokenPoolInfo?chain=eth&tokenAddress=0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" \\
  -H "Content-Type: application/json"

# Response:
{
  "endpoint": "tokenPoolInfo",
  "status": "live",
  "chain": "eth",
  "name": "USD Coin",
  "symbol": "USDC",
  "priceUsd": 1.0001,
  "marketCapUsd": 32000000000,
  "liquidityUsd": 150000000,
  "volume24hUsd": 5000000000,
  "providers": [...]
}`}
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
              Our API aggregates data from {integrations.length}+ premium sources to provide comprehensive crypto intelligence and trading infrastructure.
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