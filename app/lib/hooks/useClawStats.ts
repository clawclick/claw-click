import { useState, useEffect } from 'react'
import { createPublicClient, http, formatEther } from 'viem'
import { sepolia } from 'viem/chains'
import { CONTRACTS } from '../contracts'
import { queryEventsInChunks } from '../utils/queryEvents'
import { formatLargeNumber } from '../utils/formatNumber'
import FactoryABI from '../../src/abis/factory.json'
import HookABI from '../../src/abis/hook.json'

export interface ClawStats {
  tokensLaunched: number
  totalVolume: string
  feesGenerated: string
  totalMarketCap: string
  isLoading: boolean
}

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
})

export function useClawStats() {
  const [stats, setStats] = useState<ClawStats>({
    tokensLaunched: 0,
    totalVolume: '$0',
    feesGenerated: '$0',
    totalMarketCap: '$0',
    isLoading: true,
  })

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      // Get current block
      const currentBlock = await publicClient.getBlockNumber()
      // Query last 1500 blocks (~5 hours on Sepolia, within Alchemy limits)
      const fromBlock = currentBlock > 1500n ? currentBlock - 1500n : 0n
      
      console.log(`Fetching events from block ${fromBlock} to ${currentBlock}`)
      
      // Get all LaunchCreated events
      const launchEvents = await publicClient.getContractEvents({
        address: CONTRACTS.FACTORY as `0x${string}`,
        abi: FactoryABI,
        eventName: 'LaunchCreated',
        fromBlock,
        toBlock: 'latest',
      })
      
      console.log(`Found ${launchEvents.length} LaunchCreated events`)

      const tokensLaunched = launchEvents.length

      // Calculate total volume from SwapExecuted events
      let totalVolumeWei = 0n
      let totalFeesWei = 0n
      let totalMarketCapWei = 0n

      for (const launch of launchEvents) {
        // Extract poolId from event
        const poolId = (launch as any).args?.poolId
        if (!poolId) continue
        
        try {
          // Get swap events for this pool
          const swapEvents = await publicClient.getContractEvents({
            address: CONTRACTS.HOOK as `0x${string}`,
            abi: HookABI,
            eventName: 'SwapExecuted',
            args: { poolId },
            fromBlock,
            toBlock: 'latest',
          })

          for (const swap of swapEvents) {
            // Extract swap data from event
            const swapArgs = (swap as any).args
            if (!swapArgs) continue
            
            const feeAmount = swapArgs.feeAmount
            const isETHFee = swapArgs.isETHFee
            
            if (isETHFee && feeAmount) {
              totalFeesWei += BigInt(feeAmount)
              // Approximate volume (fee / tax rate)
              const taxBps = swapArgs.taxBps
              if (taxBps && taxBps > 0) {
                const volume = (BigInt(feeAmount) * 10000n) / BigInt(taxBps)
                totalVolumeWei += volume
              }
            }
          }

          // Get current MCAP for this pool
          try {
            const mcap = await publicClient.readContract({
              address: CONTRACTS.HOOK as `0x${string}`,
              abi: HookABI,
              functionName: 'getCurrentMcap',
              args: [poolId],
            }) as bigint
            totalMarketCapWei += mcap
          } catch (e) {
            // Pool might not exist yet
          }
        } catch (error) {
          console.error('Error fetching pool data:', error)
        }
      }

      // Convert to USD (assuming ETH = $2000 for now, will need price feed later)
      const ETH_PRICE = 2000
      const totalVolumeETH = parseFloat(formatEther(totalVolumeWei))
      const totalFeesETH = parseFloat(formatEther(totalFeesWei))
      const totalMarketCapETH = parseFloat(formatEther(totalMarketCapWei))

      setStats({
        tokensLaunched,
        totalVolume: formatLargeNumber(totalVolumeETH * ETH_PRICE),
        feesGenerated: formatLargeNumber(totalFeesETH * ETH_PRICE),
        totalMarketCap: formatLargeNumber(totalMarketCapETH * ETH_PRICE),
        isLoading: false,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
      setStats(prev => ({ ...prev, isLoading: false }))
    }
  }

  return stats
}
