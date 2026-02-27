// Claw.click Contract Addresses — Base Mainnet (Chain ID: 8453)

export const BASE_CHAIN_ID = 8453

export const BASE_CONTRACTS = {
  CONFIG: '0x51790f81a24AbA3dac35381296696ef4695a9cC8' as `0x${string}`,
  HOOK: '0x789A96D44e33c2eEA2294b74cd3b59c9b3932ac8' as `0x${string}`,
  FACTORY: '0xF993b19328E32af9941Ef8d81d5652134A206463' as `0x${string}`,
  BOOTSTRAP_ETH: '0x17Aa352F2D811B4dC65eC7Eba9738e6c0B393A67' as `0x${string}`,

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
