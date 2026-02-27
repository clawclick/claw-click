// Claw.click Contract Addresses — Base Mainnet (Chain ID: 8453)

export const BASE_CHAIN_ID = 8453

export const BASE_CONTRACTS = {
  CONFIG: '0x9C7dF9a7c5b24c90FBaf723c36a98C3674a8E5a2' as `0x${string}`,
  HOOK: '0xa48f3fE21c5896cEbB3Ae8f7ccE65Eb45fEb6AC8' as `0x${string}`,
  FACTORY: '0x1e291bC803E1b4509ffB9dC5DaDfB0767b6f40e7' as `0x${string}`,
  BOOTSTRAP_ETH: '0xcF39aC8D34074789CE25053aE165511296194716' as `0x${string}`,
  BIRTH_CERTIFICATE: '0xB172A0f896DEE5c5BC79dD01A87ef1D288d03995' as `0x${string}`,
  MEMORY_STORAGE: '0xD93F688BCc17c91FbdfC3EF49D10638e814A1e81' as `0x${string}`,
  LAUNCH_BUNDLER: '0xfFeFE440130799247cFC6E919fB79947cd4EfE2D' as `0x${string}`,

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
