// Claw.click Contract Addresses — Base Mainnet (Chain ID: 8453)

export const BASE_CHAIN_ID = 8453

export const BASE_CONTRACTS = {
  CONFIG: '0x18b89e491d8f12d2be6D2A8e945dF4D93F1247a7' as `0x${string}`,
  HOOK: '0x8265be7eb9D7e40c1FAb6CBd8DBc626b31A0aac8' as `0x${string}`,
  FACTORY: '0xF5979D0fEEd05CEcb94cf62B76FE7E9aB40c6b4a' as `0x${string}`,
  BOOTSTRAP_ETH: '0xE2649737D3005c511a27DF6388871a12bE0a2d30' as `0x${string}`,
  BIRTH_CERTIFICATE: '0x15520eD8CF71383FAF18D68120bC1C8d9eE68B5A' as `0x${string}`,
  MEMORY_STORAGE: '0x9F4945213A3EA9a3A1714579CdBE72c3893cd161' as `0x${string}`,
  LAUNCH_BUNDLER: '0x4bB9811E9bf3384F5Df8B1dcAA4c05C298Fc44dD' as `0x${string}`,

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
