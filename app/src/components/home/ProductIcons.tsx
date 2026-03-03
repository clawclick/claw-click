// Custom SVG icons for products

export const ImmortalizeIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="16" r="8" stroke="currentColor" strokeWidth="2" />
    <path d="M12 38C12 31.3726 17.3726 26 24 26C30.6274 26 36 31.3726 36 38" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.3"/>
  </svg>
)

export const LaunchIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 34L34 14M34 14H20M34 14V28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 20L20 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M28 34L34 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" opacity="0.2"/>
  </svg>
)

export const SoulIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Ghost body */}
    <path d="M24 8C16 8 10 14 10 22V36L14 32L18 36L22 32L26 36L30 32L34 36L38 32V22C38 14 32 8 24 8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    {/* Eyes */}
    <circle cx="18" cy="20" r="2" fill="currentColor"/>
    <circle cx="30" cy="20" r="2" fill="currentColor"/>
    {/* Smile */}
    <path d="M20 26C20 26 22 28 24 28C26 28 28 26 28 26" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

export const StakingIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="12" y="28" width="24" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <rect x="16" y="18" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <rect x="20" y="8" width="8" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <circle cx="24" cy="24" r="1.5" fill="currentColor"/>
  </svg>
)

export const LockerIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="14" y="22" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M18 22V16C18 12.6863 20.6863 10 24 10C27.3137 10 30 12.6863 30 16V22" stroke="currentColor" strokeWidth="2"/>
    <circle cx="24" cy="31" r="3" stroke="currentColor" strokeWidth="2"/>
    <path d="M24 34V36" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

export const PerpsIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 32L16 24L24 28L32 16L40 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M32 16V20H36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="16" cy="24" r="2" fill="currentColor"/>
    <circle cx="24" cy="28" r="2" fill="currentColor"/>
    <circle cx="32" cy="16" r="2" fill="currentColor"/>
  </svg>
)

export const FunlanIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Grid/QR pattern */}
    <rect x="8" y="8" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="2"/>
    <rect x="28" y="8" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="2"/>
    <rect x="8" y="28" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="2"/>
    {/* Center scanning element */}
    <path d="M24 18L30 24L24 30L18 24L24 18Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
    <circle cx="32" cy="12" r="2" fill="currentColor"/>
    <circle cx="12" cy="32" r="2" fill="currentColor"/>
  </svg>
)

export const GPUSessionsIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* GPU chip */}
    <rect x="10" y="14" width="28" height="20" rx="2" stroke="currentColor" strokeWidth="2"/>
    <rect x="16" y="20" width="16" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    {/* Connection pins */}
    <path d="M10 18H6M10 24H6M10 30H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M38 18H42M38 24H42M38 30H42" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    {/* Activity indicator */}
    <circle cx="24" cy="24" r="2" fill="currentColor"/>
    <circle cx="20" cy="24" r="1" fill="currentColor" opacity="0.5"/>
    <circle cx="28" cy="24" r="1" fill="currentColor" opacity="0.5"/>
  </svg>
)

export const DashboardIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Dashboard layout */}
    <rect x="8" y="8" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
    <rect x="26" y="8" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
    <rect x="8" y="26" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
    <rect x="26" y="26" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
    {/* Stats/activity dots */}
    <circle cx="15" cy="15" r="1.5" fill="currentColor"/>
    <circle cx="33" cy="15" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="33" r="1.5" fill="currentColor"/>
    <circle cx="33" cy="33" r="1.5" fill="currentColor"/>
  </svg>
)
