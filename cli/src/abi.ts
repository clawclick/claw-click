// ============================================================================
// Factory ABI (IClawclickFactory) — supports DIRECT + AGENT launch types
// ============================================================================

/** LaunchType enum values matching the contract */
export const LaunchType = { DIRECT: 0, AGENT: 1 } as const

const POOL_KEY_COMPONENTS = [
  { name: 'currency0', type: 'address' },
  { name: 'currency1', type: 'address' },
  { name: 'fee', type: 'uint24' },
  { name: 'tickSpacing', type: 'int24' },
  { name: 'hooks', type: 'address' },
] as const

const FEE_SPLIT_COMPONENTS = [
  { name: 'wallets', type: 'address[5]' },
  { name: 'percentages', type: 'uint16[5]' },
  { name: 'count', type: 'uint8' },
] as const

const LAUNCH_INFO_COMPONENTS = [
  { name: 'token', type: 'address' },
  { name: 'beneficiary', type: 'address' },
  { name: 'agentWallet', type: 'address' },
  { name: 'creator', type: 'address' },
  { name: 'poolId', type: 'bytes32' },
  { name: 'poolKey', type: 'tuple', components: POOL_KEY_COMPONENTS },
  { name: 'targetMcapETH', type: 'uint256' },
  { name: 'createdAt', type: 'uint256' },
  { name: 'createdBlock', type: 'uint256' },
  { name: 'name', type: 'string' },
  { name: 'symbol', type: 'string' },
  { name: 'feeSplit', type: 'tuple', components: FEE_SPLIT_COMPONENTS },
  { name: 'launchType', type: 'uint8' },
] as const

const POOL_STATE_COMPONENTS = [
  { name: 'token', type: 'address' },
  { name: 'beneficiary', type: 'address' },
  { name: 'startingMCAP', type: 'uint256' },
  { name: 'graduationMCAP', type: 'uint256' },
  { name: 'totalSupply', type: 'uint256' },
  { name: 'positionTokenIds', type: 'uint256[5]' },
  { name: 'positionMinted', type: 'bool[5]' },
  { name: 'positionRetired', type: 'bool[5]' },
  { name: 'recycledETH', type: 'uint256' },
  { name: 'activated', type: 'bool' },
  { name: 'graduated', type: 'bool' },
] as const

export const FACTORY_ABI = [
  // ── createLaunch (now includes launchType) ──
  {
    name: 'createLaunch',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'name', type: 'string' },
          { name: 'symbol', type: 'string' },
          { name: 'beneficiary', type: 'address' },
          { name: 'agentWallet', type: 'address' },
          { name: 'targetMcapETH', type: 'uint256' },
          { name: 'feeSplit', type: 'tuple', components: FEE_SPLIT_COMPONENTS },
          { name: 'launchType', type: 'uint8' },
        ],
      },
    ],
    outputs: [
      { name: 'token', type: 'address' },
      { name: 'poolId', type: 'bytes32' },
    ],
  },
  // ── launchByToken ──
  {
    name: 'launchByToken',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [{ name: '', type: 'tuple', components: LAUNCH_INFO_COMPONENTS }],
  },
  // ── launchByPoolId ──
  {
    name: 'launchByPoolId',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'tuple', components: LAUNCH_INFO_COMPONENTS }],
  },
  // ── poolStates (auto-getter — skips arrays: positionTokenIds, positionMinted, positionRetired) ──
  {
    name: 'poolStates',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [
      { name: 'token', type: 'address' },
      { name: 'beneficiary', type: 'address' },
      { name: 'startingMCAP', type: 'uint256' },
      { name: 'graduationMCAP', type: 'uint256' },
      { name: 'totalSupply', type: 'uint256' },
      { name: 'recycledETH', type: 'uint256' },
      { name: 'activated', type: 'bool' },
      { name: 'graduated', type: 'bool' },
    ],
  },
  // ── poolActivated ──
  {
    name: 'poolActivated',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  // ── getTokenCount ──
  {
    name: 'getTokenCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // ── getTokenAtIndex ──
  {
    name: 'getTokenAtIndex',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'index', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  // ── totalLaunches ──
  {
    name: 'totalLaunches',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // ── previewSqrtPrice ──
  {
    name: 'previewSqrtPrice',
    type: 'function',
    stateMutability: 'pure',
    inputs: [{ name: 'targetMcapETH', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint160' }],
  },
  // ── immutables ──
  {
    name: 'hook',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'poolManager',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'config',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'positionManager',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  // ── position management ──
  {
    name: 'mintNextPosition',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'poolId', type: 'bytes32' },
      { name: 'positionIndex', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'retireOldPosition',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'poolId', type: 'bytes32' },
      { name: 'positionIndex', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'collectFeesFromPosition',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'poolId', type: 'bytes32' },
      { name: 'positionIndex', type: 'uint256' },
    ],
    outputs: [],
  },
  // ── admin ──
  {
    name: 'clearDevOverride',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [],
  },
] as const

// ============================================================================
// Hook ABI (IClawclickHook)
// ============================================================================
export const HOOK_ABI = [
  {
    name: 'launches',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'token', type: 'address' },
          { name: 'beneficiary', type: 'address' },
          { name: 'startMcap', type: 'uint256' },
          { name: 'baseTax', type: 'uint256' },
          { name: 'startSqrtPrice', type: 'uint160' },
          { name: 'phase', type: 'uint8' },
          { name: 'liquidityStage', type: 'uint8' },
          { name: 'graduationMcap', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'getCurrentTax',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getCurrentLimits',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [
      { name: 'maxTx', type: 'uint256' },
      { name: 'maxWallet', type: 'uint256' },
    ],
  },
  {
    name: 'getCurrentEpoch',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'isGraduated',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'isGraduatedByToken',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'poolProgress',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [
      { name: 'currentPosition', type: 'uint256' },
      { name: 'currentEpoch', type: 'uint256' },
      { name: 'lastEpochMCAP', type: 'uint256' },
      { name: 'graduated', type: 'bool' },
    ],
  },
  {
    name: 'getPoolIdForToken',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'claimBeneficiaryFeesETH',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'beneficiary', type: 'address' }],
    outputs: [],
  },
  {
    name: 'claimBeneficiaryFeesToken',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'beneficiary', type: 'address' },
      { name: 'token', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'TOTAL_SUPPLY',
    type: 'function',
    stateMutability: 'pure',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

// ============================================================================
// PoolSwapTest ABI — used for all swaps (hook uses tx.origin)
// ============================================================================
export const POOL_SWAP_TEST_ABI = [
  {
    name: 'swap',
    type: 'function',
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
    outputs: [{ name: 'delta', type: 'int256' }],
  },
] as const

/** @deprecated Use POOL_SWAP_TEST_ABI instead — SwapExecutor reverts on Sepolia */
export const SWAP_EXECUTOR_ABI = POOL_SWAP_TEST_ABI

// ============================================================================
// ERC20 ABI (minimal)
// ============================================================================
export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const
