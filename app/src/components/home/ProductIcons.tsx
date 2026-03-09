// Animated SVG icons for products - Mint/Teal Rebrand

import { CSSProperties } from 'react'

const iconStyles = `
@keyframes iconPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@keyframes iconRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes iconOrbit {
  from { transform: rotate(0deg) translateX(12px) rotate(0deg); }
  to { transform: rotate(360deg) translateX(12px) rotate(-360deg); }
}

@keyframes iconFloat {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-4px); }
}

@keyframes iconGlow {
  0%, 100% { filter: drop-shadow(0 0 4px var(--mint-mid)); }
  50% { filter: drop-shadow(0 0 8px var(--glow)); }
}

@keyframes pathDraw {
  from { stroke-dashoffset: 100; }
  to { stroke-dashoffset: 0; }
}

@keyframes scale {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
`

export const ImmortalizeIcon = () => (
  <>
    <style>{iconStyles}</style>
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer rotating ring */}
      <circle 
        cx="24" 
        cy="24" 
        r="22" 
        stroke="currentColor" 
        strokeWidth="1" 
        strokeDasharray="4 6" 
        opacity="0.4"
        style={{ 
          animation: 'iconRotate 20s linear infinite',
          transformOrigin: '24px 24px'
        }}
      />
      
      {/* Agent head with pulse */}
      <circle 
        cx="24" 
        cy="16" 
        r="7" 
        stroke="currentColor" 
        strokeWidth="2.5"
        style={{ animation: 'iconPulse 3s ease-in-out infinite' }}
      />
      
      {/* Body path with glow */}
      <path 
        d="M12 38C12 31.3726 17.3726 26 24 26C30.6274 26 36 31.3726 36 38" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round"
        style={{ 
          filter: 'drop-shadow(0 0 6px currentColor)',
          animation: 'iconFloat 3s ease-in-out infinite'
        }}
      />
      
      {/* Orbiting particles */}
      <circle 
        cx="24" 
        cy="24" 
        r="2" 
        fill="currentColor" 
        opacity="0.8"
        style={{ 
          animation: 'iconOrbit 4s linear infinite',
          transformOrigin: '24px 24px'
        }}
      />
      
      {/* Inner glow ring */}
      <circle 
        cx="24" 
        cy="16" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="0.5" 
        opacity="0.3"
        style={{ animation: 'scale 2s ease-in-out infinite' }}
      />
    </svg>
  </>
)

export const LaunchIcon = () => (
  <>
    <style>{iconStyles}</style>
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Rocket path */}
      <path 
        d="M14 34L34 14M34 14H20M34 14V28" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        style={{ 
          filter: 'drop-shadow(0 0 4px currentColor)',
          animation: 'iconGlow 2s ease-in-out infinite'
        }}
      />
      
      {/* Exhaust flames */}
      <path 
        d="M14 20L20 14" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round"
        style={{ 
          opacity: 0.7,
          animation: 'iconPulse 1s ease-in-out infinite'
        }}
      />
      <path 
        d="M28 34L34 28" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round"
        style={{ 
          opacity: 0.7,
          animation: 'iconPulse 1s ease-in-out infinite 0.3s'
        }}
      />
      
      {/* Speed lines */}
      <line 
        x1="10" 
        y1="38" 
        x2="14" 
        y2="34" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round"
        opacity="0.4"
        style={{ animation: 'pathDraw 2s ease-in-out infinite' }}
      />
      <line 
        x1="6" 
        y1="34" 
        x2="10" 
        y2="30" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round"
        opacity="0.4"
        style={{ animation: 'pathDraw 2s ease-in-out infinite 0.2s' }}
      />
      
      {/* Outer orbit ring */}
      <circle 
        cx="24" 
        cy="24" 
        r="22" 
        stroke="currentColor" 
        strokeWidth="1" 
        opacity="0.2"
        strokeDasharray="3 5"
        style={{ 
          animation: 'iconRotate 15s linear infinite reverse',
          transformOrigin: '24px 24px'
        }}
      />
    </svg>
  </>
)

export const SoulIcon = () => (
  <>
    <style>{iconStyles}</style>
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ghost body with float */}
      <path 
        d="M24 8C16 8 10 14 10 22V36L14 32L18 36L22 32L26 36L30 32L34 36L38 32V22C38 14 32 8 24 8Z" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinejoin="round"
        style={{ 
          animation: 'iconFloat 3s ease-in-out infinite',
          filter: 'drop-shadow(0 4px 8px rgba(69, 199, 184, 0.3))'
        }}
      />
      
      {/* Eyes with pulse */}
      <circle 
        cx="18" 
        cy="20" 
        r="2.5" 
        fill="currentColor"
        style={{ animation: 'iconPulse 2s ease-in-out infinite' }}
      />
      <circle 
        cx="30" 
        cy="20" 
        r="2.5" 
        fill="currentColor"
        style={{ animation: 'iconPulse 2s ease-in-out infinite 0.1s' }}
      />
      
      {/* Smile */}
      <path 
        d="M20 26C20 26 22 28 24 28C26 28 28 26 28 26" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round"
      />
      
      {/* Sparkles */}
      <g opacity="0.6" style={{ animation: 'iconPulse 2s ease-in-out infinite' }}>
        <line x1="40" y1="12" x2="40" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="38" y1="14" x2="42" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      <g opacity="0.6" style={{ animation: 'iconPulse 2s ease-in-out infinite 0.5s' }}>
        <line x1="8" y1="16" x2="8" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="6" y1="18" x2="10" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  </>
)

export const StakingIcon = () => (
  <>
    <style>{iconStyles}</style>
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Stacked blocks with animated build effect */}
      <rect 
        x="12" 
        y="28" 
        width="24" 
        height="12" 
        rx="2" 
        stroke="currentColor" 
        strokeWidth="2"
        style={{ 
          animation: 'iconFloat 3s ease-in-out infinite',
          filter: 'drop-shadow(0 2px 4px rgba(69, 199, 184, 0.3))'
        }}
      />
      <rect 
        x="16" 
        y="18" 
        width="16" 
        height="12" 
        rx="2" 
        stroke="currentColor" 
        strokeWidth="2"
        style={{ 
          animation: 'iconFloat 3s ease-in-out infinite 0.2s',
          filter: 'drop-shadow(0 2px 4px rgba(69, 199, 184, 0.3))'
        }}
      />
      <rect 
        x="20" 
        y="8" 
        width="8" 
        height="12" 
        rx="2" 
        stroke="currentColor" 
        strokeWidth="2"
        style={{ 
          animation: 'iconFloat 3s ease-in-out infinite 0.4s',
          filter: 'drop-shadow(0 2px 4px rgba(69, 199, 184, 0.3))'
        }}
      />
      
      {/* Center glow dots */}
      <circle 
        cx="24" 
        cy="34" 
        r="1.5" 
        fill="currentColor"
        style={{ animation: 'iconPulse 2s ease-in-out infinite' }}
      />
      <circle 
        cx="24" 
        cy="24" 
        r="1.5" 
        fill="currentColor"
        style={{ animation: 'iconPulse 2s ease-in-out infinite 0.3s' }}
      />
      <circle 
        cx="24" 
        cy="14" 
        r="1.5" 
        fill="currentColor"
        style={{ animation: 'iconPulse 2s ease-in-out infinite 0.6s' }}
      />
    </svg>
  </>
)

export const LockerIcon = () => (
  <>
    <style>{iconStyles}</style>
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Lock body */}
      <rect 
        x="14" 
        y="22" 
        width="20" 
        height="18" 
        rx="2" 
        stroke="currentColor" 
        strokeWidth="2.5"
        style={{ filter: 'drop-shadow(0 4px 8px rgba(69, 199, 184, 0.3))' }}
      />
      
      {/* Lock shackle with glow */}
      <path 
        d="M18 22V16C18 12.6863 20.6863 10 24 10C27.3137 10 30 12.6863 30 16V22" 
        stroke="currentColor" 
        strokeWidth="2.5"
        style={{ 
          filter: 'drop-shadow(0 0 6px currentColor)',
          animation: 'iconGlow 3s ease-in-out infinite'
        }}
      />
      
      {/* Keyhole with rotating inner circle */}
      <circle 
        cx="24" 
        cy="31" 
        r="3" 
        stroke="currentColor" 
        strokeWidth="2"
      />
      <path 
        d="M24 34V36" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round"
      />
      
      {/* Security dots */}
      <circle 
        cx="19" 
        cy="27" 
        r="1" 
        fill="currentColor"
        opacity="0.5"
        style={{ animation: 'iconPulse 2s ease-in-out infinite' }}
      />
      <circle 
        cx="29" 
        cy="27" 
        r="1" 
        fill="currentColor"
        opacity="0.5"
        style={{ animation: 'iconPulse 2s ease-in-out infinite 0.3s' }}
      />
      
      {/* Rotating shield outline */}
      <path 
        d="M24 6L28 8L28 14C28 17 26 19 24 20C22 19 20 17 20 14L20 8L24 6Z" 
        stroke="currentColor" 
        strokeWidth="0.5" 
        opacity="0.3"
        style={{ 
          animation: 'iconRotate 20s linear infinite',
          transformOrigin: '24px 13px'
        }}
      />
    </svg>
  </>
)

export const PerpsIcon = () => (
  <>
    <style>{iconStyles}</style>
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Chart bars */}
      <path 
        d="M8 40V28L16 20L24 32L32 16L40 24V40" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinejoin="round"
        style={{ 
          filter: 'drop-shadow(0 0 6px currentColor)',
          animation: 'iconGlow 2s ease-in-out infinite'
        }}
      />
      
      {/* Data points with pulse */}
      <circle cx="8" cy="28" r="2.5" fill="currentColor" style={{ animation: 'scale 2s ease-in-out infinite' }} />
      <circle cx="16" cy="20" r="2.5" fill="currentColor" style={{ animation: 'scale 2s ease-in-out infinite 0.2s' }} />
      <circle cx="24" cy="32" r="2.5" fill="currentColor" style={{ animation: 'scale 2s ease-in-out infinite 0.4s' }} />
      <circle cx="32" cy="16" r="2.5" fill="currentColor" style={{ animation: 'scale 2s ease-in-out infinite 0.6s' }} />
      <circle cx="40" cy="24" r="2.5" fill="currentColor" style={{ animation: 'scale 2s ease-in-out infinite 0.8s' }} />
      
      {/* Trend arrow */}
      <path 
        d="M32 12L40 12L40 20" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        opacity="0.6"
        style={{ animation: 'iconPulse 2s ease-in-out infinite' }}
      />
      
      {/* Grid lines */}
      <line x1="8" y1="12" x2="40" y2="12" stroke="currentColor" strokeWidth="0.5" opacity="0.2" strokeDasharray="2 2" />
      <line x1="8" y1="24" x2="40" y2="24" stroke="currentColor" strokeWidth="0.5" opacity="0.2" strokeDasharray="2 2" />
    </svg>
  </>
)

export const FunlanIcon = () => (
  <>
    <style>{iconStyles}</style>
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Network nodes */}
      <circle 
        cx="24" 
        cy="24" 
        r="4" 
        stroke="currentColor" 
        strokeWidth="2.5"
        style={{ 
          filter: 'drop-shadow(0 0 8px currentColor)',
          animation: 'iconPulse 2s ease-in-out infinite'
        }}
      />
      
      {/* Orbiting connection nodes */}
      <g style={{ animation: 'iconRotate 8s linear infinite', transformOrigin: '24px 24px' }}>
        <circle cx="24" cy="10" r="3" fill="currentColor" opacity="0.8" />
        <line x1="24" y1="13" x2="24" y2="20" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      </g>
      
      <g style={{ animation: 'iconRotate 8s linear infinite 2s', transformOrigin: '24px 24px' }}>
        <circle cx="38" cy="24" r="3" fill="currentColor" opacity="0.8" />
        <line x1="35" y1="24" x2="28" y2="24" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      </g>
      
      <g style={{ animation: 'iconRotate 8s linear infinite 4s', transformOrigin: '24px 24px' }}>
        <circle cx="24" cy="38" r="3" fill="currentColor" opacity="0.8" />
        <line x1="24" y1="35" x2="24" y2="28" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      </g>
      
      <g style={{ animation: 'iconRotate 8s linear infinite 6s', transformOrigin: '24px 24px' }}>
        <circle cx="10" cy="24" r="3" fill="currentColor" opacity="0.8" />
        <line x1="13" y1="24" x2="20" y2="24" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      </g>
      
      {/* Outer ring */}
      <circle 
        cx="24" 
        cy="24" 
        r="20" 
        stroke="currentColor" 
        strokeWidth="1" 
        opacity="0.3"
        strokeDasharray="4 4"
        style={{ 
          animation: 'iconRotate 15s linear infinite reverse',
          transformOrigin: '24px 24px'
        }}
      />
    </svg>
  </>
)

export const GPUSessionsIcon = () => (
  <>
    <style>{iconStyles}</style>
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* GPU chip outline */}
      <rect 
        x="12" 
        y="12" 
        width="24" 
        height="24" 
        rx="2" 
        stroke="currentColor" 
        strokeWidth="2.5"
        style={{ filter: 'drop-shadow(0 4px 8px rgba(69, 199, 184, 0.3))' }}
      />
      
      {/* Processing cores with pulse */}
      <rect x="16" y="16" width="6" height="6" rx="1" fill="currentColor" opacity="0.7" style={{ animation: 'iconPulse 1.5s ease-in-out infinite' }} />
      <rect x="26" y="16" width="6" height="6" rx="1" fill="currentColor" opacity="0.7" style={{ animation: 'iconPulse 1.5s ease-in-out infinite 0.2s' }} />
      <rect x="16" y="26" width="6" height="6" rx="1" fill="currentColor" opacity="0.7" style={{ animation: 'iconPulse 1.5s ease-in-out infinite 0.4s' }} />
      <rect x="26" y="26" width="6" height="6" rx="1" fill="currentColor" opacity="0.7" style={{ animation: 'iconPulse 1.5s ease-in-out infinite 0.6s' }} />
      
      {/* Connection pins */}
      <line x1="8" y1="16" x2="12" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="24" x2="12" y2="24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="32" x2="12" y2="32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      
      <line x1="36" y1="16" x2="40" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="36" y1="24" x2="40" y2="24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="36" y1="32" x2="40" y2="32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      
      {/* Data flow animation */}
      <circle 
        cx="10" 
        cy="24" 
        r="1.5" 
        fill="currentColor"
        style={{ 
          animation: 'iconPulse 1s ease-in-out infinite',
          filter: 'drop-shadow(0 0 4px currentColor)'
        }}
      />
      <circle 
        cx="38" 
        cy="24" 
        r="1.5" 
        fill="currentColor"
        style={{ 
          animation: 'iconPulse 1s ease-in-out infinite 0.5s',
          filter: 'drop-shadow(0 0 4px currentColor)'
        }}
      />
    </svg>
  </>
)

export const DashboardIcon = () => (
  <>
    <style>{iconStyles}</style>
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Grid layout */}
      <rect 
        x="8" 
        y="8" 
        width="14" 
        height="14" 
        rx="2" 
        stroke="currentColor" 
        strokeWidth="2"
        style={{ animation: 'iconFloat 3s ease-in-out infinite' }}
      />
      <rect 
        x="26" 
        y="8" 
        width="14" 
        height="14" 
        rx="2" 
        stroke="currentColor" 
        strokeWidth="2"
        style={{ animation: 'iconFloat 3s ease-in-out infinite 0.3s' }}
      />
      <rect 
        x="8" 
        y="26" 
        width="14" 
        height="14" 
        rx="2" 
        stroke="currentColor" 
        strokeWidth="2"
        style={{ animation: 'iconFloat 3s ease-in-out infinite 0.6s' }}
      />
      <rect 
        x="26" 
        y="26" 
        width="14" 
        height="14" 
        rx="2" 
        stroke="currentColor" 
        strokeWidth="2"
        style={{ animation: 'iconFloat 3s ease-in-out infinite 0.9s' }}
      />
      
      {/* Activity indicators */}
      <circle cx="15" cy="15" r="2" fill="currentColor" style={{ animation: 'iconPulse 2s ease-in-out infinite' }} />
      <circle cx="33" cy="15" r="2" fill="currentColor" style={{ animation: 'iconPulse 2s ease-in-out infinite 0.3s' }} />
      <circle cx="15" cy="33" r="2" fill="currentColor" style={{ animation: 'iconPulse 2s ease-in-out infinite 0.6s' }} />
      <circle cx="33" cy="33" r="2" fill="currentColor" style={{ animation: 'iconPulse 2s ease-in-out infinite 0.9s' }} />
    </svg>
  </>
)
