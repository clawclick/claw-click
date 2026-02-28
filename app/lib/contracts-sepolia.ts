import { type Address } from 'viem'

// Claw.click Contract Addresses — Sepolia (Chain ID: 11155111)
export const SEPOLIA_CHAIN_ID = 11155111

export const SEPOLIA_CONTRACTS = {
  FACTORY: '0x3f4bFd32362D058157A5F43d7861aCdC0484C415' as Address,
  HOOK: '0xf537a9356f6909df0A633C8BC48e504D2a30B111' as Address,
  CONFIG: '0xf01514F68Df33689046F6Dd4184edCaA54fF4492' as Address,
  BOOTSTRAP_ETH: '0xC52b027928AfAa54f1f0FeC0e4D7b6397026f660' as Address,
  BIRTH_CERTIFICATE: '0xE13532b0bD16E87088383f9F909EaCB03009a2e9' as Address,
  MEMORY_STORAGE: '0xC2D9c0ccc1656535e29B5c2398a609ef936aad75' as Address,
  LAUNCH_BUNDLER: '0x579F512FA05CFd66033B06d8816915bA2Be971CE' as Address,

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
