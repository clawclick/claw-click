import React from 'react'
import { Link } from 'react-router-dom'

const Header = () => {
  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo-section">
          <img src="/logo.png" alt="Claw.Click" className="logo-image" />
          <span className="brand-text">Claw.Click</span>
        </Link>
        
        <nav className="nav-menu">
          <Link to="/api" className="nav-link">API</Link>
          <Link to="/app" className="nav-link">APP</Link>
        </nav>
      </div>
    </header>
  )
}

export default Header