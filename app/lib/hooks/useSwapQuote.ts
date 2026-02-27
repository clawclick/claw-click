import { useState, useEffect, useCallback } from 'react'
import { usePublicClient } from 'wagmi'
import { formatEther, type Address } from 'viem'
import { CONTRACTS, CHAIN_ID } from '../contracts'
import { HOOK_READ_ABI } from '../utils/swap'

interface QuoteResult {
  estimatedOutput: bigint
  priceImpact: number
  currentTaxBps: number
  currentEpoch: number
  isGraduated: boolean
  mcapETH: string
  pricePerToken: string // in ETH
}

/**
 * Hook to estimate swap output for a given input amount.
 * Reads on-chain pool state from the Hook contract on Base.
 */
export function useSwapQuote(
  tokenAddress: Address | undefined,
  isBuy: boolean,
  inputAmount: string // human-readable (e.g., "0.01" ETH or "1000000" tokens)
) {
  const [quote, setQuote] = useState<QuoteResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const publicClient = usePublicClient({ chainId: CHAIN_ID })

  const fetchQuote = useCallback(async () => {
    if (!tokenAddress || !inputAmount || !publicClient || parseFloat(inputAmount) <= 0) {
      setQuote(null)
      return
    }

    setIsLoading(true)
    try {
      // Get poolId from the hook contract (avoids computing locally)
      const poolId = await publicClient.readContract({
        address: CONTRACTS.HOOK as Address,
        abi: HOOK_READ_ABI,
        functionName: 'getPoolIdForToken',
        args: [tokenAddress],
      })

      // Read on-chain state: tax, epoch, graduated, mcap
      const [taxBps, epoch, graduated, mcapRaw] = await Promise.all([
        publicClient.readContract({
          address: CONTRACTS.HOOK as Address,
          abi: HOOK_READ_ABI,
          functionName: 'getCurrentTax',
          args: [poolId],
        }),
        publicClient.readContract({
          address: CONTRACTS.HOOK as Address,
          abi: HOOK_READ_ABI,
          functionName: 'getCurrentEpoch',
          args: [poolId],
        }),
        publicClient.readContract({
          address: CONTRACTS.HOOK as Address,
          abi: HOOK_READ_ABI,
          functionName: 'isGraduated',
          args: [poolId],
        }),
        publicClient.readContract({
          address: CONTRACTS.HOOK as Address,
          abi: HOOK_READ_ABI,
          functionName: 'getCurrentMcap',
          args: [poolId],
        }),
      ])

      const taxBpsNum = Number(taxBps)
      const mcapETH = Number(formatEther(mcapRaw as bigint))
      
      // Simple quote: price = mcap / totalSupply (1B tokens)
      // For a real quote, we'd simulate through the AMM curve,
      // but spot price * (1 - tax) is a good estimate for small trades
      const pricePerTokenETH = mcapETH / 1_000_000_000

      let estimatedOutput: bigint
      if (isBuy) {
        // Buying: input is ETH, output is tokens
        const ethIn = parseFloat(inputAmount)
        const grossTokens = ethIn / pricePerTokenETH
        const netTokens = grossTokens * (1 - taxBpsNum / 10000)
        estimatedOutput = BigInt(Math.floor(netTokens * 1e18))
      } else {
        // Selling: input is tokens, output is ETH
        const tokensIn = parseFloat(inputAmount)
        const grossETH = tokensIn * pricePerTokenETH
        const netETH = grossETH * (1 - taxBpsNum / 10000)
        estimatedOutput = BigInt(Math.floor(netETH * 1e18))
      }

      // Price impact estimate (simplified: input / pool_liquidity)
      const poolLiquidityETH = mcapETH // rough approximation
      const inputETH = isBuy ? parseFloat(inputAmount) : parseFloat(inputAmount) * pricePerTokenETH
      const priceImpact = poolLiquidityETH > 0 ? (inputETH / poolLiquidityETH) * 100 : 0

      setQuote({
        estimatedOutput,
        priceImpact: Math.min(priceImpact, 99),
        currentTaxBps: taxBpsNum,
        currentEpoch: Number(epoch),
        isGraduated: graduated as boolean,
        mcapETH: mcapETH.toFixed(4),
        pricePerToken: pricePerTokenETH.toFixed(12),
      })
    } catch (err) {
      console.error('Quote fetch error:', err)
      setQuote(null)
    } finally {
      setIsLoading(false)
    }
  }, [tokenAddress, isBuy, inputAmount, publicClient])

  useEffect(() => {
    const timer = setTimeout(fetchQuote, 300) // debounce
    return () => clearTimeout(timer)
  }, [fetchQuote])

  return { quote, isLoading }
}
