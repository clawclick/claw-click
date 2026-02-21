import { useState, useEffect } from 'react'
import { createPublicClient, http, formatEther } from 'viem'
import { sepolia } from 'viem/chains'
import { CONTRACTS } from '../contracts'
import FactoryABI from '../../src/abis/ClawclickFactory.json'
import HookABI from '../../src/abis/ClawclickHook.json'

export interface ClawStats {
  tokensLaunched: number
  totalVolume: string
  feesGenerated: string
  totalMarketCap: string
  isLoading: boolean
}

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J'),
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
      // Get all LaunchCreated events
      const launchEvents = await publicClient.getContractEvents({
        address: CONTRACTS.FACTORY as `0x${string}`,
        abi: FactoryABI,
        eventName: 'LaunchCreated',
        fromBlock: 0n,
        toBlock: 'latest',
      })

      const tokensLaunched = launchEvents.length

      // Calculate total volume from SwapExecuted events
      let totalVolumeWei = 0n
      let totalFeesWei = 0n
      let totalMarketCapWei = 0n

      for (const launch of launchEvents) {
        const poolId = (launch.args as any).poolId
        
        try {
          // Get swap events for this pool
          const swapEvents = await publicClient.getContractEvents({
            address: CONTRACTS.HOOK as `0x${string}`,
            abi: HookABI,
            eventName: 'SwapExecuted',
            args: { poolId },
            fromBlock: 0n,
            toBlock: 'latest',
          })

          for (const swap of swapEvents) {
            const args = swap.args as any
            const feeAmount = args.feeAmount
            const isETHFee = args.isETHFee
            
            if (isETHFee) {
              totalFeesWei += feeAmount
              // Approximate volume (fee / tax rate)
              const taxBps = args.taxBps
              if (taxBps > 0) {
                const volume = (feeAmount * 10000n) / taxBps
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
        totalVolume: `$${(totalVolumeETH * ETH_PRICE).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
        feesGenerated: `$${(totalFeesETH * ETH_PRICE).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
        totalMarketCap: `$${(totalMarketCapETH * ETH_PRICE).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
        isLoading: false,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
      setStats(prev => ({ ...prev, isLoading: false }))
    }
  }

  return stats
}
