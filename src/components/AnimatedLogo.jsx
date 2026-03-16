import React from 'react'

const AnimatedLogo = ({ className = "", size = 120, color = "#000" }) => {
  return (
    <div className={`animated-logo-container ${className}`}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 500 500" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <style>
            {`
              .logo-path {
                stroke: ${color};
                stroke-width: 4;
                fill: none;
                stroke-dasharray: 12 6;
                stroke-dashoffset: 0;
                animation: liquidFlow 3s linear infinite;
                stroke-linecap: round;
                stroke-linejoin: round;
              }
              
              @keyframes liquidFlow {
                0% { stroke-dashoffset: 0; }
                100% { stroke-dashoffset: -18; }
              }
            `}
          </style>
        </defs>

        <g>
          {/* Outer C curve - exactly as in your logo */}
          <path 
            className="logo-path"
            d="M 250 50 
               C 360 50, 450 140, 450 250
               C 450 360, 360 450, 250 450
               C 140 450, 50 360, 50 250
               C 50 140, 140 50, 250 50"
            style={{ animationDelay: '0s' }}
          />
          
          {/* Inner C curve - creating the C thickness */}
          <path 
            className="logo-path"
            d="M 250 130
               C 320 130, 370 180, 370 250  
               C 370 320, 320 370, 250 370
               C 180 370, 130 320, 130 250
               C 130 180, 180 130, 250 130"
            style={{ animationDelay: '0.8s' }}
          />

          {/* Top horizontal line */}
          <path 
            className="logo-path"
            d="M 270 130 L 450 130"
            style={{ animationDelay: '1.6s' }}
          />
          
          {/* Middle horizontal rectangle outline */}
          <path 
            className="logo-path"
            d="M 360 210 L 450 210 L 450 290 L 360 290 Z"
            style={{ animationDelay: '2.4s' }}
          />
          
          {/* Bottom horizontal line */}
          <path 
            className="logo-path"
            d="M 270 370 L 450 370"
            style={{ animationDelay: '3.2s' }}
          />
          
          {/* Bottom vertical line */}
          <path 
            className="logo-path"
            d="M 450 370 L 450 450"
            style={{ animationDelay: '4s' }}
          />
          
          {/* Diagonal line in middle rectangle */}
          <path 
            className="logo-path"
            d="M 360 210 L 450 290"
            style={{ animationDelay: '4.8s' }}
          />
        </g>
      </svg>
    </div>
  )
}

export default AnimatedLogo