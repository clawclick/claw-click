import React, { useState } from 'react'

const InteractiveChart = () => {
  const [tooltip, setTooltip] = useState(null)
  
  // Mock data points for the 4 metrics
  const chartData = [
    { x: 20, liquidity: 65, volume: 78, buyRatio: 82, holderGrowth: 45 },
    { x: 40, liquidity: 72, volume: 85, buyRatio: 76, holderGrowth: 62 },
    { x: 60, liquidity: 68, volume: 92, buyRatio: 88, holderGrowth: 71 },
    { x: 80, liquidity: 85, volume: 96, buyRatio: 94, holderGrowth: 79 },
    { x: 100, liquidity: 91, volume: 89, buyRatio: 91, holderGrowth: 85 },
    { x: 120, liquidity: 88, volume: 84, buyRatio: 87, holderGrowth: 88 },
    { x: 140, liquidity: 93, volume: 91, buyRatio: 92, holderGrowth: 91 },
  ]

  const handleMouseMove = (e, dataPoint) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Calculate overall signal strength (weighted average)
    const signalStrength = Math.round(
      (dataPoint.liquidity * 0.3 + 
       dataPoint.volume * 0.25 + 
       dataPoint.buyRatio * 0.25 + 
       dataPoint.holderGrowth * 0.2)
    )
    
    setTooltip({
      x: x + 10,
      y: y - 10,
      data: dataPoint,
      signalStrength
    })
  }

  const handleMouseLeave = () => {
    setTooltip(null)
  }

  return (
    <div className="chart-container">
      <div className="chart-header">
        <span className="chart-time">24h Momentum Analysis</span>
        <span className="chart-status">● LIVE</span>
      </div>
      
      <svg 
        width="100%" 
        height="180" 
        viewBox="0 0 200 180"
        onMouseLeave={handleMouseLeave}
        className="signal-chart"
      >
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="20" height="18" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 18" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Liquidity line */}
        <polyline
          fill="none"
          stroke="#0d9e8a"
          strokeWidth="2"
          points={chartData.map(d => `${d.x},${160 - d.liquidity}`).join(' ')}
        />
        
        {/* Volume line */}
        <polyline
          fill="none"
          stroke="#5cd4be"
          strokeWidth="2"
          points={chartData.map(d => `${d.x},${160 - d.volume}`).join(' ')}
        />
        
        {/* Buy/Sell Ratio line */}
        <polyline
          fill="none"
          stroke="#00e6b8"
          strokeWidth="2"
          points={chartData.map(d => `${d.x},${160 - d.buyRatio}`).join(' ')}
        />
        
        {/* Holder Growth line */}
        <polyline
          fill="none"
          stroke="#66ffe8"
          strokeWidth="2"
          points={chartData.map(d => `${d.x},${160 - d.holderGrowth}`).join(' ')}
        />
        
        {/* Interactive points */}
        {chartData.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={160 - point.volume}
            r="6"
            fill="transparent"
            onMouseMove={(e) => handleMouseMove(e, point)}
          />
        ))}
      </svg>
      
      {/* Chart Legend */}
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-color" style={{backgroundColor: '#0d9e8a'}}></span>
          <span>Liquidity</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{backgroundColor: '#5cd4be'}}></span>
          <span>Volume</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{backgroundColor: '#00e6b8'}}></span>
          <span>Buy/Sell</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{backgroundColor: '#66ffe8'}}></span>
          <span>Holders</span>
        </div>
      </div>
      
      {/* Tooltip */}
      {tooltip && (
        <div 
          className="chart-tooltip"
          style={{ 
            left: tooltip.x, 
            top: tooltip.y,
            transform: tooltip.x > 150 ? 'translateX(-100%)' : 'none'
          }}
        >
          <div className="tooltip-header">Signal Strength: {tooltip.signalStrength}/100</div>
          <div className="tooltip-metrics">
            <div>Liquidity: {tooltip.data.liquidity}%</div>
            <div>Volume: {tooltip.data.volume}%</div>
            <div>Buy/Sell: {tooltip.data.buyRatio}%</div>
            <div>Holders: {tooltip.data.holderGrowth}%</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InteractiveChart