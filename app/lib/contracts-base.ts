// Claw.click Contract Addresses — Base Mainnet (Chain ID: 8453)

export const BASE_CHAIN_ID = 8453

export const BASE_CONTRACTS = {
  CONFIG: '0x073a5bC04a91237AdDeD68aE5adBC90487993c6C' as `0x${string}`,
  HOOK: '0xD6e6da79c03F93BF90A94D046b6bFf7a02652aC8' as `0x${string}`,
  FACTORY: '0x34849C5Ee544957e8cF4E281b82B346bBa848ca5' as `0x${string}`,
  BOOTSTRAP_ETH: '0xC08ed9eE6fC629c19643ffAA5bb3CA23a32d5B9E' as `0x${string}`,

  // Uniswap V4 (Base Mainnet)
  POOL_MANAGER: '0x498581fF718922c3f8e6A244956aF099B2652b2b' as `0x${string}`,
  POSITION_MANAGER: '0x7C5f5A4bBd8fD63184577525326123B519429bDc' as `0x${string}`,
  UNIVERSAL_ROUTER: '0x6fF5693b99212Da76ad316178A184AB56D299b43' as `0x${string}`,
  PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3' as `0x${string}`,
} as const

// V4 pool params for hook pools
export const HOOK_POOL_PARAMS = {
  FEE: 0x800000, // dynamic fee flag
  TICK_SPACING: 60,
} as const
