import { type Address } from 'viem'

// ===== Base Mainnet PoolSwapTest (deployed for Claw.click) =====
export const POOL_SWAP_TEST_ADDRESS = '0x0883Ff016151255Ad3161CbF5D4Ed720D9f26243' as Address

// Tick-math price limits
export const MIN_SQRT_PRICE = 4295128739n + 1n
export const MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342n - 1n

// ===== ABIs =====

/**
 * PoolSwapTest ABI — Uniswap V4 swap router on Base.
 * Hook uses tx.origin, so calling PoolSwapTest directly works fine.
 * Buy: zeroForOne=true, send ETH value
 * Sell: zeroForOne=false, approve token to PoolSwapTest first
 */
export const POOL_SWAP_TEST_ABI = [
  {
    type: 'function',
    name: 'swap',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'key',
        type: 'tuple',
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' },
        ],
      },
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'zeroForOne', type: 'bool' },
          { name: 'amountSpecified', type: 'int256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
      {
        name: 'testSettings',
        type: 'tuple',
        components: [
          { name: 'takeClaims', type: 'bool' },
          { name: 'settleUsingBurn', type: 'bool' },
        ],
      },
      { name: 'hookData', type: 'bytes' },
    ],
    outputs: [{ name: '', type: 'int256' }],
  },
] as const

/**
 * Factory ABI — read pool key via launchByToken
 */
export const FACTORY_ABI = [
  {
    type: 'function',
    name: 'launchByToken',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'token', type: 'address' },
          { name: 'beneficiary', type: 'address' },
          { name: 'agentWallet', type: 'address' },
          { name: 'creator', type: 'address' },
          { name: 'poolId', type: 'bytes32' },
          {
            name: 'poolKey',
            type: 'tuple',
            components: [
              { name: 'currency0', type: 'address' },
              { name: 'currency1', type: 'address' },
              { name: 'fee', type: 'uint24' },
              { name: 'tickSpacing', type: 'int24' },
              { name: 'hooks', type: 'address' },
            ],
          },
          { name: 'targetMcapETH', type: 'uint256' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'createdBlock', type: 'uint256' },
          { name: 'name', type: 'string' },
          { name: 'symbol', type: 'string' },
          {
            name: 'feeSplit',
            type: 'tuple',
            components: [
              { name: 'wallets', type: 'address[5]' },
              { name: 'percentages', type: 'uint16[5]' },
              { name: 'count', type: 'uint8' },
            ],
          },
          { name: 'launchType', type: 'uint8' },
        ],
      },
    ],
  }
] as const

/**
 * Hook ABI — read pool state (tax, epoch, graduation, mcap)
 */
export const HOOK_READ_ABI = [
  {
    type: 'function',
    name: 'getCurrentTax',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [{ name: 'taxBps', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getCurrentMcap',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [{ name: 'mcap', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getCurrentEpoch',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [{ name: 'epoch', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isGraduated',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [{ name: 'graduated', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPoolIdForToken',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [{ name: 'poolId', type: 'bytes32' }],
    stateMutability: 'view',
  },
] as const

/**
 * Minimal ERC20 ABI
 */
export const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const
