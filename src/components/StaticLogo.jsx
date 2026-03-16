import React from 'react'

const StaticLogo = ({ className = "", size = 120, color = "#000" }) => {
  return (
    <div className={`static-logo-container ${className}`}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 500 500" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <g>
          {/* Main C shape - outer curve */}
          <path 
            d="M 250 50 
               C 360 50, 450 140, 450 250
               C 450 360, 360 450, 250 450
               C 140 450, 50 360, 50 250
               C 50 140, 140 50, 250 50"
            fill={color}
          />
          
          {/* Inner curve to create C thickness */}
          <path 
            d="M 250 130
               C 320 130, 370 180, 370 250  
               C 370 320, 320 370, 250 370
               C 180 370, 130 320, 130 250
               C 130 180, 180 130, 250 130"
            fill="#fff"
          />

          {/* Top horizontal rectangle */}
          <rect 
            x="270" 
            y="50" 
            width="180" 
            height="80" 
            fill={color}
          />
          
          {/* Middle rectangle */}
          <rect 
            x="360" 
            y="210" 
            width="90" 
            height="80" 
            fill={color}
          />
          
          {/* Bottom rectangle */}
          <rect 
            x="270" 
            y="370" 
            width="180" 
            height="80" 
            fill={color}
          />
          
          {/* Diagonal line in middle rectangle */}
          <path 
            d="M 360 210 L 450 290 L 435 305 L 345 225 Z"
            fill="#fff"
          />
        </g>
      </svg>
    </div>
  )
}

export default StaticLogo