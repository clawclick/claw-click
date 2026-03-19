import React from 'react'

// Custom professional icons for each feature
export const UnifiedApiIcon = ({ className = "" }) => (
  <div className={`custom-icon ${className}`} style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  </div>
)

export const SecurityIcon = ({ className = "" }) => (
  <div className={`custom-icon ${className}`} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 12L11 14L15 10M21 12C21 16.418 17.418 20 13 20C8.582 20 5 16.418 5 12C5 7.582 8.582 4 13 4C17.418 4 21 7.582 21 12Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="8" r="3" stroke="white" strokeWidth="2"/>
    </svg>
  </div>
)

export const MultiChainIcon = ({ className = "" }) => (
  <div className={`custom-icon ${className}`} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="6" r="2" stroke="white" strokeWidth="2"/>
      <circle cx="6" cy="18" r="2" stroke="white" strokeWidth="2"/>
      <circle cx="18" cy="18" r="2" stroke="white" strokeWidth="2"/>
      <path d="M12 8V16" stroke="white" strokeWidth="2"/>
      <path d="M8 16L16 16" stroke="white" strokeWidth="2"/>
      <path d="M10.5 15L13.5 15" stroke="white" strokeWidth="2"/>
    </svg>
  </div>
)

export const AnalyticsIcon = ({ className = "" }) => (
  <div className={`custom-icon ${className}`} style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 3V21H21" stroke="white" strokeWidth="2"/>
      <path d="M7 14L12 9L16 13L21 8" stroke="white" strokeWidth="2"/>
      <circle cx="7" cy="14" r="1.5" fill="white"/>
      <circle cx="12" cy="9" r="1.5" fill="white"/>
      <circle cx="16" cy="13" r="1.5" fill="white"/>
      <circle cx="21" cy="8" r="1.5" fill="white"/>
    </svg>
  </div>
)

export const AgentIcon = ({ className = "" }) => (
  <div className={`custom-icon ${className}`} style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="16" height="12" rx="2" stroke="white" strokeWidth="2"/>
      <circle cx="8" cy="10" r="1" fill="white"/>
      <circle cx="16" cy="10" r="1" fill="white"/>
      <path d="M10 12H14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 16V20" stroke="white" strokeWidth="2"/>
      <path d="M8 20H16" stroke="white" strokeWidth="2"/>
    </svg>
  </div>
)

export const StrategyIcon = ({ className = "" }) => (
  <div className={`custom-icon ${className}`} style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" strokeWidth="2"/>
      <path d="M9 9H15" stroke="white" strokeWidth="1.5"/>
      <path d="M9 12H15" stroke="white" strokeWidth="1.5"/>
      <path d="M9 15H13" stroke="white" strokeWidth="1.5"/>
      <circle cx="6" cy="9" r="1" fill="white"/>
      <circle cx="6" cy="12" r="1" fill="white"/>
      <circle cx="6" cy="15" r="1" fill="white"/>
    </svg>
  </div>
)