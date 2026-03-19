import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAgents } from '../lib/sessionApi'

const ValueProp = () => {
  const navigate = useNavigate()
  const [strategies, setStrategies] = useState([])

  useEffect(() => {
    let isMounted = true

    fetchAgents()
      .then((data) => {
        if (isMounted) {
          setStrategies(data.slice(0, 3))
        }
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [])

  const formatCreator = (creator) => {
    if (!creator) {
      return 'System'
    }

    if (creator.startsWith('0x') && creator.length > 10) {
      return `${creator.slice(0, 6)}...${creator.slice(-4)}`
    }

    return creator
  }

  const getRiskColor = (risk) => {
    const colors = {
      "Low": "#84cc16",
      "Medium": "#eab308",
      "Moderate": "#eab308",
      "High": "#f97316",
      "Aggressive": "#ef4444",
      "unrated": "#6b7280"
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

  const getChainLabel = (chain) => {
    if (!chain) {
      return 'Multi-Chain'
    }

    return String(chain).replace(/_/g, ' ')
  }

  return (
    <section className="value-prop-section">
      <div className="value-prop-container">
        <header className="value-prop-header">
          <h2 className="value-prop-title">
            Why Developers Choose Claw.Click
          </h2>
          <p className="value-prop-subtitle">
            Stop managing multiple APIs, rate limits, and inconsistent data formats. 
            Focus on building great products with our unified trading infrastructure.
          </p>
        </header>
        
        <div className="strategy-examples">
          {strategies.map((strategy) => (
            <div key={strategy.id} className="strategy-card-preview">
              <div className="strategy-header">
                <h3 className="strategy-name">{strategy.name}</h3>
                <div className="strategy-type">{strategy.description || 'Backend agent ready to deploy'}</div>
              </div>
              
              <div className="strategy-metrics">
                <div className="metric-row">
                  <div className="metric">
                    <span className="metric-label">Agent ID</span>
                    <span className="metric-value">#{strategy.id}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Status</span>
                    <span className="metric-value win-rate">{strategy.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
                
                <div className="metric-row">
                  <div className="metric">
                    <span className="metric-label">Type</span>
                    <span className="metric-value apy">{strategy.type || 'Unknown'}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Creator</span>
                    <span className="metric-value">{formatCreator(strategy.created_by)}</span>
                  </div>
                </div>
              </div>
              
              <div className="strategy-details">
                <div className="strategy-chain">
                  <span 
                    className="chain-badge"
                    style={{ backgroundColor: getChainColor(getChainLabel(strategy.chains?.[0])) }}
                  >
                    {getChainLabel(strategy.chains?.[0])}
                  </span>
                </div>
                
                <div className="strategy-risk">
                  <span 
                    className="risk-badge"
                    style={{ backgroundColor: getRiskColor(strategy.risk || 'unrated') }}
                  >
                    {strategy.risk || 'unrated'}
                  </span>
                </div>
              </div>
              
              <div className="strategy-tags">
                {(strategy.chains || []).slice(1, 3).map((tag, index) => (
                  <span key={index} className="strategy-tag">{tag}</span>
                ))}
                {strategy.defaults?.gpuType && <span className="strategy-tag">{strategy.defaults.gpuType}</span>}
              </div>
              
              <div className="strategy-actions">
                <button className="action-button primary" onClick={() => navigate(`/deploy?agent=${strategy.id}`)}>Deploy</button>
                <button className="action-button secondary" onClick={() => navigate('/app')}>See More</button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="api-showcase">
          <h3 className="showcase-title">Universal Router For Agents</h3>
          <div className="code-showcase">
            <div className="code-block-showcase">
              <div className="code-header">
                <span className="code-language">Strategy: newPump.js</span>
                <span className="status-live">Live Implementation</span>
              </div>
              <div className="code-content">
                <pre>
{`// Multi-source token discovery
const [newPairs, trending, filtered] = await Promise.all([
  fetch("https://api.claw.click/newPairs?source=pumpfun"),
  fetch("https://api.claw.click/trendingTokens"),
  fetch("https://api.claw.click/filterTokens?network=sol&minLiquidity=10000")
]);

// Enrich with unified data
const enriched = await processTokens(addresses);
const signals = applyFilters(enriched);`}
                </pre>
              </div>
            </div>
            
            <div className="arrow-showcase">→</div>
            
            <div className="response-showcase">
              <div className="response-header">
                <span>Aggregated Intelligence</span>
              </div>
              <div className="response-content">
                <pre>
{`🎯 === TOP NEW SIGNALS ===
{
  ca: "z6eiti618XERFhoB9j5FpbJ7sGf5yTjpw4zp7twpump",
  name: "tinfoil hat cult", 
  volume: 45000,
  liquidity: 85000,
  momentum: 0.425,
  score: 87.3,
  providers: ["dexScreener", "birdeye", "pumpfun"]
}`}
                </pre>
              </div>
            </div>
          </div>
          
          <div className="showcase-cta">
            <a href="/api" className="showcase-button">
              Explore Full API Documentation →
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ValueProp