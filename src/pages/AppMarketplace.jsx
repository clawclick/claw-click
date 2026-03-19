import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useEthereumWallet } from '../hooks/useEthereumWallet'
import { fetchAgents } from '../lib/sessionApi'

const AppMarketplace = () => {
  const navigate = useNavigate()
  const { connect, hasProvider, isConnected, isConnecting } = useEthereumWallet()
  const [chainFilter, setChainFilter] = useState('All Chains')
  const [riskFilter, setRiskFilter] = useState('All Risk Levels')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [sortBy, setSortBy] = useState('newest')
  const [strategies, setStrategies] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [walletActionError, setWalletActionError] = useState('')

  useEffect(() => {
    let isMounted = true

    fetchAgents()
      .then((data) => {
        if (isMounted) {
          setStrategies(data)
        }
      })
      .catch((agentError) => {
        if (isMounted) {
          setError(agentError.message || 'Failed to load agents.')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

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
      "Very Low": "#22c55e",
      "Low": "#84cc16",
      "Medium": "#eab308",
      "Moderate": "#eab308",
      "High": "#f97316",
      "Aggressive": "#ef4444",
      "Very High": "#ef4444",
      "unrated": "#6b7280"
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

  const getChainLabel = (chain) => {
    if (!chain) {
      return 'Multi-Chain'
    }

    return String(chain).replace(/_/g, ' ')
  }

  const chainOptions = useMemo(() => {
    return ['All Chains', ...new Set(strategies.flatMap((strategy) => strategy.chains || []).map(getChainLabel))]
  }, [strategies])

  const riskOptions = useMemo(() => {
    return ['All Risk Levels', ...new Set(strategies.map((strategy) => strategy.risk || 'unrated'))]
  }, [strategies])

  const typeOptions = useMemo(() => {
    return ['All Types', ...new Set(strategies.map((strategy) => strategy.type).filter(Boolean))]
  }, [strategies])

  const filteredStrategies = useMemo(() => {
    return [...strategies]
      .filter((strategy) => {
        if (chainFilter !== 'All Chains' && !(strategy.chains || []).map(getChainLabel).includes(chainFilter)) {
          return false
        }

        if (riskFilter !== 'All Risk Levels' && (strategy.risk || 'unrated') !== riskFilter) {
          return false
        }

        if (typeFilter !== 'All Types' && strategy.type !== typeFilter) {
          return false
        }

        return true
      })
      .sort((left, right) => {
        if (sortBy === 'active') {
          return Number(Boolean(right.is_active)) - Number(Boolean(left.is_active))
        }

        if (sortBy === 'type') {
          return String(left.type || '').localeCompare(String(right.type || ''))
        }

        return Number(right.id || 0) - Number(left.id || 0)
      })
  }, [chainFilter, riskFilter, sortBy, strategies, typeFilter])

  const handleMySessions = async () => {
    setWalletActionError('')

    if (!hasProvider) {
      setWalletActionError('MetaMask is required to load your sessions.')
      return
    }

    try {
      if (!isConnected) {
        await connect()
      }

      navigate('/sessions')
    } catch (connectError) {
      setWalletActionError(connectError.message || 'Wallet connection failed.')
    }
  }

  return (
    <div className="app-marketplace-page">
      {/* Header */}
      <header className="app-marketplace-header">
        <div className="app-marketplace-container">
          <div className="app-marketplace-hero">
            <h1 className="app-marketplace-title">Agent Marketplace</h1>
            <p className="app-marketplace-subtitle">
              Launch live backend agents with payment, provisioning, session resume, and terminal chat now wired into the main app.
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
            
            <div className="hero-cta hero-cta-actions">
              <button className="hero-cta-button">Create Wrapper</button>
              <button className="hero-secondary-button" type="button" onClick={handleMySessions} disabled={isConnecting}>
                {isConnecting ? 'Connecting...' : 'My Sessions'}
              </button>
            </div>

            {walletActionError && <div className="marketplace-message marketplace-message-error">{walletActionError}</div>}
          </div>
        </div>
      </header>

      {/* Filters */}
      <section className="filters-section">
        <div className="app-marketplace-container">
          <div className="filters-bar">
            <div className="filter-group">
              <label className="filter-label">Chain:</label>
              <select className="filter-select" value={chainFilter} onChange={(event) => setChainFilter(event.target.value)}>
                {chainOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label className="filter-label">Risk:</label>
              <select className="filter-select" value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}>
                {riskOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label className="filter-label">Type:</label>
              <select className="filter-select" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                {typeOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label className="filter-label">Sort by:</label>
              <select className="filter-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="newest">Newest</option>
                <option value="active">Active First</option>
                <option value="type">Type</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Strategies Grid */}
      <section className="strategies-section">
        <div className="app-marketplace-container">
          {error && <div className="marketplace-message marketplace-message-error">{error}</div>}
          {isLoading && <div className="marketplace-message marketplace-message-info">Loading agents...</div>}
          {!isLoading && !error && filteredStrategies.length === 0 && (
            <div className="marketplace-message marketplace-message-info">No agents matched the current filters.</div>
          )}

          <div className="strategies-grid">
            {filteredStrategies.map((strategy) => (
              <div key={strategy.id} className="strategy-card">
                <div className="strategy-header">
                  <h3 className="strategy-name">{strategy.name}</h3>
                  <div className="strategy-type">{strategy.description || strategy.type || 'Backend agent'}</div>
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
                  {strategy.skill_source_type && <span className="strategy-tag">{strategy.skill_source_type}</span>}
                  {strategy.defaults?.gpuType && <span className="strategy-tag">{strategy.defaults.gpuType}</span>}
                </div>
                
                <div className="strategy-actions">
                  <button className="action-button primary" onClick={() => navigate(`/deploy?agent=${strategy.id}`)}>Deploy</button>
                  <button className="action-button secondary" onClick={() => navigate(`/deploy?agent=${strategy.id}`)}>Details</button>
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
              <Link to="/api" className="cta-button secondary">Documentation</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AppMarketplace