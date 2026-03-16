import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import HomePage from './components/HomePage'
import ApiDocs from './pages/ApiDocs'
import AppMarketplace from './pages/AppMarketplace'
import './pages.css'

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/api" element={<ApiDocs />} />
          <Route path="/app" element={<AppMarketplace />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  )
}

export default App