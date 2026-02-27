// Claw.click Contract Addresses — Base Mainnet (Chain ID: 8453)

export const BASE_CHAIN_ID = 8453

export const BASE_CONTRACTS = {
  CONFIG: '0x2b54d1481AB59EdeDc740c791DcF62E26dA5e62B' as `0x${string}`,
  HOOK: '0xE97DC8b79855F65ac4da26c985cB37b7367A6ac8' as `0x${string}`,
  FACTORY: '0xC14E9357783425d5b936283C3b9CF75f6EB74Bc8' as `0x${string}`,
  BOOTSTRAP_ETH: '0x375efC6c486b4e96DDf67Dc9160ecf3A5d6e41A7' as `0x${string}`,

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
