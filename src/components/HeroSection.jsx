import React, { useEffect, useState } from 'react'
import AnimatedNetworkBackground from './AnimatedNetworkBackground'

const HeroSection = () => {
  const [stats, setStats] = useState({ requests: 0, users: 0, volume: 0 })

  useEffect(() => {
    fetch('https://api.claw.click/admin/stats', {
      headers: { 'x-admin-key': 'ADMIN_API_KEY' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          console.log('Fetched stats:', data)
          const totalRequests = data.requests?.total ?? 0
          const totalUsers = data.users?.totalGenerated ?? 0
          const buyEth = parseFloat(data.volume?.buyEth || '0')
          const sellEth = parseFloat(data.volume?.sellEth || '0')
          const totalVolumeEth = buyEth + sellEth
          setStats({
            requests: totalRequests,
            users: totalUsers,
            volume: totalVolumeEth,
          })
        }
      })
      .catch(() => {})
  }, [])

  return (
    <section className="hero-section">
      <div className="hero-network-layer">
        <AnimatedNetworkBackground />
      </div>
      <div className="hero-container">
        <div className="stats-grid">
          <div className="stat-box">
            <span className="stat-label-large">Requests</span>
            <span className="stat-value-large stat-purple">{stats.requests.toLocaleString()}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label-large">Users</span>
            <span className="stat-value-large stat-purple">{stats.users.toLocaleString()}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label-large">Volume</span>
            <span className="stat-value-large stat-purple">{stats.volume > 0 ? `${stats.volume.toFixed(4)} ETH` : '$0'}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label-large">Integrated API's</span>
            <span className="stat-value-large stat-purple">45+</span>
          </div>
        </div>
        
        <div className="hero-logo-section">
          <img 
            src="/main-logo.png" 
            alt="Claw.Click Logo" 
            className="hero-big-logo"
          />
        </div>
      </div>
    </section>
  )
}

export default HeroSection