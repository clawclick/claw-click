import { type Address } from 'viem'

// Claw.click Contract Addresses — Sepolia (Chain ID: 11155111)
export const SEPOLIA_CHAIN_ID = 11155111

export const SEPOLIA_CONTRACTS = {
  FACTORY: '0xAB936490488A16e134c531c30B6866D009a8dF2e' as Address,
  HOOK: '0x3C26aE16F7C62856F372cF152e2f252ab61Deac8' as Address,
  CONFIG: '0xb777a04B92bF079b9b3804f780905526cB1458c1' as Address,
  BOOTSTRAP_ETH: '0x03348240b0fA6474A9eaBc7E254633Be25fadbf0' as Address,
  SWAP_EXECUTOR: '0xCE03f9aeD760f3F5C471C1A76Ff4a8F84743b795' as Address,

  // Uniswap V4 (Sepolia)
  POOL_MANAGER: '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543' as Address,
  POSITION_MANAGER: '0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4' as Address,
} as const

// V4 pool params for hook pools
export const HOOK_POOL_PARAMS = {
  FEE: 0x800000, // dynamic fee flag
  TICK_SPACING: 60,
} as const

export const SEPOLIA_RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J'
export const EXPLORER_URL = 'https://eth-sepolia.blockscout.com'
export const ETHERSCAN_URL = 'https://sepolia.etherscan.io'
