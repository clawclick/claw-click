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
        <div className="description-capsule-black">
          <div className="hero-description">
            <p className="hero-description-text-black">
              Our solution is a unified Trading API that aggregates over 100+ trading, analytics, social and risk data sources into a single programmable interface. Instead of managing multiple integrations, Developers and Agents interact with one standardized endpoint, removing friction of juggling API's, hitting rate limits and keeping on top of manual avenues.
            </p>
          </div>
        </div>
        
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
        
        <div className="strategy-wrappers-content">
          <h2 className="strategy-wrappers-title">Strategy Wrappers</h2>
          <div className="wrapper-cta">
            <button className="wrapper-cta-button">Create Wrapper</button>
          </div>
          <p className="value-prop-text">
            Introducing Strategy Wrappers. Strategies can be packaged as parameterized API endpoints, allowing bots or applications to call trading logic directly while the underlying strategy remains private, allowing for a novel architecture for copy trading capital and allowing strategy creators to earn revenue while not risking capital all verified by the Click Oracle for Data validation in real time.
          </p>
        </div>
      </div>
    </section>
  )
}

export default ValueProp