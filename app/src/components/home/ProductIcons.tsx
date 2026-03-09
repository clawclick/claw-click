// Animated SVG icons for products - Mint/Teal Rebrand - HEAVY ANIMATIONS

const css = `
@keyframes ip-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes ip-rotate-r { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
@keyframes ip-pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(0.85); } }
@keyframes ip-pulse2 { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
@keyframes ip-float { 0%,100% { transform:translateY(0px); } 50% { transform:translateY(-5px); } }
@keyframes ip-dash { from { stroke-dashoffset:200; } to { stroke-dashoffset:0; } }
@keyframes ip-glow { 0%,100% { filter:drop-shadow(0 0 3px #45C7B8); } 50% { filter:drop-shadow(0 0 12px #2EE6D6) drop-shadow(0 0 20px #7DE2D1); } }
@keyframes ip-orbit { from { transform:rotate(0deg) translateX(14px) rotate(0deg); } to { transform:rotate(360deg) translateX(14px) rotate(-360deg); } }
@keyframes ip-orbit2 { from { transform:rotate(180deg) translateX(10px) rotate(-180deg); } to { transform:rotate(540deg) translateX(10px) rotate(-540deg); } }
@keyframes ip-draw { 0% { stroke-dashoffset:100; opacity:0; } 30% { opacity:1; } 100% { stroke-dashoffset:0; opacity:1; } }
@keyframes ip-flicker { 0%,100% { opacity:1; } 45% { opacity:1; } 50% { opacity:0.2; } 55% { opacity:1; } 75% { opacity:1; } 80% { opacity:0.4; } 85% { opacity:1; } }
@keyframes ip-spin-y { 0%,100% { transform:scaleX(1); } 50% { transform:scaleX(-1); } }
@keyframes ip-data { 0% { transform:translateX(-20px); opacity:0; } 50% { opacity:1; } 100% { transform:translateX(20px); opacity:0; } }
@keyframes ip-wave { 0%,100% { d:path("M6 28 Q12 22 18 28 Q24 34 30 28 Q36 22 42 28"); } 50% { d:path("M6 28 Q12 34 18 28 Q24 22 30 28 Q36 34 42 28"); } }
@keyframes ip-expand { 0%,100% { transform:scale(1); opacity:0.4; } 50% { transform:scale(1.5); opacity:0; } }
`

/* ---------- LAUNCH ICON - ANIMATED ROCKET ---------- */
export const LaunchIcon = () => (
  <>
    <style>{css}
    @keyframes rocketFloat {
      0%, 100% { transform: translateY(0px) rotate(-45deg); }
      50% { transform: translateY(-5px) rotate(-45deg); }
    }
    @keyframes flamePulse {
      0%, 100% { transform: scaleY(1) scaleX(1); opacity: 0.9; }
      50% { transform: scaleY(1.4) scaleX(0.8); opacity: 0.6; }
    }
    @keyframes trailFade {
      0% { opacity: 0.8; transform: scaleX(1); }
      100% { opacity: 0; transform: scaleX(0.2); }
    }
    </style>
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      {/* Launch arc background */}
      <path d="M8 44 Q18 18 44 8" stroke="#45C7B8" strokeWidth="0.8" strokeDasharray="3 4" opacity="0.3"
        style={{ animation: 'ip-pulse2 3s ease-in-out infinite' }} />

      {/* Rocket group - flying at 45° */}
      <g style={{ animation: 'rocketFloat 2s ease-in-out infinite', transformOrigin: '28px 24px' }}>
        {/* Rocket body */}
        <path d="M28 12 C28 12 38 16 38 28 L32 34 L22 24 Z" fill="#45C7B8" opacity="0.95"
          style={{ filter: 'drop-shadow(0 0 6px #2EE6D6)' }} />
        {/* Nose cone */}
        <path d="M38 12 C42 8 46 8 46 8 C46 8 46 12 42 16 Z" fill="#7DE2D1" opacity="0.9" />
        {/* Left fin */}
        <path d="M22 24 L16 32 L24 30 Z" fill="#7DE2D1" opacity="0.8" />
        {/* Bottom fin */}
        <path d="M32 34 L38 40 L34 32 Z" fill="#7DE2D1" opacity="0.8" />
        {/* Window porthole */}
        <circle cx="33" cy="23" r="3.5" stroke="#E9F7F4" strokeWidth="1.5" fill="#2EE6D6" fillOpacity="0.4" />
        <circle cx="33" cy="23" r="1.2" fill="#E9F7F4" opacity="0.8" />
        {/* Flame at back */}
        <g style={{ animation: 'flamePulse 0.4s ease-in-out infinite', transformOrigin: '21px 29px' }}>
          <path d="M22 24 L14 32 L20 28 L12 36 L19 31 L16 38" stroke="#2EE6D6" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M22 26 L15 34 L21 30" stroke="#7DE2D1" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7" />
        </g>
      </g>

      {/* Exhaust trail particles */}
      {[{x:18,y:38,d:0},{x:14,y:42,d:0.2},{x:10,y:44,d:0.4},{x:7,y:46,d:0.6}].map(({x,y,d},i)=>(
        <circle key={i} cx={x} cy={y} r={2.5-i*0.4} fill="#2EE6D6" opacity={0.7-i*0.15}
          style={{ animation: `ip-pulse 0.6s ease-in-out infinite ${d}s`, filter: 'drop-shadow(0 0 3px #2EE6D6)' }} />
      ))}

      {/* Stars / space dots */}
      <circle cx="10" cy="10" r="1" fill="#45C7B8" opacity="0.5" style={{ animation: 'ip-pulse2 2s ease-in-out infinite' }} />
      <circle cx="18" cy="6" r="0.8" fill="#2EE6D6" opacity="0.4" style={{ animation: 'ip-pulse2 2s ease-in-out infinite 0.5s' }} />
      <circle cx="6" cy="20" r="0.8" fill="#7DE2D1" opacity="0.4" style={{ animation: 'ip-pulse2 2s ease-in-out infinite 1s' }} />
    </svg>
  </>
)

/* ---------- TRADEAPI ICON (unique - data streams + candles + API brackets) ---------- */
export const TradeAPIIcon = () => (
  <>
    <style>{css}</style>
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      {/* API brackets */}
      <path d="M8 12 L4 12 L4 40 L8 40" stroke="#45C7B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"
        style={{ animation: 'ip-glow 3s ease-in-out infinite' }} />
      <path d="M44 12 L48 12 L48 40 L44 40" stroke="#45C7B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"
        style={{ animation: 'ip-glow 3s ease-in-out infinite 0.5s' }} />
      {/* Candlestick chart */}
      <line x1="14" y1="18" x2="14" y2="36" stroke="#7DE2D1" strokeWidth="1" opacity="0.5" />
      <rect x="11" y="22" width="6" height="10" rx="1" fill="#45C7B8" opacity="0.8"
        style={{ animation: 'ip-pulse2 2s ease-in-out infinite' }} />
      <line x1="22" y1="14" x2="22" y2="38" stroke="#7DE2D1" strokeWidth="1" opacity="0.5" />
      <rect x="19" y="18" width="6" height="14" rx="1" fill="#2EE6D6" opacity="0.9"
        style={{ animation: 'ip-pulse2 2s ease-in-out infinite 0.4s' }} />
      <line x1="30" y1="20" x2="30" y2="36" stroke="#7DE2D1" strokeWidth="1" opacity="0.5" />
      <rect x="27" y="22" width="6" height="8" rx="1" fill="#45C7B8" opacity="0.8"
        style={{ animation: 'ip-pulse2 2s ease-in-out infinite 0.8s' }} />
      <line x1="38" y1="12" x2="38" y2="34" stroke="#7DE2D1" strokeWidth="1" opacity="0.5" />
      <rect x="35" y="14" width="6" height="16" rx="1" fill="#2EE6D6" opacity="0.9"
        style={{ animation: 'ip-pulse2 2s ease-in-out infinite 1.2s' }} />
      {/* Trend line */}
      <polyline points="14,32 22,24 30,28 38,16" stroke="#2EE6D6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        fill="none" strokeDasharray="50" strokeDashoffset="50"
        style={{ animation: 'ip-draw 2s ease forwards, ip-glow 2s ease-in-out 2s infinite' }} />
      {/* Data flowing particle */}
      <circle cx="26" cy="6" r="2" fill="#2EE6D6" opacity="0.8"
        style={{ animation: 'ip-pulse 1.5s ease-in-out infinite', filter: 'drop-shadow(0 0 4px #2EE6D6)' }} />
      <circle cx="26" cy="46" r="2" fill="#2EE6D6" opacity="0.8"
        style={{ animation: 'ip-pulse 1.5s ease-in-out infinite 0.75s', filter: 'drop-shadow(0 0 4px #2EE6D6)' }} />
    </svg>
  </>
)

/* ---------- IMMORTALIZE / SPAWNER ICON ---------- */
export const ImmortalizeIcon = () => (
  <>
    <style>{css}</style>
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      {/* Outer rotating dashed ring */}
      <circle cx="26" cy="26" r="24" stroke="#45C7B8" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.4"
        style={{ animation: 'ip-rotate 20s linear infinite', transformOrigin: '26px 26px' }} />
      {/* Expanding pulse ring */}
      <circle cx="26" cy="26" r="20" stroke="#2EE6D6" strokeWidth="1" opacity="0.3"
        style={{ animation: 'ip-expand 3s ease-out infinite', transformOrigin: '26px 26px' }} />
      {/* Head with glow */}
      <circle cx="26" cy="17" r="7" stroke="#45C7B8" strokeWidth="2.5"
        style={{ animation: 'ip-glow 2.5s ease-in-out infinite' }} />
      {/* Inner head fill pulsing */}
      <circle cx="26" cy="17" r="4" fill="#45C7B8" opacity="0.25"
        style={{ animation: 'ip-pulse 2s ease-in-out infinite' }} />
      {/* Eyes */}
      <circle cx="23.5" cy="16" r="1.2" fill="#2EE6D6"
        style={{ animation: 'ip-flicker 4s ease-in-out infinite' }} />
      <circle cx="28.5" cy="16" r="1.2" fill="#2EE6D6"
        style={{ animation: 'ip-flicker 4s ease-in-out infinite 0.3s' }} />
      {/* Body path */}
      <path d="M13 42C13 34.8 18.9 29 26 29C33.1 29 39 34.8 39 42" stroke="#45C7B8" strokeWidth="2.5" strokeLinecap="round"
        style={{ animation: 'ip-glow 2.5s ease-in-out infinite 0.5s' }} />
      {/* Orbiting particles */}
      <circle r="2.5" fill="#2EE6D6"
        style={{ animation: 'ip-orbit 4s linear infinite', transformOrigin: '26px 26px', filter: 'drop-shadow(0 0 5px #2EE6D6)' }} />
      <circle r="1.5" fill="#7DE2D1" opacity="0.7"
        style={{ animation: 'ip-orbit2 5.5s linear infinite', transformOrigin: '26px 26px', filter: 'drop-shadow(0 0 3px #7DE2D1)' }} />
    </svg>
  </>
)

/* ---------- COMPUTE / GPU ICON ---------- */
export const GPUSessionsIcon = () => (
  <>
    <style>{css}</style>
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      {/* Chip body */}
      <rect x="13" y="13" width="26" height="26" rx="3" stroke="#45C7B8" strokeWidth="2.5"
        style={{ animation: 'ip-glow 3s ease-in-out infinite' }} />
      {/* 4 processing cores with staggered pulse */}
      <rect x="17" y="17" width="8" height="8" rx="1.5" fill="#45C7B8" opacity="0.8"
        style={{ animation: 'ip-pulse 1.2s ease-in-out infinite' }} />
      <rect x="27" y="17" width="8" height="8" rx="1.5" fill="#2EE6D6" opacity="0.9"
        style={{ animation: 'ip-pulse 1.2s ease-in-out infinite 0.3s' }} />
      <rect x="17" y="27" width="8" height="8" rx="1.5" fill="#2EE6D6" opacity="0.9"
        style={{ animation: 'ip-pulse 1.2s ease-in-out infinite 0.6s' }} />
      <rect x="27" y="27" width="8" height="8" rx="1.5" fill="#45C7B8" opacity="0.8"
        style={{ animation: 'ip-pulse 1.2s ease-in-out infinite 0.9s' }} />
      {/* Pins left */}
      {[17, 22, 27, 32].map((y, i) => (
        <line key={`l${y}`} x1="6" y1={y} x2="13" y2={y} stroke="#7DE2D1" strokeWidth="2" strokeLinecap="round"
          style={{ animation: `ip-pulse2 1.5s ease-in-out infinite ${i * 0.15}s` }} />
      ))}
      {/* Pins right */}
      {[17, 22, 27, 32].map((y, i) => (
        <line key={`r${y}`} x1="39" y1={y} x2="46" y2={y} stroke="#7DE2D1" strokeWidth="2" strokeLinecap="round"
          style={{ animation: `ip-pulse2 1.5s ease-in-out infinite ${i * 0.15 + 0.75}s` }} />
      ))}
      {/* Pins top */}
      {[19, 26, 33].map((x, i) => (
        <line key={`t${x}`} x1={x} y1="6" x2={x} y2="13" stroke="#7DE2D1" strokeWidth="2" strokeLinecap="round"
          style={{ animation: `ip-pulse2 1.5s ease-in-out infinite ${i * 0.2}s` }} />
      ))}
      {/* Pins bottom */}
      {[19, 26, 33].map((x, i) => (
        <line key={`b${x}`} x1={x} y1="39" x2={x} y2="46" stroke="#7DE2D1" strokeWidth="2" strokeLinecap="round"
          style={{ animation: `ip-pulse2 1.5s ease-in-out infinite ${i * 0.2 + 0.75}s` }} />
      ))}
      {/* Moving data node */}
      <circle cx="4" cy="26" r="2" fill="#2EE6D6"
        style={{ animation: 'ip-data 2s ease-in-out infinite', filter: 'drop-shadow(0 0 4px #2EE6D6)' }} />
    </svg>
  </>
)

/* ---------- DASHBOARD ICON (unique - analytics grid + live graph line) ---------- */
export const DashboardIcon = () => (
  <>
    <style>{css}</style>
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      {/* Outer panel border */}
      <rect x="4" y="4" width="44" height="44" rx="4" stroke="#45C7B8" strokeWidth="1" opacity="0.3"
        style={{ animation: 'ip-pulse2 4s ease-in-out infinite' }} />
      {/* Header bar */}
      <rect x="4" y="4" width="44" height="9" rx="4" fill="#45C7B8" opacity="0.15" />
      <circle cx="10" cy="8.5" r="1.5" fill="#2EE6D6" style={{ animation: 'ip-pulse 2s ease-in-out infinite' }} />
      <circle cx="16" cy="8.5" r="1.5" fill="#7DE2D1" style={{ animation: 'ip-pulse 2s ease-in-out infinite 0.3s' }} />
      {/* Live graph area */}
      <rect x="8" y="16" width="22" height="14" rx="2" stroke="#45C7B8" strokeWidth="1.5" opacity="0.5" />
      <polyline points="10,26 14,22 18,24 22,19 26,21 28,18" stroke="#2EE6D6" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" fill="none"
        strokeDasharray="60" strokeDashoffset="60"
        style={{ animation: 'ip-draw 2s ease forwards, ip-glow 2s ease-in-out 2s infinite' }} />
      {/* Stat bars right */}
      <rect x="33" y="16" width="14" height="4" rx="1" fill="#45C7B8" opacity="0.7"
        style={{ animation: 'ip-pulse2 1.5s ease-in-out infinite' }} />
      <rect x="33" y="22" width="9" height="4" rx="1" fill="#7DE2D1" opacity="0.5"
        style={{ animation: 'ip-pulse2 1.5s ease-in-out infinite 0.3s' }} />
      <rect x="33" y="28" width="12" height="4" rx="1" fill="#2EE6D6" opacity="0.6"
        style={{ animation: 'ip-pulse2 1.5s ease-in-out infinite 0.6s' }} />
      {/* Bottom mini cards */}
      <rect x="8" y="33" width="12" height="11" rx="2" stroke="#45C7B8" strokeWidth="1.5" opacity="0.6"
        style={{ animation: 'ip-float 3s ease-in-out infinite' }} />
      <rect x="22" y="33" width="12" height="11" rx="2" stroke="#45C7B8" strokeWidth="1.5" opacity="0.6"
        style={{ animation: 'ip-float 3s ease-in-out infinite 0.5s' }} />
      <rect x="36" y="33" width="11" height="11" rx="2" stroke="#45C7B8" strokeWidth="1.5" opacity="0.6"
        style={{ animation: 'ip-float 3s ease-in-out infinite 1s' }} />
      {/* Card dots */}
      <circle cx="14" cy="38.5" r="2" fill="#2EE6D6" style={{ animation: 'ip-pulse 2s ease-in-out infinite' }} />
      <circle cx="28" cy="38.5" r="2" fill="#45C7B8" style={{ animation: 'ip-pulse 2s ease-in-out infinite 0.4s' }} />
      <circle cx="41.5" cy="38.5" r="2" fill="#7DE2D1" style={{ animation: 'ip-pulse 2s ease-in-out infinite 0.8s' }} />
    </svg>
  </>
)

/* ---------- LOCKER / M-SIG ICON ---------- */
export const LockerIcon = () => (
  <>
    <style>{css}</style>
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      {/* Shield outer */}
      <path d="M26 4 L44 12 L44 30 C44 40 36 47 26 50 C16 47 8 40 8 30 L8 12 Z" stroke="#45C7B8" strokeWidth="2"
        style={{ animation: 'ip-glow 3s ease-in-out infinite' }} fill="#45C7B8" fillOpacity="0.06" />
      {/* Shield inner line */}
      <path d="M26 9 L39 15.5 L39 29.5 C39 37 33 43 26 45.5 C19 43 13 37 13 29.5 L13 15.5 Z"
        stroke="#7DE2D1" strokeWidth="1" opacity="0.4" strokeDasharray="3 3"
        style={{ animation: 'ip-rotate-r 25s linear infinite', transformOrigin: '26px 27px' }} />
      {/* Lock body */}
      <rect x="19" y="25" width="14" height="12" rx="2" fill="#45C7B8" opacity="0.8"
        style={{ animation: 'ip-pulse2 2s ease-in-out infinite' }} />
      {/* Lock shackle */}
      <path d="M21 25 L21 20 C21 17.2 23.2 15 26 15 C28.8 15 31 17.2 31 20 L31 25"
        stroke="#2EE6D6" strokeWidth="2.5" strokeLinecap="round"
        style={{ animation: 'ip-glow 2s ease-in-out infinite' }} />
      {/* Keyhole */}
      <circle cx="26" cy="31" r="2.5" fill="#E9F7F4" opacity="0.9" />
      <rect x="25" y="32.5" width="2" height="3" rx="0.5" fill="#E9F7F4" opacity="0.9" />
      {/* Orbiting security dots */}
      <circle r="2" fill="#2EE6D6" opacity="0.8"
        style={{ animation: 'ip-orbit 5s linear infinite', transformOrigin: '26px 27px', filter: 'drop-shadow(0 0 4px #2EE6D6)' }} />
      <circle r="1.5" fill="#7DE2D1" opacity="0.6"
        style={{ animation: 'ip-orbit2 7s linear infinite', transformOrigin: '26px 27px' }} />
    </svg>
  </>
)

/* ---------- SOUL ICON ---------- */
export const SoulIcon = () => (
  <>
    <style>{css}</style>
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      {/* Halo ring */}
      <ellipse cx="26" cy="11" rx="10" ry="3" stroke="#2EE6D6" strokeWidth="1.5" opacity="0.6"
        style={{ animation: 'ip-pulse2 2.5s ease-in-out infinite', filter: 'drop-shadow(0 0 6px #2EE6D6)' }} />
      {/* Ghost body */}
      <path d="M26 10 C18 10 12 16 12 24 V40 L16 36 L20 40 L24 36 L28 40 L32 36 L36 40 L40 36 V24 C40 16 34 10 26 10 Z"
        stroke="#45C7B8" strokeWidth="2.5" strokeLinejoin="round" fill="#45C7B8" fillOpacity="0.1"
        style={{ animation: 'ip-float 3.5s ease-in-out infinite', filter: 'drop-shadow(0 4px 10px rgba(69,199,184,0.3))' }} />
      {/* Eyes with flicker */}
      <circle cx="21" cy="24" r="2.5" fill="#2EE6D6"
        style={{ animation: 'ip-flicker 5s ease-in-out infinite' }} />
      <circle cx="31" cy="24" r="2.5" fill="#2EE6D6"
        style={{ animation: 'ip-flicker 5s ease-in-out infinite 0.3s' }} />
      {/* Eye highlights */}
      <circle cx="22" cy="23" r="0.8" fill="white" opacity="0.8" />
      <circle cx="32" cy="23" r="0.8" fill="white" opacity="0.8" />
      {/* Smile */}
      <path d="M21 30 Q26 34 31 30" stroke="#7DE2D1" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Sparkles */}
      {[{ x: 42, y: 14, d: 0 }, { x: 8, y: 18, d: 0.6 }, { x: 44, y: 32, d: 1.2 }].map(({ x, y, d }, i) => (
        <g key={i} style={{ animation: `ip-pulse 2s ease-in-out infinite ${d}s` }}>
          <line x1={x} y1={y - 4} x2={x} y2={y + 4} stroke="#2EE6D6" strokeWidth="1.5" strokeLinecap="round" />
          <line x1={x - 4} y1={y} x2={x + 4} y2={y} stroke="#2EE6D6" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  </>
)

/* ---------- FUNLAN ICON ---------- */
export const FunlanIcon = () => (
  <>
    <style>{css}</style>
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      {/* Center hub */}
      <circle cx="26" cy="26" r="5" fill="#45C7B8" opacity="0.9"
        style={{ animation: 'ip-glow 2s ease-in-out infinite', filter: 'drop-shadow(0 0 8px #2EE6D6)' }} />
      {/* Inner pulse ring */}
      <circle cx="26" cy="26" r="8" stroke="#2EE6D6" strokeWidth="1" opacity="0.4"
        style={{ animation: 'ip-expand 2s ease-out infinite', transformOrigin: '26px 26px' }} />
      {/* Spokes + node clusters */}
      {[
        { angle: 0,   nx: 26, ny: 7  },
        { angle: 60,  nx: 41, ny: 15 },
        { angle: 120, nx: 41, ny: 37 },
        { angle: 180, nx: 26, ny: 45 },
        { angle: 240, nx: 11, ny: 37 },
        { angle: 300, nx: 11, ny: 15 },
      ].map(({ nx, ny, angle }, i) => (
        <g key={i}>
          <line x1="26" y1="26" x2={nx} y2={ny} stroke="#7DE2D1" strokeWidth="1.2" opacity="0.4"
            strokeDasharray="3 2"
            style={{ animation: `ip-pulse2 2s ease-in-out infinite ${i * 0.3}s` }} />
          <circle cx={nx} cy={ny} r="3.5" fill="#45C7B8" opacity="0.8"
            style={{ animation: `ip-pulse 2.5s ease-in-out infinite ${i * 0.4}s`, filter: 'drop-shadow(0 0 4px #45C7B8)' }} />
        </g>
      ))}
      {/* Outer ring */}
      <circle cx="26" cy="26" r="23" stroke="#45C7B8" strokeWidth="0.7" strokeDasharray="4 6" opacity="0.25"
        style={{ animation: 'ip-rotate 30s linear infinite', transformOrigin: '26px 26px' }} />
      {/* Orbiting packet */}
      <circle r="2" fill="#2EE6D6"
        style={{ animation: 'ip-orbit 4s linear infinite', transformOrigin: '26px 26px', filter: 'drop-shadow(0 0 5px #2EE6D6)' }} />
    </svg>
  </>
)

/* ---------- STAKING ICON ---------- */
export const StakingIcon = () => (
  <>
    <style>{css}</style>
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <rect x="12" y="30" width="28" height="13" rx="2" stroke="#45C7B8" strokeWidth="2" fill="#45C7B8" fillOpacity="0.1"
        style={{ animation: 'ip-float 3s ease-in-out infinite', filter: 'drop-shadow(0 2px 6px rgba(69,199,184,0.3))' }} />
      <rect x="17" y="19" width="18" height="13" rx="2" stroke="#45C7B8" strokeWidth="2" fill="#45C7B8" fillOpacity="0.15"
        style={{ animation: 'ip-float 3s ease-in-out infinite 0.3s', filter: 'drop-shadow(0 2px 6px rgba(69,199,184,0.3))' }} />
      <rect x="21" y="8" width="10" height="13" rx="2" stroke="#2EE6D6" strokeWidth="2" fill="#2EE6D6" fillOpacity="0.2"
        style={{ animation: 'ip-float 3s ease-in-out infinite 0.6s', filter: 'drop-shadow(0 2px 6px rgba(46,230,214,0.4))' }} />
      <circle cx="26" cy="36.5" r="2" fill="#2EE6D6" style={{ animation: 'ip-pulse 1.5s ease-in-out infinite' }} />
      <circle cx="26" cy="25.5" r="2" fill="#2EE6D6" style={{ animation: 'ip-pulse 1.5s ease-in-out infinite 0.3s' }} />
      <circle cx="26" cy="14.5" r="2" fill="#2EE6D6" style={{ animation: 'ip-pulse 1.5s ease-in-out infinite 0.6s' }} />
    </svg>
  </>
)

/* ---------- PERPS ICON ---------- */
export const PerpsIcon = () => (
  <>
    <style>{css}</style>
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <path d="M6 42 L14 28 L22 34 L30 18 L38 24 L46 10" stroke="#45C7B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        fill="none" strokeDasharray="100" strokeDashoffset="100"
        style={{ animation: 'ip-draw 2.5s ease forwards, ip-glow 2.5s ease-in-out 2.5s infinite' }} />
      {[{x:6,y:42},{x:14,y:28},{x:22,y:34},{x:30,y:18},{x:38,y:24},{x:46,y:10}].map(({x,y},i)=>(
        <circle key={i} cx={x} cy={y} r="3" fill="#2EE6D6"
          style={{ animation: `ip-pulse 2s ease-in-out infinite ${i*0.2}s`, filter: 'drop-shadow(0 0 5px #2EE6D6)' }} />
      ))}
      <path d="M36 6 L46 6 L46 16" stroke="#2EE6D6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"
        style={{ animation: 'ip-pulse2 1.5s ease-in-out infinite' }} />
      <line x1="6" y1="14" x2="46" y2="14" stroke="#45C7B8" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.25" />
      <line x1="6" y1="28" x2="46" y2="28" stroke="#45C7B8" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.25" />
    </svg>
  </>
)
