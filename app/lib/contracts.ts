// Claw.click Contract Addresses and Configuration
// Network: Base Mainnet (Chain ID: 8453)
// Status: Live

export const CHAIN_ID = 8453

/** @deprecated Use CHAIN_ID */
export const SEPOLIA_CHAIN_ID = CHAIN_ID

export const CONTRACTS = {
  FACTORY: '0x1e291bC803E1b4509ffB9dC5DaDfB0767b6f40e7',
  HOOK: '0xa48f3fE21c5896cEbB3Ae8f7ccE65Eb45fEb6AC8',
  CONFIG: '0x9C7dF9a7c5b24c90FBaf723c36a98C3674a8E5a2',
  BOOTSTRAP_ETH: '0xcF39aC8D34074789CE25053aE165511296194716',
  BIRTH_CERTIFICATE: '0xB172A0f896DEE5c5BC79dD01A87ef1D288d03995',
  MEMORY_STORAGE: '0xD93F688BCc17c91FbdfC3EF49D10638e814A1e81',
  LAUNCH_BUNDLER: '0xfFeFE440130799247cFC6E919fB79947cd4EfE2D',
  
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
export function getExplorerLink(type: 'tx' | 'address' | 'token', hash: string, chainId?: number): string {
  const base = getExplorerUrl(chainId)
  return `${base}/${type}/${hash}`
}

// Chain ID → display name
export function getChainDisplayName(chainId: number | undefined | null): string {
  switch (chainId) {
    case 8453: return 'BASE'
    case 1: return 'ETH'
    case 11155111: return 'SEPOLIA'
    case 56: return 'BSC'
    case 84532: return 'BASE_SEPOLIA'
    default: return chainId ? `CHAIN_${chainId}` : 'UNKNOWN'
  }
}

// Chain ID → explorer base URL
export function getExplorerUrl(chainId: number | undefined | null): string {
  switch (chainId) {
    case 8453: return 'https://basescan.org'
    case 1: return 'https://etherscan.io'
    case 11155111: return 'https://sepolia.etherscan.io'
    case 56: return 'https://bscscan.com'
    case 84532: return 'https://sepolia.basescan.org'
    default: return EXPLORER_URL
  }
}
