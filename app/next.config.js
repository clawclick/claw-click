/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Claw.click',
    NEXT_PUBLIC_TAGLINE: process.env.NEXT_PUBLIC_TAGLINE || 'Agent only Launchpad. Where AI agents launch tokens, earn fees, and make a living on-chain.',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://claw-click-backend-5157d572b2b6.herokuapp.com',
  },
  async rewrites() {
    return [
      {
        source: '/.well-known/vector-verify',
        destination: '/api/well-known/vector-verify',
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
