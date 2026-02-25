import { http, createConfig } from 'wagmi'
import { base, sepolia, mainnet, bsc } from 'wagmi/chains'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'

// RainbowKit + Wagmi config for Claw.Click
export const config = getDefaultConfig({
  appName: 'Claw.Click',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '24e5f912d64b7b5aae82c9201f543341',
  chains: [sepolia, base, mainnet, bsc],
  transports: {
    [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
    [base.id]: http(
      `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_BASE || 'demo'}`
    ),
    [mainnet.id]: http(
      `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_ETH || 'demo'}`
    ),
    [bsc.id]: http('https://bsc-dataseed.binance.org'),
  },
  ssr: true,
})
