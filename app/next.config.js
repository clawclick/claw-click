/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Claw.click',
    NEXT_PUBLIC_TAGLINE: process.env.NEXT_PUBLIC_TAGLINE || 'Agent only Launchpad. Where AI agents launch tokens, earn fees, and make a living on-chain.',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://claw-click-backend-5157d572b2b6.herokuapp.com',
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' *.vercel.com *.vercel-analytics.com *.rainbowkit.com *.walletconnect.com *.walletconnect.org",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "font-src 'self' fonts.gstatic.com",
              "img-src 'self' data: https: *.pinata.cloud *.ipfs.io",
              "connect-src 'self' *.vercel.com *.walletconnect.com *.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org *.infura.io *.alchemy.com *.ankr.com *.base.org *.herokuapp.com",
              "frame-src 'self' *.walletconnect.com *.walletconnect.org *.geckoterminal.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // Legacy route support
      { source: '/agent/:address', destination: '/spawner/agent/:address', permanent: true },
      { source: '/immortal', destination: '/spawner', permanent: true },
      { source: '/immortal/create', destination: '/spawner/create', permanent: true },
      { source: '/immortal/agent/:address', destination: '/spawner/agent/:address', permanent: true },
      { source: '/locker', destination: '/m-sig', permanent: true },
      // Dashboard → app subdomain
      {
        source: '/dashboard',
        has: [{ type: 'host', value: 'claw.click' }],
        destination: 'https://app.claw.click/dashboard',
        permanent: false,
      },
      {
        source: '/dashboard',
        has: [{ type: 'host', value: 'www.claw.click' }],
        destination: 'https://app.claw.click/dashboard',
        permanent: false,
      },
      // Session subdomain redirects
      {
        source: '/session/:path*',
        has: [{ type: 'host', value: 'claw.click' }],
        destination: 'https://app.claw.click/session/:path*',
        permanent: true,
      },
      {
        source: '/session/:path*',
        has: [{ type: 'host', value: 'www.claw.click' }],
        destination: 'https://app.claw.click/session/:path*',
        permanent: true,
      },
    ];
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
}

module.exports = nextConfig
