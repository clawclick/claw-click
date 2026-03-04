export function FireIcon() {
  return (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <defs>
        <linearGradient id="fireGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1"/>
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.6"/>
        </linearGradient>
      </defs>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L8 8c-1 1.5-1 3.5 0 5 1 1.5 2.5 2 4 2s3-.5 4-2c1-1.5 1-3.5 0-5l-4-6z" fill="url(#fireGrad)" opacity="0.3"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c-1.5 3-1 5 0 7 1 2 2 3 2 5 0 2-1 3-2 3s-2-1-2-3c0-1.5.5-2.5 1-3.5"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12c-.5 1-.5 2 0 3 .5 1 1.5 2 3 2s2.5-1 3-2c.5-1 .5-2 0-3"/>
      <circle cx="12" cy="16" r="1" fill="currentColor"/>
    </svg>
  )
}

export function RocketIcon() {
  return (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <defs>
        <linearGradient id="rocketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.1"/>
        </linearGradient>
      </defs>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c-3 0-5.5 2.5-6 5.5L4 12l2 2 1.5-1.5" fill="url(#rocketGrad)"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c3 0 5.5 2.5 6 5.5L20 12l-2 2-1.5-1.5" fill="url(#rocketGrad)"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v8"/>
      <circle cx="12" cy="8" r="1.5" fill="currentColor"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 14l-3 3v4l3-1M16 14l3 3v4l-3-1"/>
      <rect x="10" y="10" width="4" height="6" rx="1" strokeLinecap="round" strokeLinejoin="round" fill="url(#rocketGrad)"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 18c0 1 .5 2 2 2s2-1 2-2"/>
    </svg>
  )
}

export function GPUIcon() {
  return (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <defs>
        <linearGradient id="gpuGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.1"/>
        </linearGradient>
      </defs>
      <rect x="3" y="4" width="18" height="13" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" fill="url(#gpuGrad)"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h3M7 12h3M14 8h3M14 12h3"/>
      <circle cx="8.5" cy="10" r="0.5" fill="currentColor"/>
      <circle cx="15.5" cy="10" r="0.5" fill="currentColor"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 20h8"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 17v3M14 17v3"/>
      <rect x="7" y="7" width="4" height="5" rx="0.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
      <rect x="13" y="7" width="4" height="5" rx="0.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </svg>
  )
}

export function AgentIcon() {
  return (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <defs>
        <linearGradient id="agentGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.1"/>
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="14" height="14" rx="3" strokeLinecap="round" strokeLinejoin="round" fill="url(#agentGrad)"/>
      <circle cx="9.5" cy="10.5" r="1.5" fill="currentColor"/>
      <circle cx="14.5" cy="10.5" r="1.5" fill="currentColor"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.5c.5.5 1.3.8 3 .8s2.5-.3 3-.8"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5V3M12 21v-2M5 12H3M21 12h-2" opacity="0.5"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7L5.5 5.5M17 7l1.5-1.5M7 17l-1.5 1.5M17 17l1.5 1.5" opacity="0.3"/>
    </svg>
  )
}

export function EmptyStateIcon() {
  return (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <defs>
        <linearGradient id="emptyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.1"/>
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.05"/>
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" fill="url(#emptyGrad)"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8M8 12h8" opacity="0.5"/>
      <circle cx="12" cy="12" r="8" strokeDasharray="2 3" opacity="0.2"/>
    </svg>
  )
}
