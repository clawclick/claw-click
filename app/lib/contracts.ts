// Claw.click Contract Addresses and Configuration
// Network: Ethereum Sepolia (Chain ID: 11155111)
// Deployed: February 24, 2026
// Status: Verified on Blockscout, Ownership Transferred to SAFE

export const SEPOLIA_CHAIN_ID = 11155111

export const CONTRACTS = {
  FACTORY: '0x79e904C8aFb82e265df20dc1514D110349E2F148',
  HOOK: '0xB6F6DE16D82875e5e5D6e23e6d232C1e0D296Ac8',
  CONFIG: '0x052414838C0d9098500bd0B44f4c7Bee3e0d1105',
  BOOTSTRAP_ETH: '0xE1F67E61281F3e56B32d27e768E739bd3b4b6226',
  
  // Uniswap V4 (Official Ethereum Sepolia Deployment)
  POOL_MANAGER: '0x7Da1D65F8B249183667cdE74C5CBD46dD38AA829',
  POSITION_MANAGER: '0x99E0E7A00BA43FC1d2e918440a79D60b3E9FF817',
} as const

export const SEPOLIA_RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J'

export const EXPLORER_URL = 'https://eth-sepolia.blockscout.com'
export const ETHERSCAN_URL = 'https://sepolia.etherscan.io'

export const NETWORK_NAME = 'Ethereum Sepolia'

// SAFE Multisig (Contract Owner)
export const SAFE_ADDRESS = '0xFf7549B06E68186C91a6737bc0f0CDE1245e349b'

// Deployment block - start querying events from here
export const DEPLOYMENT_BLOCK = 7400000n // Feb 24, 2026 deployment

// Helper function to get explorer link (defaults to Blockscout since contracts are verified there)
export function getExplorerLink(type: 'tx' | 'address' | 'token', hash: string, useEtherscan = false): string {
  const baseUrl = useEtherscan ? ETHERSCAN_URL : EXPLORER_URL
  return `${baseUrl}/${type}/${hash}`
}
