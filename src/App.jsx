import React from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import HomePage from './components/HomePage'
import ApiDocs from './pages/ApiDocs'
import AppMarketplace from './pages/AppMarketplace'
import DeploySession from './pages/DeploySession'
import MySessions from './pages/MySessions'
import SessionTerminal from './pages/SessionTerminal'
import './pages.css'
import './homepage-styles.css'

function AppContent() {
  const location = useLocation()
  const shouldShowFooter = location.pathname !== '/api'

  return (
    <div className="App">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/api" element={<ApiDocs />} />
        <Route path="/app" element={<AppMarketplace />} />
      </Routes>
      {shouldShowFooter && <Footer />}
    </div>
  )
}

function AppShell() {
  const location = useLocation()
  const hideChrome = location.pathname.startsWith('/deploy') || location.pathname.startsWith('/session/')

  return (
    <div className="App">
      {!hideChrome && <Header />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/api" element={<ApiDocs />} />
        <Route path="/app" element={<AppMarketplace />} />
        <Route path="/deploy" element={<DeploySession />} />
        <Route path="/sessions" element={<MySessions />} />
        <Route path="/session/:id" element={<SessionTerminal />} />
      </Routes>
      {!hideChrome && <Footer />}
    </div>
  )
}

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  )
}

export default App