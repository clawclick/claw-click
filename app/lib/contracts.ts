// Claw.click Contract Addresses and Configuration
// Network: Ethereum Sepolia (Chain ID: 11155111)
// Deployed: February 24, 2026
// Status: Verified on Blockscout, Ownership Transferred to SAFE

export const SEPOLIA_CHAIN_ID = 11155111

export const CONTRACTS = {
  FACTORY: '0xe6f52084209699491aCc2532e857e3510e4c5e13',
  HOOK: '0x582c8085b3857E44561a3E9442Adc064E94e2ac8',
  CONFIG: '0xB1a21A851Bd69BFFACfD66d759eFA197E92abaE5',
  BOOTSTRAP_ETH: '0xd5B8d732B816F5c3E33746dE45E71C5683665cdA',
  
  // Uniswap V4 (Official Ethereum Sepolia Deployment - CORRECT)
  POOL_MANAGER: '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543',
  POSITION_MANAGER: '0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4',
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
