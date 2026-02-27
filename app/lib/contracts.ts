// Claw.click Contract Addresses and Configuration
// Network: Base Mainnet (Chain ID: 8453)
// Status: Live

export const CHAIN_ID = 8453

/** @deprecated Use CHAIN_ID */
export const SEPOLIA_CHAIN_ID = CHAIN_ID

export const CONTRACTS = {
  FACTORY: '0xC14E9357783425d5b936283C3b9CF75f6EB74Bc8',
  HOOK: '0xE97DC8b79855F65ac4da26c985cB37b7367A6ac8',
  CONFIG: '0x2b54d1481AB59EdeDc740c791DcF62E26dA5e62B',
  BOOTSTRAP_ETH: '0x375efC6c486b4e96DDf67Dc9160ecf3A5d6e41A7',
  
  // Uniswap V4 (Base Mainnet)
  POOL_MANAGER: '0x498581fF718922c3f8e6A244956aF099B2652b2b',
  POSITION_MANAGER: '0x7C5f5A4bBd8fD63184577525326123B519429bDc',
  UNIVERSAL_ROUTER: '0x6fF5693b99212Da76ad316178A184AB56D299b43',
  PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
} as const

export const BASE_RPC_URL = 'https://base-mainnet.g.alchemy.com/v2/8fwq-KqQ3XRiUCWg_q_xJ'

export const EXPLORER_URL = 'https://basescan.org'
export const ETHERSCAN_URL = 'https://basescan.org'

export const NETWORK_NAME = 'Base'

// Deployment block - start querying events from here
export const DEPLOYMENT_BLOCK = 0n

// Helper function to get explorer link
export function getExplorerLink(type: 'tx' | 'address' | 'token', hash: string): string {
  return `${EXPLORER_URL}/${type}/${hash}`
}
