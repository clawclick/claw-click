// claw.click Contract Addresses and ABIs
// V4: Agent tokenization via claw.click (Uniswap V4)

export const SEPOLIA_ADDRESSES = {
  // Identity contracts (active)
  birthCertificate: "0x4003CbFD62B0b4BAbBdad714e472fCb8D1f03132",
  memoryStorage: "0x833FF145e104198793e62593a1dfD4633066B416",
  // V4 Tokenization contracts (claw.click) — February 28, 2026 — Uniswap V4
  clawclick: {
    factory: "0xcBcbCC12664F3eE4D20b3F49554BBE55fD7d9746",      // Factory (DIRECT + AGENT)
    hook: "0x64f7cC79F599efBc8e95978520c5092Ef8DE2AC8",         // ClawclickHook
    config: "0xD1D3059569548cB51FF26Eb65Eb45dd13AD2Bf50",       // ClawclickConfig
    bootstrapETH: "0xe3893b4c3a210571d04561714eFDAd34F80Bc232", // Bootstrap funding
    swapExecutor: "0xCE03f9aeD760f3F5C471C1A76Ff4a8F84743b795", // PoolSwapTest (unchanged)
    bundler: "0x8112c14406C0f38C56f13A709498ddEd446a5b7b",      // AgentLaunchBundler
  },
  // Uniswap V4 core (Sepolia)
  uniswapV4: {
    poolManager: "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543",
    positionManager: "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4",
  },
  // Treasury for fees (30% platform tax + immortalization fees)
  treasury: "0x3aD22cDBA558eE9767f675d7ACdb25D73545c9D2",
  // V3 contracts (deprecated — kept for backwards compatibility)
  // factory: "0xb522EB9E6E5E116A4BDef832457A4003d17256e5",
  // feeCollector: "0x3aD22cDBA558eE9767f675d7ACdb25D73545c9D2",
  // bondingCurve: "0xb807a5D275eebe2278757b49f6257A65E61F5CD2",
} as const;

export const BASE_ADDRESSES = {
  // Identity contracts (Base Mainnet)
  birthCertificate: "0x6E9B093FdD12eC34ce358bd70CF59EeCb5D1A95B",
  memoryStorage: "0x81ae37d31C488094bf292ebEb15C6eCfcD9Fad7D",
  // V4 Tokenization contracts (claw.click) — Base Mainnet — Uniswap V4 — February 28, 2026
  clawclick: {
    factory: "0xF5979D0fEEd05CEcb94cf62B76FE7E9aB40c6b4a",
    hook: "0x8265be7eb9D7e40c1FAb6CBd8DBc626b31A0aac8",
    config: "0x18b89e491d8f12d2be6D2A8e945dF4D93F1247a7",
    bootstrapETH: "0xE2649737D3005c511a27DF6388871a12bE0a2d30",
    swapExecutor: "0x", // Not deployed separately on Base (uses PoolSwapTest)
    bundler: "0x1AF3b3Cd703Ff59D18A295f669Ad9B7051707268",
  },
  // Uniswap V4 core (Base Mainnet)
  uniswapV4: {
    poolManager: "0x498581fF718922c3f8e6A244956aF099B2652b2b",
    positionManager: "0x7C5f5A4bBd8fD63184577525326123b519429bDc",
  },
  // Treasury for fees (30% platform tax + immortalization fees)
  treasury: "0xFf7549B06E68186C91a6737bc0f0CDE1245e349b",
} as const;

// Load identity ABIs (JSON)
import AgentBirthCertificateNFTABI from "./AgentBirthCertificateNFT.json";
import MemoryStorageABI from "./MemoryStorage.json";
import ClawclickConfigABI from "./clawclick/config.json";
import ClawclickTokenABI from "./clawclick/token.json";

// ============================================================================
// LaunchType enum — claw.click always uses DIRECT
// ============================================================================
export const LaunchType = { DIRECT: 0, AGENT: 1 } as const;

// ============================================================================
// Shared tuple components used across multiple ABIs
// ============================================================================
const POOL_KEY_COMPONENTS = [
  { name: 'currency0', type: 'address' },
  { name: 'currency1', type: 'address' },
  { name: 'fee', type: 'uint24' },
  { name: 'tickSpacing', type: 'int24' },
  { name: 'hooks', type: 'address' },
] as const;

const FEE_SPLIT_COMPONENTS = [
  { name: 'wallets', type: 'address[5]' },
  { name: 'percentages', type: 'uint16[5]' },
  { name: 'count', type: 'uint8' },
] as const;

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
] as const;

// ============================================================================
// Factory ABI (IClawclickFactory) — supports DIRECT + AGENT launch types
// ============================================================================
const FACTORY_ABI = [
  // ── createLaunch (includes launchType) ──
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
  // ── poolStates (auto-getter) ──
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
    inputs: [{ name: 'targetMcapETH', type: 'uint256' }, { name: 'tickSpacing', type: 'int24' }],
    outputs: [{ name: '', type: 'uint160' }],
  },
  // ── immutables ──
  { name: 'hook', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { name: 'poolManager', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { name: 'config', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { name: 'positionManager', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  // ── position management ──
  { name: 'mintNextPosition', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'poolId', type: 'bytes32' }, { name: 'positionIndex', type: 'uint256' }], outputs: [] },
  { name: 'retireOldPosition', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'poolId', type: 'bytes32' }, { name: 'positionIndex', type: 'uint256' }], outputs: [] },
  { name: 'collectFeesFromPosition', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'poolId', type: 'bytes32' }, { name: 'positionIndex', type: 'uint256' }], outputs: [] },
  // ── admin ──
  { name: 'clearDevOverride', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'poolId', type: 'bytes32' }], outputs: [] },
  // ── events ──
  {
    anonymous: false,
    name: 'TokenLaunched',
    type: 'event',
    inputs: [
      { indexed: true, name: 'token', type: 'address' },
      { indexed: true, name: 'beneficiary', type: 'address' },
      { indexed: true, name: 'creator', type: 'address' },
      { indexed: false, name: 'poolId', type: 'bytes32' },
      { indexed: false, name: 'targetMcapETH', type: 'uint256' },
      { indexed: false, name: 'sqrtPriceX96', type: 'uint160' },
      { indexed: false, name: 'name', type: 'string' },
      { indexed: false, name: 'symbol', type: 'string' },
      { indexed: false, name: 'launchType', type: 'uint8' },
    ],
  },
] as const;

// ============================================================================
// Hook ABI (IClawclickHook)
// ============================================================================
const HOOK_ABI = [
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
  { name: 'getCurrentTax', type: 'function', stateMutability: 'view', inputs: [{ name: 'poolId', type: 'bytes32' }], outputs: [{ name: '', type: 'uint256' }] },
  {
    name: 'getCurrentLimits',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [{ name: 'maxTx', type: 'uint256' }, { name: 'maxWallet', type: 'uint256' }],
  },
  { name: 'getCurrentEpoch', type: 'function', stateMutability: 'view', inputs: [{ name: 'poolId', type: 'bytes32' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'isGraduated', type: 'function', stateMutability: 'view', inputs: [{ name: 'poolId', type: 'bytes32' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'isGraduatedByToken', type: 'function', stateMutability: 'view', inputs: [{ name: 'token', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
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
  { name: 'getPoolIdForToken', type: 'function', stateMutability: 'view', inputs: [{ name: 'token', type: 'address' }], outputs: [{ name: '', type: 'bytes32' }] },
  { name: 'claimBeneficiaryFeesETH', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'beneficiary', type: 'address' }], outputs: [] },
  {
    name: 'claimBeneficiaryFeesToken',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'beneficiary', type: 'address' }, { name: 'token', type: 'address' }],
    outputs: [],
  },
  { name: 'TOTAL_SUPPLY', type: 'function', stateMutability: 'pure', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const;

// ============================================================================
// PoolSwapTest ABI — used for all swaps (hook uses tx.origin)
// ============================================================================
const POOL_SWAP_TEST_ABI = [
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
] as const;

// ============================================================================
// AgentLaunchBundler ABI — createLaunch + mintBirthCertificate in 1 tx
// ============================================================================
const LAUNCH_BUNDLER_ABI = [
  {
    name: 'launchAndMint',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'launchParams',
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
      { name: 'agentWallet', type: 'address' },
      { name: 'creator', type: 'address' },
      { name: 'agentName', type: 'string' },
      { name: 'socialHandle', type: 'string' },
      { name: 'memoryCID', type: 'string' },
      { name: 'avatarCID', type: 'string' },
      { name: 'ensName', type: 'string' },
    ],
    outputs: [
      { name: 'token', type: 'address' },
      { name: 'poolId', type: 'bytes32' },
      { name: 'nftId', type: 'uint256' },
    ],
  },
  { name: 'factory', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { name: 'birthCert', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  {
    anonymous: false,
    name: 'AgentLaunchBundled',
    type: 'event',
    inputs: [
      { indexed: true, name: 'token', type: 'address' },
      { indexed: true, name: 'nftId', type: 'uint256' },
      { indexed: false, name: 'poolId', type: 'bytes32' },
      { indexed: true, name: 'creator', type: 'address' },
      { indexed: false, name: 'agentWallet', type: 'address' },
    ],
  },
] as const;

// ============================================================================
// ERC20 ABI (minimal — balanceOf, approve, allowance, symbol, decimals)
// ============================================================================
const ERC20_ABI = [
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
] as const;

// Minimal ABIs for backwards compatibility (V3)
const AgentFactoryABI = [
  { "inputs": [{ "internalType": "address", "name": "wallet", "type": "address" }], "name": "getTokenByWallet", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getTotalAgents", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "index", "type": "uint256" }], "name": "getAgentByIndex", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "token", "type": "address" }], "name": "agentTier", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" },
];

const AgentTokenABI = [
  { "inputs": [], "name": "name", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "symbol", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "totalSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
];

const FeeCollectorABI = [
  { "inputs": [{ "internalType": "address", "name": "token", "type": "address" }], "name": "totalCollected", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
];

export const ABIS = {
  AgentBirthCertificateNFT: AgentBirthCertificateNFTABI.abi,
  MemoryStorage: MemoryStorageABI.abi,
  // V4 claw.click ABIs (active — inline)
  ClawclickFactory: FACTORY_ABI,
  ClawclickHook: HOOK_ABI,
  ClawclickConfig: ClawclickConfigABI.abi,
  ClawclickToken: ClawclickTokenABI.abi,
  // Uniswap V4 swap
  PoolSwapTest: POOL_SWAP_TEST_ABI,
  ERC20: ERC20_ABI,
  // Bundler (1-tx launch + mint)
  LaunchBundler: LAUNCH_BUNDLER_ABI,
  // V3 ABIs (deprecated — minimal versions for backwards compatibility)
  AgentFactory: AgentFactoryABI,
  AgentToken: AgentTokenABI,
  FeeCollector: FeeCollectorABI,
} as const;

// Helper to get addresses based on network (supports chainId)
export function getAddresses(network: 'sepolia' | 'base' | number = 'sepolia') {
  // Handle numeric chainId
  if (typeof network === 'number') {
    if (network === 8453) return BASE_ADDRESSES; // Base mainnet
    if (network === 11155111) return SEPOLIA_ADDRESSES; // Sepolia testnet
    // Default to Sepolia for unknown chains
    return SEPOLIA_ADDRESSES;
  }
  return network === 'base' ? BASE_ADDRESSES : SEPOLIA_ADDRESSES;
}

// Helper to detect if we're on mainnet or testnet
export function getNetworkFromChainId(chainId: number): 'base' | 'sepolia' {
  return chainId === 8453 ? 'base' : 'sepolia';
}

// Export chain IDs for easy reference
export const CHAIN_IDS = {
  BASE_MAINNET: 8453,
  SEPOLIA_TESTNET: 11155111,
} as const;
