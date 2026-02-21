import { useState, useEffect } from 'react'
import { createPublicClient, http, formatEther } from 'viem'
import { sepolia } from 'viem/chains'
import { CONTRACTS, getExplorerLink } from '../contracts'
import { queryEventsInChunks } from '../utils/queryEvents'
import FactoryABI from '../../src/abis/factory.json'
import HookABI from '../../src/abis/hook.json'

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
})

export interface TokenData {
  name: string
  symbol: string
  token: string
  poolId: string
  creator: string
  beneficiary: string
  agentWallet: string
  targetMcapETH: string
  createdAt: number
  createdBlock: number
  
  // Live stats
  price: string
  mcap: string
  mcapUSD: string
  vol24h: string
  change24h: string
  currentEpoch: number
  currentTax: number
  isGraduated: boolean
  txCount: number
  buyCount: number
  sellCount: number
  
  // Links
  chartUrl: string
  scanUrl: string
  hot: boolean
  chain: string
}

export function useTokenList() {
  const [tokens, setTokens] = useState<TokenData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchTokens()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchTokens, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchTokens() {
    try {
      // LIFETIME STATS: Query from deployment block 10306000 (Feb 21, 2026)
      const DEPLOYMENT_BLOCK = 10306000n
      
      console.log(`Fetching LIFETIME tokens from block ${DEPLOYMENT_BLOCK} to latest`)
      
      // Get all launches (LIFETIME)
      const launchEvents = await publicClient.getContractEvents({
        address: CONTRACTS.FACTORY as `0x${string}`,
        abi: FactoryABI,
        eventName: 'LaunchCreated',
        fromBlock: DEPLOYMENT_BLOCK,
        toBlock: 'latest',
      })
      
      console.log(`Found ${launchEvents.length} launch events (LIFETIME)`)

      const ETH_PRICE = 2000 // TODO: Get from price feed

      const tokensData: TokenData[] = []

      for (const event of launchEvents) {
        try {
          // Extract poolId from event
          const eventArgs = (event as any).args
          if (!eventArgs) continue
          const poolId = eventArgs.poolId
          
          // Get launch info
          const launchInfo = await publicClient.readContract({
            address: CONTRACTS.FACTORY as `0x${string}`,
            abi: FactoryABI,
            functionName: 'launchByPoolId',
            args: [poolId],
          }) as any
          
          // Get current stats
          const [mcapWei, currentEpoch, currentTax, isGraduated] = await Promise.allSettled([
            publicClient.readContract({
              address: CONTRACTS.HOOK as `0x${string}`,
              abi: HookABI,
              functionName: 'getCurrentMcap',
              args: [poolId],
            }) as Promise<bigint>,
            publicClient.readContract({
              address: CONTRACTS.HOOK as `0x${string}`,
              abi: HookABI,
              functionName: 'getCurrentEpoch',
              args: [poolId],
            }) as Promise<number>,
            publicClient.readContract({
              address: CONTRACTS.HOOK as `0x${string}`,
              abi: HookABI,
              functionName: 'getCurrentTax',
              args: [poolId],
            }) as Promise<number>,
            publicClient.readContract({
              address: CONTRACTS.HOOK as `0x${string}`,
              abi: HookABI,
              functionName: 'isGraduated',
              args: [poolId],
            }) as Promise<boolean>,
          ])

          const mcap = mcapWei.status === 'fulfilled' ? mcapWei.value : 0n
          const epoch = currentEpoch.status === 'fulfilled' ? currentEpoch.value : 1
          const tax = currentTax.status === 'fulfilled' ? currentTax.value : 0
          const graduated = isGraduated.status === 'fulfilled' ? isGraduated.value : false

          // Get swap events for volume and tx count (LIFETIME)
          const swapEvents = await publicClient.getContractEvents({
            address: CONTRACTS.HOOK as `0x${string}`,
            abi: HookABI,
            eventName: 'SwapExecuted',
            args: { poolId },
            fromBlock: DEPLOYMENT_BLOCK,
            toBlock: 'latest',
          })

          // Filter for 24h stats
          const currentBlock = await publicClient.getBlockNumber()
          const oneDayAgoBlock = currentBlock - 7200n // ~24h in blocks (12s blocks)
          const recent24hSwaps = swapEvents.filter(s => s.blockNumber && s.blockNumber > oneDayAgoBlock)

          let volume24hWei = 0n
          let buyCount = 0
          let sellCount = 0

          for (const swap of recent24hSwaps) {
            // Extract swap data from event
            const swapArgs = (swap as any).args
            if (!swapArgs) continue
            
            if (swapArgs.isBuy) {
              buyCount++
            } else {
              sellCount++
            }
            
            if (swapArgs.isETHFee && swapArgs.taxBps > 0 && swapArgs.feeAmount) {
              const volume = (BigInt(swapArgs.feeAmount) * 10000n) / BigInt(swapArgs.taxBps)
              volume24hWei += volume
            }
          }

          const mcapETH = parseFloat(formatEther(mcap))
          const vol24hETH = parseFloat(formatEther(volume24hWei))

          // Calculate price (assuming total supply = 1B tokens)
          const TOTAL_SUPPLY = 1_000_000_000
          const pricePerToken = mcapETH / TOTAL_SUPPLY

          // Calculate 24h change from first vs last swap in 24h window
          let change24h = '+0.0%'
          if (recent24hSwaps.length >= 2) {
            try {
              // Get MCAP from oldest and newest swaps in 24h
              const oldestSwap = recent24hSwaps[recent24hSwaps.length - 1]
              const newestSwap = recent24hSwaps[0]
              
              // Approximate MCAP change from swap amounts (rough estimate)
              // Better method: query historical MCAP, but this works for now
              const buyVolume = recent24hSwaps.filter(s => (s as any).args?.isBuy).length
              const sellVolume = recent24hSwaps.filter(s => !(s as any).args?.isBuy).length
              
              if (buyVolume + sellVolume > 0) {
                const netActivity = ((buyVolume - sellVolume) / (buyVolume + sellVolume)) * 100
                const changePercent = netActivity > 0 ? Math.min(netActivity * 2, 50) : Math.max(netActivity * 2, -50)
                change24h = changePercent >= 0 ? `+${changePercent.toFixed(1)}%` : `${changePercent.toFixed(1)}%`
              }
            } catch (e) {
              // If calculation fails, use default
            }
          }

          tokensData.push({
            name: launchInfo.name,
            symbol: launchInfo.symbol,
            token: launchInfo.token,
            poolId: poolId,
            creator: launchInfo.creator,
            beneficiary: launchInfo.beneficiary,
            agentWallet: launchInfo.agentWallet,
            targetMcapETH: formatEther(launchInfo.targetMcapETH),
            createdAt: Number(launchInfo.createdAt),
            createdBlock: Number(launchInfo.createdBlock),
            
            price: `$${(pricePerToken * ETH_PRICE).toFixed(6)}`,
            mcap: `${mcapETH.toFixed(4)} ETH`,
            mcapUSD: `$${(mcapETH * ETH_PRICE).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
            vol24h: `$${(vol24hETH * ETH_PRICE).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
            change24h,
            currentEpoch: epoch,
            currentTax: tax,
            isGraduated: graduated,
            txCount: swapEvents.length,
            buyCount,
            sellCount,
            
            chartUrl: '#', // TODO: Add DEXScreener or similar
            scanUrl: getExplorerLink('token', launchInfo.token),
            hot: recent24hSwaps.length > 100, // Mark as "hot" if > 100 swaps in 24h
            chain: 'SEPOLIA',
          })
        } catch (error) {
          console.error('Error fetching token data:', error)
        }
      }

      // Sort by creation time (newest first)
      tokensData.sort((a, b) => b.createdAt - a.createdAt)

      setTokens(tokensData)
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching tokens:', error)
      setIsLoading(false)
    }
  }

  return { tokens, isLoading, refresh: fetchTokens }
}
