import { type Address } from 'viem'

// Claw.click Contract Addresses — Sepolia (Chain ID: 11155111)
export const SEPOLIA_CHAIN_ID = 11155111

export const SEPOLIA_CONTRACTS = {
  FACTORY: '0x140b8B4495291b354A4fc1f36e9E207d10D58DbD' as Address,
  HOOK: '0x3af71003eE83f27a34F8816527cC4A63f14C6ac8' as Address,
  CONFIG: '0xC8923F485e4A49984C3f559DC4213E20dA416a91' as Address,
  BOOTSTRAP_ETH: '0x8e1d1C966f1f8E74fCf96BD4025A06107114403C' as Address,
  BIRTH_CERTIFICATE: '0xb0a9f434f349fBB62CA83d7Af1f1e25DcA0FA76D' as Address,
  MEMORY_STORAGE: '0x20c2B4b96d1cd78449F009F49cbb897B3619e2A6' as Address,
  LAUNCH_BUNDLER: '0x891824F47dBa21466DeEf6D3Fde2f30994f43955' as Address,

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
