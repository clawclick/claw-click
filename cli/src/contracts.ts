/**
 * ClawClick SDK — Contract addresses, ABIs & constants
 *
 * Networks:
 * - **Base mainnet** (chain 8453) — Production
 * - **Sepolia testnet** (chain 11155111) — Development/testing
 *
 * Contracts:
 * - AgentBirthCertificateNFT — Soulbound identity NFT (one per agent)
 * - MemoryStorage — On-chain memory index (text + content hashes)
 * - ClawclickFactory — Uniswap V4 token factory
 * - AgentLaunchBundler — Bundled deploy (token + birth cert in 1 tx)
 */

export const ADDRESSES = {
  sepolia: {
    birthCertificate: '0xE13532b0bD16E87088383f9F909EaCB03009a2e9' as `0x${string}`,
    memoryStorage: '0xC2D9c0ccc1656535e29B5c2398a609ef936aad75' as `0x${string}`,
    factory: '0x3f4bFd32362D058157A5F43d7861aCdC0484C415' as `0x${string}`,
    hook: '0xf537a9356f6909df0A633C8BC48e504D2a30B111' as `0x${string}`,
    config: '0xf01514F68Df33689046F6Dd4184edCaA54fF4492' as `0x${string}`,
    bootstrapETH: '0xC52b027928AfAa54f1f0FeC0e4D7b6397026f660' as `0x${string}`,
    poolManager: '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543' as `0x${string}`,
    positionManager: '0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4' as `0x${string}`,
    treasury: '0xFf7549B06E68186C91a6737bc0f0CDE1245e349b' as `0x${string}`,
    bundler: '0x579F512FA05CFd66033B06d8816915bA2Be971CE' as `0x${string}`,
  },
  base: {
    birthCertificate: '0x6E9B093FdD12eC34ce358bd70CF59EeCb5D1A95B' as `0x${string}`,
    memoryStorage: '0x81ae37d31C488094bf292ebEb15C6eCfcD9Fad7D' as `0x${string}`,
    factory: '0xF5979D0fEEd05CEcb94cf62B76FE7E9aB40c6b4a' as `0x${string}`,
    hook: '0x8265be7eb9D7e40c1FAb6CBd8DBc626b31A0aac8' as `0x${string}`,
    config: '0x18b89e491d8f12d2be6D2A8e945dF4D93F1247a7' as `0x${string}`,
    bootstrapETH: '0xE2649737D3005c511a27DF6388871a12bE0a2d30' as `0x${string}`,
    poolManager: '0x498581fF718922c3f8e6A244956aF099B2652b2b' as `0x${string}`,
    positionManager: '0x7C5f5A4bBd8fD63184577525326123b519429bDc' as `0x${string}`,
    treasury: '0xFf7549B06E68186C91a6737bc0f0CDE1245e349b' as `0x${string}`,
    bundler: '0x1AF3b3Cd703Ff59D18A295f669Ad9B7051707268' as `0x${string}`,
  },
} as const;

export type Network = 'sepolia' | 'base';

export function getAddresses(network: Network) {
  return ADDRESSES[network];
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Immortalization fee — 0.005 ETH */
export const IMMORTALIZATION_FEE = '0.005';

/** Memory upload fee — 0.0005 ETH */
export const MEMORY_UPLOAD_FEE = '0.0005';

// ─── Minimal ABIs (only the functions the SDK needs) ────────────────────────

export const BIRTH_CERTIFICATE_ABI = [
  { inputs: [], name: 'totalAgents', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'wallet', type: 'address' }], name: 'nftByWallet', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  {
    inputs: [{ name: 'nftId', type: 'uint256' }],
    name: 'agentByNFT',
    outputs: [
      { name: 'nftId', type: 'uint256' },
      { name: 'birthTimestamp', type: 'uint256' },
      { name: 'name', type: 'string' },
      { name: 'wallet', type: 'address' },
      { name: 'tokenAddress', type: 'address' },
      { name: 'creator', type: 'address' },
      { name: 'socialHandle', type: 'string' },
      { name: 'memoryCID', type: 'string' },
      { name: 'avatarCID', type: 'string' },
      { name: 'ensName', type: 'string' },
      { name: 'dnaHash', type: 'bytes32' },
      { name: 'immortalized', type: 'bool' },
      { name: 'spawnedAgents', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'wallet', type: 'address' },
      { name: 'tokenAddress', type: 'address' },
      { name: 'creator', type: 'address' },
      { name: 'name', type: 'string' },
      { name: 'socialHandle', type: 'string' },
      { name: 'memoryCID', type: 'string' },
      { name: 'avatarCID', type: 'string' },
      { name: 'ensName', type: 'string' },
    ],
    name: 'mintBirthCertificate',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'memoryCID', type: 'string' }],
    name: 'updateMemory',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'nftId', type: 'uint256' }, { name: 'tokenAddress', type: 'address' }],
    name: 'updateTokenAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export const MEMORY_STORAGE_ABI = [
  {
    inputs: [{ name: 'agent', type: 'address' }],
    name: 'getMemoryCount',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'agent', type: 'address' }, { name: 'index', type: 'uint256' }],
    name: 'getMemory',
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'timestamp', type: 'uint256' },
        { name: 'ipfsCID', type: 'string' },
        { name: 'fullText', type: 'string' },
        { name: 'contentHash', type: 'bytes32' },
      ],
    }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'ipfsCID', type: 'string' },
      { name: 'fullText', type: 'string' },
      { name: 'nonce', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    name: 'storeMemory',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'agent', type: 'address' }],
    name: 'getNonce',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'agent', type: 'address' }],
    name: 'getLatestMemory',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const LAUNCH_BUNDLER_ABI = [
  {
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
          {
            name: 'feeSplit', type: 'tuple',
            components: [
              { name: 'wallets', type: 'address[5]' },
              { name: 'percentages', type: 'uint16[5]' },
              { name: 'count', type: 'uint8' },
            ],
          },
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
    name: 'launchAndMint',
    outputs: [
      { name: 'token', type: 'address' },
      { name: 'poolId', type: 'bytes32' },
      { name: 'nftId', type: 'uint256' },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
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
  { inputs: [], name: 'factory', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'birthCert', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
] as const;
