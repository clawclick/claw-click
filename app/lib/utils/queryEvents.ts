// Utility to query events in chunks for RPC providers with block range limits
import { PublicClient, Log } from 'viem'

interface QueryEventsParams {
  client: PublicClient
  address: `0x${string}`
  abi: any
  eventName: string
  fromBlock: bigint
  toBlock: bigint | 'latest'
  args?: any
  chunkSize?: number
}

/**
 * Query events in chunks to work around RPC block range limits
 * Alchemy free tier: 10 block limit
 * Solution: Query in chunks of 5000 blocks, combine results
 */
export async function queryEventsInChunks({
  client,
  address,
  abi,
  eventName,
  fromBlock,
  toBlock,
  args,
  chunkSize = 5000
}: QueryEventsParams): Promise<Log[]> {
  // Get current block if toBlock is 'latest'
  const endBlock = toBlock === 'latest' 
    ? await client.getBlockNumber()
    : BigInt(toBlock)

  const allEvents: Log[] = []
  let currentFrom = fromBlock

  // Query in chunks
  while (currentFrom <= endBlock) {
    const currentTo = currentFrom + BigInt(chunkSize) > endBlock 
      ? endBlock 
      : currentFrom + BigInt(chunkSize)

    try {
      const events = await client.getContractEvents({
        address,
        abi,
        eventName,
        args,
        fromBlock: currentFrom,
        toBlock: currentTo,
      })

      allEvents.push(...(events as Log[]))
      console.log(`Fetched ${events.length} events from blocks ${currentFrom} to ${currentTo}`)
    } catch (error) {
      console.error(`Error fetching events from ${currentFrom} to ${currentTo}:`, error)
      // Continue with next chunk even if one fails
    }

    currentFrom = currentTo + 1n
    
    // Prevent infinite loop
    if (currentFrom > endBlock) break
  }

  return allEvents
}
