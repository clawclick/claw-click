// Claw.click Contract Addresses and Configuration
// Network: Sepolia Testnet (Chain ID: 11155111)
// Deployed: February 21, 2026

export const SEPOLIA_CHAIN_ID = 11155111

export const CONTRACTS = {
  FACTORY: '0x5C92E6f1Add9a2113C6977DfF15699e948e017Db',
  HOOK: '0xa2FF089271e4527025Ee614EB165368875A12AC8',
  CONFIG: '0x6049BCa2F8780fA7A929EBB8a9571C2D94bf5ee1',
  ROUTER: '0x501A262141E1b0C6103A760c70709B7631169d63',
  
  // Uniswap V4 (External)
  POOL_MANAGER: '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543',
  POSITION_MANAGER: '0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4',
} as const

export const SEPOLIA_RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J'

export const EXPLORER_URL = 'https://sepolia.etherscan.io'

export const NETWORK_NAME = 'Sepolia Testnet'

// Helper function to get explorer link
export function getExplorerLink(type: 'tx' | 'address' | 'token', hash: string): string {
  return `${EXPLORER_URL}/${type}/${hash}`
}
