// @clawclick/sdk — CLI & SDK for Claw.Click agents

// ── Core SDK class ──
export { ClawClick, MIN_BOOTSTRAP_ETH } from './sdk'
export type {
  ClawClickConfig,
  LaunchParams,
  LaunchResult,
  LaunchTypeOption,
  TokenInfo,
  PoolProgress,
  PoolState,
  TokenApiData,
  FunlanPost,
} from './sdk'

// ── ABIs (existing) ──
export { FACTORY_ABI, HOOK_ABI, POOL_SWAP_TEST_ABI, SWAP_EXECUTOR_ABI, ERC20_ABI, LaunchType } from './abi'

// ── Contract addresses & new ABIs ──
export {
  ADDRESSES,
  getAddresses,
  BIRTH_CERTIFICATE_ABI,
  MEMORY_STORAGE_ABI,
  LAUNCH_BUNDLER_ABI,
  IMMORTALIZATION_FEE,
  MEMORY_UPLOAD_FEE,
} from './contracts'
export type { Network } from './contracts'

// ── HTTP API client (sessions, compute, terminal, files, keys, payment) ──
export { ClawClickApiClient } from './api'
export type {
  ClawClickApiConfig,
  SessionCreateParams,
  SessionInfo,
  EstimateResult,
  AgentInfo,
  TokenStats,
  PlatformStats,
  PaymentInfo,
} from './api'

// ── On-chain operations (birth cert, memory, immortalization) ──
export {
  createStandaloneLaunch,
  mintBirthCertificate,
  launchAndMint,
  getAgentByNftId,
  getNftIdByWallet,
  getTotalAgents,
  getAgentByWallet,
  storeMemory,
  getMemoryCount,
  getMemory,
  updateBirthCertMemory,
  immortalizeAgent,
} from './chain'
export type {
  CreateLaunchParams,
  StandaloneLaunchResult,
  MintResult,
  LaunchAndMintResult,
  AgentOnChain,
  MemoryEntry,
} from './chain'

// ── Wallet utilities ──
export {
  generateAgentWallet,
  createAgentWalletRemote,
  loadAccount,
  getChain,
  createReader,
  createWriter,
  findConfig,
  loadConfig,
  saveConfig,
} from './wallet'
export type { AgentConfig } from './wallet'

// ── FUNLAN grid generator ──
export {
  generateFunlanGrid,
  hasLobster,
  toFunlanMarkdown,
} from './funlan'
export type { FunlanGrid } from './funlan'
