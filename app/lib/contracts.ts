// Claw.click Contract Addresses and Configuration
// Network: Base Mainnet (Chain ID: 8453)
// Status: Live

export const CHAIN_ID = 8453

/** @deprecated Use CHAIN_ID */
export const SEPOLIA_CHAIN_ID = CHAIN_ID

export const CONTRACTS = {
  FACTORY: '0xA029079Fd4b50C5de24Fa95466EB5224Ff7D9379',
  HOOK: '0x2AE65b8d18838D97A410A7Fd0Df0821Fb9D0eac8',
  CONFIG: '0x76550087B31a0C78A4D16c95C7ecfE3D0F65CE41',
  BOOTSTRAP_ETH: '0x92f670Fb8922bc23662F20428919BE0Baa821AC6',
  BIRTH_CERTIFICATE: '0x15520eD8CF71383FAF18D68120bC1C8d9eE68B5A',
  MEMORY_STORAGE: '0x9F4945213A3EA9a3A1714579CdBE72c3893cd161',
  LAUNCH_BUNDLER: '0x4bB9811E9bf3384F5Df8B1dcAA4c05C298Fc44dD',
  
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
