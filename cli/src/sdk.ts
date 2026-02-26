import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  parseEther,
  type PublicClient,
  type WalletClient,
  type Chain,
  type Transport,
  type Account,
  type Address,
  type Hash,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia, mainnet, base, bsc } from 'viem/chains'
import { readFileSync } from 'fs'
import FormData from 'form-data'
import { FACTORY_ABI, HOOK_ABI, POOL_SWAP_TEST_ABI, ERC20_ABI, LaunchType } from './abi'

// ============================================================================
// CONSTANTS
// ============================================================================

/** Minimum sqrt price limit for buys (zeroForOne = true) */
const MIN_SQRT_PRICE_LIMIT = 4295128740n
/** Maximum sqrt price limit for sells (zeroForOne = false) */
const MAX_SQRT_PRICE_LIMIT = 1461446703485210103287273052203988822378723970341n

// ============================================================================
// TYPES
// ============================================================================

export type LaunchTypeOption = 'direct' | 'agent'

export interface ClawClickConfig {
  /** Hex private key (with or without 0x prefix) */
  privateKey: string
  /** RPC URL */
  rpcUrl: string
  /** Backend API URL */
  apiUrl: string
  /** Factory contract address */
  factoryAddress: Address
  /** Hook contract address */
  hookAddress: Address
  /**
   * PoolSwapTest contract address — used for trading.
   * (Legacy: accepts the old `swapExecutorAddress` name too)
   */
  poolSwapTestAddress: Address
  /** @deprecated Use poolSwapTestAddress */
  swapExecutorAddress?: Address
  /** Chain ID (default: 11155111 for Sepolia) */
  chainId?: number
}

export interface LaunchParams {
  name: string
  symbol: string
  beneficiary: Address
  agentWallet?: Address
  targetMcapETH: string // in ETH, e.g. "1.5"
  /** Bootstrap ETH to send (e.g. "0.001"). If omitted, relies on free bootstrap contract. */
  bootstrapETH?: string
  feeSplit?: {
    wallets: Address[]
    percentages: number[] // basis points out of 10000
  }
  /**
   * Launch type:
   * - `'direct'`  — hookless pool, 1% LP fee, tradeable on Uniswap UI (claws.fun)
   * - `'agent'`   — hook-based pool, dynamic fee, epoch/tax/limits (claw.click)
   * Default: `'agent'`
   */
  launchType?: LaunchTypeOption
}

export interface LaunchResult {
  tokenAddress: Address
  poolId: Hex
  txHash: Hash
  launchType: LaunchTypeOption
}

export interface TokenInfo {
  token: Address
  beneficiary: Address
  agentWallet: Address
  creator: Address
  poolId: Hex
  targetMcapETH: bigint
  name: string
  symbol: string
  launchType: LaunchTypeOption
  createdAt: bigint
  createdBlock: bigint
  poolKey: {
    currency0: Address
    currency1: Address
    fee: number
    tickSpacing: number
    hooks: Address
  }
  feeSplit: {
    wallets: Address[]
    percentages: number[]
    count: number
  }
}

export interface PoolProgress {
  currentPosition: bigint
  currentEpoch: bigint
  lastEpochMCAP: bigint
  graduated: boolean
}

export interface PoolState {
  token: Address
  beneficiary: Address
  startingMCAP: bigint
  graduationMCAP: bigint
  totalSupply: bigint
  positionTokenIds: bigint[]
  positionMinted: boolean[]
  positionRetired: boolean[]
  recycledETH: bigint
  activated: boolean
  graduated: boolean
}

export interface TokenApiData {
  address: string
  name: string
  symbol: string
  creator: string
  beneficiary: string
  current_price: string | null
  current_mcap: string | null
  target_mcap: string
  volume_24h: string
  volume_total: string
  graduated: boolean
  launched_at: string
  logo_url: string | null
  banner_url: string | null
}

// ============================================================================
// CHAIN MAP
// ============================================================================

const CHAINS: Record<number, Chain> = {
  1: mainnet,
  11155111: sepolia,
  8453: base,
  56: bsc,
}

// ============================================================================
// SDK CLASS
// ============================================================================

export class ClawClick {
  public readonly publicClient: PublicClient
  public readonly walletClient: WalletClient<Transport, Chain, Account>
  public readonly account: Account
  public readonly factoryAddress: Address
  public readonly hookAddress: Address
  public readonly poolSwapTestAddress: Address
  public readonly apiUrl: string
  public readonly chain: Chain

  constructor(config: ClawClickConfig) {
    const key = config.privateKey.startsWith('0x')
      ? config.privateKey as Hex
      : `0x${config.privateKey}` as Hex

    this.account = privateKeyToAccount(key)
    this.chain = CHAINS[config.chainId || 11155111] || sepolia
    this.factoryAddress = config.factoryAddress
    this.hookAddress = config.hookAddress
    // Accept both new name and legacy name
    this.poolSwapTestAddress = config.poolSwapTestAddress || config.swapExecutorAddress!
    this.apiUrl = config.apiUrl.replace(/\/$/, '')

    const transport = http(config.rpcUrl)

    this.publicClient = createPublicClient({
      chain: this.chain,
      transport,
    })

    this.walletClient = createWalletClient({
      account: this.account,
      chain: this.chain,
      transport,
    })
  }

  /** @deprecated Use poolSwapTestAddress */
  get swapExecutorAddress(): Address {
    return this.poolSwapTestAddress
  }

  /** Get the agent's wallet address */
  get address(): Address {
    return this.account.address
  }

  // ==========================================================================
  // TOKEN LAUNCH
  // ==========================================================================

  /**
   * Launch a new token through the factory.
   *
   * @param params.launchType - `'direct'` (hookless, Uniswap-tradeable) or `'agent'` (hook-based). Default: `'agent'`
   */
  async launch(params: LaunchParams): Promise<LaunchResult> {
    const wallets: Address[] = Array(5).fill('0x0000000000000000000000000000000000000000')
    const percentages: number[] = Array(5).fill(0)
    let count = 0

    if (params.feeSplit && params.feeSplit.wallets.length > 0) {
      count = Math.min(params.feeSplit.wallets.length, 5)
      for (let i = 0; i < count; i++) {
        wallets[i] = params.feeSplit.wallets[i]
        percentages[i] = params.feeSplit.percentages[i]
      }
    }

    const launchTypeValue = params.launchType === 'direct' ? LaunchType.DIRECT : LaunchType.AGENT

    const txHash = await this.walletClient.writeContract({
      address: this.factoryAddress,
      abi: FACTORY_ABI,
      functionName: 'createLaunch',
      args: [
        {
          name: params.name,
          symbol: params.symbol,
          beneficiary: params.beneficiary,
          agentWallet: params.agentWallet || this.address,
          targetMcapETH: parseEther(params.targetMcapETH),
          feeSplit: {
            wallets: wallets as unknown as readonly [Address, Address, Address, Address, Address],
            percentages: percentages as unknown as readonly [number, number, number, number, number],
            count,
          },
          launchType: launchTypeValue,
        },
      ],
      value: params.bootstrapETH ? parseEther(params.bootstrapETH) : 0n,
    })

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash })

    // Fallback: read from factory using token count
    const tokenCount = await this.publicClient.readContract({
      address: this.factoryAddress,
      abi: FACTORY_ABI,
      functionName: 'getTokenCount',
    })
    const tokenAddress = await this.publicClient.readContract({
      address: this.factoryAddress,
      abi: FACTORY_ABI,
      functionName: 'getTokenAtIndex',
      args: [tokenCount - 1n],
    }) as Address

    const info = await this.publicClient.readContract({
      address: this.factoryAddress,
      abi: FACTORY_ABI,
      functionName: 'launchByToken',
      args: [tokenAddress],
    }) as any

    const poolId: Hex = info.poolId
    const launchType: LaunchTypeOption = params.launchType || 'agent'

    return { tokenAddress, poolId, txHash, launchType }
  }

  // ==========================================================================
  // TRADING
  // ==========================================================================

  /**
   * Buy tokens with ETH via PoolSwapTest.swap().
   *
   * Works for both DIRECT (hookless) and AGENT (hook-based) pools.
   * The poolKey is fetched from the factory and determines routing automatically.
   *
   * @param tokenAddress - The token to buy
   * @param amountETH - Amount of ETH to spend (e.g. "0.1")
   * @param slippageBps - Slippage tolerance in bps (default 500 = 5%) — reserved for future use
   */
  async buy(tokenAddress: Address, amountETH: string, slippageBps = 500): Promise<Hash> {
    const poolKey = await this.getPoolKey(tokenAddress)
    const amountIn = parseEther(amountETH)

    // ETH (currency0) → Token: zeroForOne = true, amountSpecified negative = exact-input
    const txHash = await this.walletClient.writeContract({
      address: this.poolSwapTestAddress,
      abi: POOL_SWAP_TEST_ABI,
      functionName: 'swap',
      args: [
        poolKey,
        {
          zeroForOne: true,
          amountSpecified: -amountIn, // negative = exact input
          sqrtPriceLimitX96: MIN_SQRT_PRICE_LIMIT,
        },
        {
          takeClaims: false,
          settleUsingBurn: false,
        },
        '0x' as Hex,
      ],
      value: amountIn,
    })

    return txHash
  }

  /**
   * Sell tokens for ETH via PoolSwapTest.swap().
   *
   * Works for both DIRECT (hookless) and AGENT (hook-based) pools.
   * Automatically approves the PoolSwapTest contract if needed.
   *
   * @param tokenAddress - The token to sell
   * @param amount - Amount of tokens to sell (e.g. "1000000") or "all" to sell entire balance
   * @param slippageBps - Slippage tolerance in bps (default 500 = 5%) — reserved for future use
   */
  async sell(tokenAddress: Address, amount: string, slippageBps = 500): Promise<Hash> {
    let amountIn: bigint

    if (amount === 'all') {
      amountIn = await this.publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [this.address],
      }) as bigint
    } else {
      amountIn = parseEther(amount)
    }

    // Approve PoolSwapTest to spend tokens
    const allowance = await this.publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [this.address, this.poolSwapTestAddress],
    }) as bigint

    if (allowance < amountIn) {
      const approveTx = await this.walletClient.writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [this.poolSwapTestAddress, amountIn],
      })
      await this.publicClient.waitForTransactionReceipt({ hash: approveTx })
    }

    const poolKey = await this.getPoolKey(tokenAddress)

    // Token (currency1) → ETH: zeroForOne = false, amountSpecified negative = exact-input
    const txHash = await this.walletClient.writeContract({
      address: this.poolSwapTestAddress,
      abi: POOL_SWAP_TEST_ABI,
      functionName: 'swap',
      args: [
        poolKey,
        {
          zeroForOne: false,
          amountSpecified: -amountIn, // negative = exact input
          sqrtPriceLimitX96: MAX_SQRT_PRICE_LIMIT,
        },
        {
          takeClaims: false,
          settleUsingBurn: false,
        },
        '0x' as Hex,
      ],
    })

    return txHash
  }

  // ==========================================================================
  // IMAGE UPLOAD
  // ==========================================================================

  /**
   * Upload logo and/or banner images for a token you own.
   * Signs a message to prove ownership.
   */
  async uploadImages(
    tokenAddress: Address,
    options: {
      logoPath?: string
      bannerPath?: string
    }
  ): Promise<{ logo_url: string | null; banner_url: string | null }> {
    if (!options.logoPath && !options.bannerPath) {
      throw new Error('At least one of logoPath or bannerPath is required')
    }

    const timestamp = Date.now().toString()
    const message = `clawclick:upload:${tokenAddress.toLowerCase()}:${timestamp}`
    const signature = await this.walletClient.signMessage({ message })

    const form = new FormData()
    form.append('signature', signature)
    form.append('timestamp', timestamp)

    if (options.logoPath) {
      const buf = readFileSync(options.logoPath)
      const ext = options.logoPath.split('.').pop()?.toLowerCase() || 'png'
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
        : ext === 'gif' ? 'image/gif'
        : ext === 'webp' ? 'image/webp'
        : ext === 'svg' ? 'image/svg+xml'
        : 'image/png'
      form.append('logo', buf, { filename: `logo.${ext}`, contentType: mime })
    }

    if (options.bannerPath) {
      const buf = readFileSync(options.bannerPath)
      const ext = options.bannerPath.split('.').pop()?.toLowerCase() || 'png'
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
        : ext === 'gif' ? 'image/gif'
        : ext === 'webp' ? 'image/webp'
        : ext === 'svg' ? 'image/svg+xml'
        : 'image/png'
      form.append('banner', buf, { filename: `banner.${ext}`, contentType: mime })
    }

    const response = await fetch(`${this.apiUrl}/api/token/${tokenAddress}/images`, {
      method: 'POST',
      body: form as any,
      headers: form.getHeaders(),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(`Upload failed (${response.status}): ${(err as any).error || response.statusText}`)
    }

    return response.json() as Promise<{ logo_url: string | null; banner_url: string | null }>
  }

  // ==========================================================================
  // FEE CLAIMING
  // ==========================================================================

  /**
   * Claim accumulated ETH fees for a beneficiary address.
   * Only applicable to AGENT launches (hook-based pools).
   */
  async claimFeesETH(beneficiary?: Address): Promise<Hash> {
    const addr = beneficiary || this.address
    return this.walletClient.writeContract({
      address: this.hookAddress,
      abi: HOOK_ABI,
      functionName: 'claimBeneficiaryFeesETH',
      args: [addr],
    })
  }

  /**
   * Claim accumulated token fees for a beneficiary.
   * Only applicable to AGENT launches (hook-based pools).
   */
  async claimFeesToken(tokenAddress: Address, beneficiary?: Address): Promise<Hash> {
    const addr = beneficiary || this.address
    return this.walletClient.writeContract({
      address: this.hookAddress,
      abi: HOOK_ABI,
      functionName: 'claimBeneficiaryFeesToken',
      args: [addr, tokenAddress],
    })
  }

  /**
   * Collect LP fees from a specific position (for DIRECT launches).
   * Triggers the factory's 70/30 beneficiary/platform split.
   */
  async collectFeesFromPosition(tokenAddress: Address, positionIndex: number): Promise<Hash> {
    const info = await this.getTokenInfo(tokenAddress)
    return this.walletClient.writeContract({
      address: this.factoryAddress,
      abi: FACTORY_ABI,
      functionName: 'collectFeesFromPosition',
      args: [info.poolId as Hex, BigInt(positionIndex)],
    })
  }

  // ==========================================================================
  // ON-CHAIN READS
  // ==========================================================================

  /** Get token launch info from the factory (includes launchType) */
  async getTokenInfo(tokenAddress: Address): Promise<TokenInfo> {
    const info = await this.publicClient.readContract({
      address: this.factoryAddress,
      abi: FACTORY_ABI,
      functionName: 'launchByToken',
      args: [tokenAddress],
    }) as any

    return {
      token: info.token,
      beneficiary: info.beneficiary,
      agentWallet: info.agentWallet,
      creator: info.creator,
      poolId: info.poolId,
      targetMcapETH: info.targetMcapETH,
      name: info.name,
      symbol: info.symbol,
      launchType: Number(info.launchType) === LaunchType.DIRECT ? 'direct' : 'agent',
      createdAt: info.createdAt,
      createdBlock: info.createdBlock,
      poolKey: {
        currency0: info.poolKey.currency0,
        currency1: info.poolKey.currency1,
        fee: Number(info.poolKey.fee),
        tickSpacing: Number(info.poolKey.tickSpacing),
        hooks: info.poolKey.hooks,
      },
      feeSplit: {
        wallets: [...info.feeSplit.wallets],
        percentages: info.feeSplit.percentages.map((p: any) => Number(p)),
        count: Number(info.feeSplit.count),
      },
    }
  }

  /** Check if a token uses a DIRECT (hookless) pool */
  async isDirectLaunch(tokenAddress: Address): Promise<boolean> {
    const info = await this.getTokenInfo(tokenAddress)
    return info.launchType === 'direct'
  }

  /**
   * Get pool progress from the hook.
   * Only works for AGENT launches. For DIRECT launches, returns zeroed progress.
   */
  async getPoolProgress(tokenAddress: Address): Promise<PoolProgress> {
    const isDirect = await this.isDirectLaunch(tokenAddress)
    if (isDirect) {
      return { currentPosition: 0n, currentEpoch: 0n, lastEpochMCAP: 0n, graduated: false }
    }

    const poolId = await this.getPoolId(tokenAddress)
    const result = await this.publicClient.readContract({
      address: this.hookAddress,
      abi: HOOK_ABI,
      functionName: 'poolProgress',
      args: [poolId],
    }) as any

    return {
      currentPosition: result[0],
      currentEpoch: result[1],
      lastEpochMCAP: result[2],
      graduated: result[3],
    }
  }

  /**
   * Get current tax rate for a token's pool.
   * Only works for AGENT launches. DIRECT launches always return 0 (no tax).
   */
  async getCurrentTax(tokenAddress: Address): Promise<bigint> {
    const isDirect = await this.isDirectLaunch(tokenAddress)
    if (isDirect) return 0n

    const poolId = await this.getPoolId(tokenAddress)
    return this.publicClient.readContract({
      address: this.hookAddress,
      abi: HOOK_ABI,
      functionName: 'getCurrentTax',
      args: [poolId],
    }) as Promise<bigint>
  }

  /**
   * Get current trading limits for a token's pool.
   * Only works for AGENT launches. DIRECT launches return max uint256 (no limits).
   */
  async getCurrentLimits(tokenAddress: Address): Promise<{ maxTx: bigint; maxWallet: bigint }> {
    const MAX_UINT = 2n ** 256n - 1n
    const isDirect = await this.isDirectLaunch(tokenAddress)
    if (isDirect) return { maxTx: MAX_UINT, maxWallet: MAX_UINT }

    const poolId = await this.getPoolId(tokenAddress)
    const result = await this.publicClient.readContract({
      address: this.hookAddress,
      abi: HOOK_ABI,
      functionName: 'getCurrentLimits',
      args: [poolId],
    }) as any
    return { maxTx: result[0], maxWallet: result[1] }
  }

  /**
   * Check if a token has graduated.
   * DIRECT launches never graduate (returns false). AGENT launches check the hook.
   */
  async isGraduated(tokenAddress: Address): Promise<boolean> {
    const isDirect = await this.isDirectLaunch(tokenAddress)
    if (isDirect) return false

    return this.publicClient.readContract({
      address: this.hookAddress,
      abi: HOOK_ABI,
      functionName: 'isGraduatedByToken',
      args: [tokenAddress],
    }) as Promise<boolean>
  }

  /** Get the pool state from the factory (scalar fields only — auto-getter skips arrays) */
  async getPoolState(tokenAddress: Address): Promise<PoolState> {
    const info = await this.getTokenInfo(tokenAddress)
    // Solidity auto-getter for mapping returns individual values (arrays are skipped)
    const result = await this.publicClient.readContract({
      address: this.factoryAddress,
      abi: FACTORY_ABI,
      functionName: 'poolStates',
      args: [info.poolId],
    }) as any
    // Auto-getter returns a tuple of scalar fields
    return {
      token: result[0] ?? result.token,
      beneficiary: result[1] ?? result.beneficiary,
      startingMCAP: result[2] ?? result.startingMCAP,
      graduationMCAP: result[3] ?? result.graduationMCAP,
      totalSupply: result[4] ?? result.totalSupply,
      positionTokenIds: [],
      positionMinted: [],
      positionRetired: [],
      recycledETH: result[5] ?? result.recycledETH,
      activated: result[6] ?? result.activated,
      graduated: result[7] ?? result.graduated,
    }
  }

  /** Get token balance for the agent's wallet */
  async getTokenBalance(tokenAddress: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [this.address],
    }) as Promise<bigint>
  }

  /** Get ETH balance for the agent's wallet */
  async getETHBalance(): Promise<bigint> {
    return this.publicClient.getBalance({ address: this.address })
  }

  // ==========================================================================
  // BACKEND API READS
  // ==========================================================================

  /** Get token data from the backend API */
  async getTokenFromAPI(tokenAddress: string): Promise<TokenApiData & { recentSwaps: any[] }> {
    const res = await fetch(`${this.apiUrl}/api/token/${tokenAddress}`)
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    const data = await res.json() as any
    return { ...data.token, recentSwaps: data.recentSwaps }
  }

  /** List tokens from the backend API */
  async listTokens(opts?: {
    sort?: 'new' | 'hot' | 'mcap' | 'volume'
    limit?: number
    offset?: number
    search?: string
  }): Promise<{ tokens: TokenApiData[]; total: number }> {
    const params = new URLSearchParams()
    if (opts?.sort) params.set('sort', opts.sort)
    if (opts?.limit) params.set('limit', String(opts.limit))
    if (opts?.offset) params.set('offset', String(opts.offset))
    if (opts?.search) params.set('search', opts.search)

    const res = await fetch(`${this.apiUrl}/api/tokens?${params}`)
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json() as any
  }

  /** Get trending tokens from the backend API */
  async getTrending(): Promise<TokenApiData[]> {
    const res = await fetch(`${this.apiUrl}/api/tokens/trending`)
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json() as any
  }

  /** Get platform stats from the backend API */
  async getStats(): Promise<any> {
    const res = await fetch(`${this.apiUrl}/api/stats`)
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  }

  // ==========================================================================
  // INTERNAL HELPERS
  // ==========================================================================

  /** Get the pool ID for a token from the hook */
  private async getPoolId(tokenAddress: Address): Promise<Hex> {
    return this.publicClient.readContract({
      address: this.hookAddress,
      abi: HOOK_ABI,
      functionName: 'getPoolIdForToken',
      args: [tokenAddress],
    }) as Promise<Hex>
  }

  /** Get the PoolKey for a token (needed for swaps) */
  private async getPoolKey(tokenAddress: Address): Promise<{
    currency0: Address
    currency1: Address
    fee: number
    tickSpacing: number
    hooks: Address
  }> {
    const info = await this.getTokenInfo(tokenAddress)
    return info.poolKey
  }
}
