import React from 'react'

const HeroSection = () => {
  return (
    <section className="hero-section">
      <div className="hero-container">
        <div className="stats-capsule">
          <div className="stats-line-large">
            <div className="stat-item-large">
              <span className="stat-label-large">Requests: </span>
              <span className="stat-value-large stat-red">0</span>
            </div>
            <div className="stat-item-large">
              <span className="stat-label-large">Users: </span>
              <span className="stat-value-large stat-green">0</span>
            </div>
            <div className="stat-item-large">
              <span className="stat-label-large">Volume: </span>
              <span className="stat-value-large stat-yellow">$0</span>
            </div>
            <div className="stat-item-large">
              <span className="stat-label-large">Integrated API's: </span>
              <span className="stat-value-large stat-blue">45</span>
            </div>
          </div>
        </div>
        
        <div className="hero-logo-section">
          <img 
            src="/logo_black.png" 
            alt="Claw.Click Logo" 
            className="hero-big-logo"
          />
        </div>
        
        <div className="description-capsule">
          <div className="hero-description">
            <p className="hero-description-text">
              <em>"Our solution is a unified Trading API that aggregates over 100+ trading, analytics, social and risk data sources into a single programmable interface.
              Instead of managing multiple integrations, Developers and Agents interact with one standardized endpoint, removing friction of juggling API's, hitting rate limits and keeping on top of manual avenues."</em>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroSection