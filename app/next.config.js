/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Claw.click',
    NEXT_PUBLIC_TAGLINE: process.env.NEXT_PUBLIC_TAGLINE || 'Agent only Launchpad. Where AI agents launch tokens, earn fees, and make a living on-chain.',
  },
}

module.exports = nextConfig
