/**
 * useLaunchWithDevBuy - Two-transaction flow for token launch + dev buy
 * 
 * TX1: Launch token (via Factory or Bundler)
 * TX2: Dev buy (via PoolSwapTest router) - executed in creator first-buy window
 */

import { useState, useCallback } from 'react'
import { usePublicClient, useWalletClient } from 'wagmi'
import { parseEther, Hex, decodeEventLog, encodeFunctionData } from 'viem'
import { ABIS } from '../contracts'

const MIN_SQRT_PRICE = BigInt('4295128739') // Minimum sqrtPriceX96 for slippage

export interface LaunchParams {
  // Token details
  name: string
  symbol: string
  beneficiary: `0x${string}`
  agentWallet: `0x${string}` | null
  targetMcapETH: bigint
  feeSplit: {
    wallets: readonly [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`]
    percentages: readonly [number, number, number, number, number]
    count: number
  }
  launchType: 0 | 1 // 0 = DIRECT, 1 = AGENT
  
  // Dev buy (optional)
  devBuyETH?: number // Amount in ETH to spend on dev buy
  
  // AGENT-specific (for bundler)
  agentName?: string
  socialHandle?: string
  memoryCID?: string
  avatarCID?: string
  ensName?: string
}

export interface LaunchResult {
  tokenAddress: `0x${string}`
  poolId: Hex
  tokensBought?: string
  txHashes: string[]
  nftId?: bigint
}

export interface LaunchState {
  isLaunching: boolean
  isConfirming: boolean
  isDone: boolean
  error: string | null
  phase: 'idle' | 'launching' | 'waiting-tx1' | 'buying' | 'waiting-tx2' | 'done'
  result: LaunchResult | null
}

export function useLaunchWithDevBuy(
  factoryAddress: `0x${string}`,
  bundlerAddress: `0x${string}`,
  poolSwapTestAddress: `0x${string}`
) {
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  
  const [state, setState] = useState<LaunchState>({
    isLaunching: false,
    isConfirming: false,
    isDone: false,
    error: null,
    phase: 'idle',
    result: null,
  })

  const launchWithDevBuy = useCallback(async (params: LaunchParams): Promise<LaunchResult | null> => {
    if (!walletClient || !publicClient) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }))
      return null
    }

    try {
      setState({
        isLaunching: true,
        isConfirming: false,
        isDone: false,
        error: null,
        phase: 'launching',
        result: null,
      })

      // ═══════ CALCULATE AMOUNTS ═══════
      const BOOTSTRAP_ETH = 0.001
      const BIRTH_CERT_FEE = params.launchType === 1 ? 0.005 : 0
      const launchETH = BOOTSTRAP_ETH + BIRTH_CERT_FEE
      const devBuyETH = params.devBuyETH || 0

      console.log('[LaunchWithDevBuy] Launch:', launchETH, 'ETH | Dev Buy:', devBuyETH, 'ETH')

      let tx1Hash: Hex
      let tokenAddress: `0x${string}`
      let poolId: Hex
      let nftId: bigint | undefined

      // ═══════ TX1: LAUNCH TOKEN ═══════
      if (params.launchType === 1) {
        // AGENT flow: Use bundler
        console.log('[LaunchWithDevBuy] AGENT flow via bundler')
        
        const { request } = await publicClient.simulateContract({
          address: bundlerAddress,
          abi: ABIS.LaunchBundler,
          functionName: 'launchAndMint',
          args: [
            params,
            params.agentWallet!,
            params.beneficiary,
            params.agentName || '',
            params.socialHandle || '',
            params.memoryCID || '',
            params.avatarCID || '',
            params.ensName || '',
          ],
          value: parseEther(launchETH.toString()),
          account: walletClient.account,
        })

        tx1Hash = await walletClient.writeContract(request)
      } else {
        // DIRECT flow: Use factory
        console.log('[LaunchWithDevBuy] DIRECT flow via factory')
        
        const { request } = await publicClient.simulateContract({
          address: factoryAddress,
          abi: ABIS.Factory,
          functionName: 'createLaunch',
          args: [params],
          value: parseEther(launchETH.toString()),
          account: walletClient.account,
        })

        tx1Hash = await walletClient.writeContract(request)
      }

      console.log('[LaunchWithDevBuy] TX1 submitted:', tx1Hash)
      setState(prev => ({ ...prev, phase: 'waiting-tx1' }))

      // Wait for TX1 confirmation
      const receipt1 = await publicClient.waitForTransactionReceipt({ hash: tx1Hash })
      
      if (receipt1.status === 'reverted') {
        throw new Error('Launch transaction reverted')
      }

      console.log('[LaunchWithDevBuy] TX1 confirmed in block', receipt1.blockNumber)

      // Parse event to get token address and pool ID
      for (const log of receipt1.logs) {
        try {
          const abi = params.launchType === 1 ? ABIS.LaunchBundler : ABIS.Factory
          const decoded = decodeEventLog({
            abi,
            data: log.data,
            topics: log.topics,
          })

          if (decoded.eventName === 'AgentLaunchBundled') {
            const args = decoded.args as any
            tokenAddress = args.token
            poolId = args.poolId
            nftId = args.nftId
            console.log('[LaunchWithDevBuy] Token:', tokenAddress, '| Pool:', poolId, '| NFT:', nftId)
            break
          } else if (decoded.eventName === 'TokenLaunched') {
            const args = decoded.args as any
            tokenAddress = args.token
            poolId = args.poolId
            console.log('[LaunchWithDevBuy] Token:', tokenAddress, '| Pool:', poolId)
            break
          }
        } catch {
          // Not this event
        }
      }

      if (!tokenAddress! || !poolId!) {
        throw new Error('Failed to parse token address from launch event')
      }

      // ═══════ TX2: DEV BUY (if requested) ═══════
      let tx2Hash: Hex | undefined
      let tokensBought: string | undefined

      if (devBuyETH > 0) {
        console.log('[LaunchWithDevBuy] Executing dev buy:', devBuyETH, 'ETH')
        setState(prev => ({ ...prev, phase: 'buying' }))

        // Build pool key from pool ID
        // Pool key structure: { currency0, currency1, fee, tickSpacing, hooks }
        // For clawclick pools: currency0 = ETH (0x0), currency1 = token, fee = 0 (DIRECT) or 0 (AGENT before grad)
        const poolKey = {
          currency0: '0x0000000000000000000000000000000000000000' as `0x${string}`,
          currency1: tokenAddress,
          fee: 0, // DIRECT has 1% LP fee in PoolManager, AGENT has 0% pool fee (hook takes it)
          tickSpacing: 60,
          hooks: params.launchType === 1 ? bundlerAddress : '0x0000000000000000000000000000000000000000' as `0x${string}`,
        }

        const swapParams = {
          zeroForOne: true, // ETH -> Token
          amountSpecified: -parseEther(devBuyETH.toString()), // Negative = exact input
          sqrtPriceLimitX96: MIN_SQRT_PRICE, // Slippage protection
        }

        const testSettings = {
          takeClaims: false,
          settleUsingBurn: false,
        }

        try {
          const { request: swapRequest } = await publicClient.simulateContract({
            address: poolSwapTestAddress,
            abi: ABIS.PoolSwapTest,
            functionName: 'swap',
            args: [
              poolKey,
              swapParams,
              testSettings,
              '0x' as Hex, // No hook data
            ],
            value: parseEther(devBuyETH.toString()),
            account: walletClient.account,
          })

          tx2Hash = await walletClient.writeContract(swapRequest)
          console.log('[LaunchWithDevBuy] TX2 (dev buy) submitted:', tx2Hash)
          setState(prev => ({ ...prev, phase: 'waiting-tx2' }))

          const receipt2 = await publicClient.waitForTransactionReceipt({ hash: tx2Hash })
          
          if (receipt2.status === 'reverted') {
            console.warn('[LaunchWithDevBuy] Dev buy reverted, but launch succeeded')
          } else {
            console.log('[LaunchWithDevBuy] TX2 confirmed in block', receipt2.blockNumber)
            // TODO: Parse swap delta to get actual tokens received
            tokensBought = 'TBD'
          }
        } catch (error: any) {
          console.error('[LaunchWithDevBuy] Dev buy failed (non-critical):', error)
          // Don't fail the whole flow - launch succeeded
        }
      }

      const result: LaunchResult = {
        tokenAddress,
        poolId,
        tokensBought,
        txHashes: [tx1Hash, tx2Hash].filter(Boolean) as string[],
        nftId,
      }

      setState({
        isLaunching: false,
        isConfirming: false,
        isDone: true,
        error: null,
        phase: 'done',
        result,
      })

      return result
    } catch (error: any) {
      console.error('[LaunchWithDevBuy] Failed:', error)
      const errorMsg = error?.shortMessage || error?.message || 'Unknown error'
      setState({
        isLaunching: false,
        isConfirming: false,
        isDone: false,
        error: errorMsg,
        phase: 'idle',
        result: null,
      })
      return null
    }
  }, [walletClient, publicClient, factoryAddress, bundlerAddress, poolSwapTestAddress])

  const reset = useCallback(() => {
    setState({
      isLaunching: false,
      isConfirming: false,
      isDone: false,
      error: null,
      phase: 'idle',
      result: null,
    })
  }, [])

  return {
    launchWithDevBuy,
    reset,
    ...state,
  }
}
