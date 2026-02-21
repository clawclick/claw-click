import { createPublicClient, webSocket, http, parseAbiItem, formatEther } from 'viem'
import { sepolia } from 'viem/chains'
import { query } from '../db/client'
import dotenv from 'dotenv'

dotenv.config()

const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS as `0x${string}`
const HOOK_ADDRESS = process.env.HOOK_ADDRESS as `0x${string}`
const POOL_MANAGER_ADDRESS = (process.env.POOL_MANAGER_ADDRESS || '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543') as `0x${string}`

// In-memory set of known pool IDs (loaded from DB on startup, updated on new launches)
const knownPoolIds = new Set<string>()

const TOTAL_SUPPLY = 1_000_000_000n // 1B tokens

// Convert sqrtPriceX96 to human-readable price (ETH per token) and mcap
//
// Pool layout (from ClawclickFactory.sol):
//   currency0 = native ETH (address(0)) — always sorts lower
//   currency1 = meme token
//
// sqrtPriceX96 encodes currency1/currency0 = tokens per ETH
// We want ETH per token = 1 / (tokens per ETH) = 1 / (sqrtPrice^2 / 2^192)
//                        = 2^192 / sqrtPrice^2
function sqrtPriceToMcap(sqrtPriceX96: bigint): { price: string; mcap: string } {
  const Q96 = 2n ** 96n
  const PRECISION = 10n ** 18n
  
  // tokensPerEth = sqrtPriceX96^2 / 2^192 (raw, both 18 decimals so no decimal adjustment)
  // ethPerToken = 2^192 / sqrtPriceX96^2
  // Scale by 1e18 for precision: ethPerToken = (2^192 * 1e18) / sqrtPriceX96^2
  const sqrtPriceSq = sqrtPriceX96 * sqrtPriceX96
  const ethPerToken = (Q96 * Q96 * PRECISION) / sqrtPriceSq
  
  // mcap = ethPerToken * totalSupply / 1e18
  const mcapWei = (ethPerToken * TOTAL_SUPPLY) / PRECISION
  
  return {
    price: formatEther(ethPerToken),
    mcap: formatEther(mcapWei)
  }
}

// Create client with WebSocket for event listening
const client = createPublicClient({
  chain: sepolia,
  transport: process.env.INFURA_PROJECT_ID 
    ? webSocket(`wss://sepolia.infura.io/ws/v3/${process.env.INFURA_PROJECT_ID}`)
    : http(`https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`)
})

console.log('🚀 Claw.Click Event Indexer Starting...')
console.log(`📡 Factory: ${FACTORY_ADDRESS}`)
console.log(`📡 Hook: ${HOOK_ADDRESS}`)
console.log(`📡 PoolManager: ${POOL_MANAGER_ADDRESS}`)

// Load known pool IDs from DB on startup
async function loadKnownPoolIds() {
  try {
    const result = await query('SELECT pool_id FROM tokens')
    for (const row of result.rows) {
      knownPoolIds.add(row.pool_id.toLowerCase())
    }
    console.log(`📋 Loaded ${knownPoolIds.size} known pool IDs from database`)
  } catch (error) {
    console.error('Failed to load pool IDs from database:', error)
  }
}

loadKnownPoolIds()

// ============================================================================
// TOKEN LAUNCHED EVENT
// ============================================================================
const tokenLaunchedABI = parseAbiItem(
  'event TokenLaunched(address indexed token, address indexed beneficiary, address indexed creator, bytes32 poolId, uint256 targetMcapETH, uint160 sqrtPriceX96, string name, string symbol)'
)

client.watchEvent({
  address: FACTORY_ADDRESS,
  event: tokenLaunchedABI,
  onLogs: async (logs) => {
    for (const log of logs) {
      try {
        const { token, beneficiary, creator, poolId, targetMcapETH, sqrtPriceX96, name, symbol } = log.args
        
        console.log(`🆕 New token launched: ${symbol} (${token})`)
        
        await query(`
          INSERT INTO tokens (
            address, name, symbol, creator, beneficiary, pool_id,
            target_mcap, current_mcap, sqrt_price_x96, launched_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          ON CONFLICT (address) DO NOTHING
        `, [
          token,
          name,
          symbol,
          creator,
          beneficiary,
          poolId,
          formatEther(targetMcapETH ?? 0n),
          formatEther(targetMcapETH ?? 0n), // Start at target MCAP
          sqrtPriceX96?.toString() || '0',
        ])
        
        // Update total tokens count
        await query(`
          UPDATE stats SET 
            total_tokens = total_tokens + 1,
            updated_at = NOW()
          WHERE id = 1
        `)
        
        // Add to in-memory cache so Swap listener picks it up immediately
        if (poolId) {
          knownPoolIds.add((poolId as string).toLowerCase())
          console.log(`📋 Added pool ${poolId} to known pool set (total: ${knownPoolIds.size})`)
        }
        
        console.log(`✅ Saved ${symbol} to database`)
      } catch (error) {
        console.error('Error processing TokenLaunched event:', error)
      }
    }
  },
  pollingInterval: 1000
})

// ============================================================================
// FEES COLLECTED EVENT (for swap tracking)
// ============================================================================
const feesCollectedABI = parseAbiItem(
  'event FeesCollected(bytes32 indexed poolId, uint256 totalFee, uint256 beneficiaryShare, uint256 platformShare, bool isETH)'
)

client.watchEvent({
  address: HOOK_ADDRESS,
  event: feesCollectedABI,
  onLogs: async (logs) => {
    for (const log of logs) {
      try {
        const { poolId, totalFee, isETH } = log.args
        
        // Get token address from poolId
        const tokenResult = await query(`
          SELECT address FROM tokens WHERE pool_id = $1
        `, [poolId])
        
        if (tokenResult.rows.length === 0) continue
        
        const tokenAddress = tokenResult.rows[0].address
        const feeInEth = isETH ? formatEther(totalFee ?? 0n) : '0'
        
        console.log(`💰 Fee collected on ${tokenAddress}: ${feeInEth} ETH`)
        
        // Only update all-time totals here.
        // 24h stats are recomputed from the swaps table by refresh24hStats()
        const swapVolume = parseFloat(feeInEth) * 100
        
        await query(`
          UPDATE tokens SET
            volume_total = volume_total + $1,
            tx_count_total = tx_count_total + 1,
            updated_at = NOW()
          WHERE address = $2
        `, [swapVolume, tokenAddress])
        
        await query(`
          UPDATE stats SET
            total_volume_eth = total_volume_eth + $1,
            total_txs = total_txs + 1,
            updated_at = NOW()
          WHERE id = 1
        `, [swapVolume])
        
      } catch (error) {
        console.error('Error processing FeesCollected event:', error)
      }
    }
  },
  pollingInterval: 1000
})

// ============================================================================
// GRADUATED EVENT
// ============================================================================
const graduatedABI = parseAbiItem(
  'event Graduated(address indexed token, bytes32 indexed poolId, uint256 timestamp, uint256 finalMcap)'
)

client.watchEvent({
  address: HOOK_ADDRESS,
  event: graduatedABI,
  onLogs: async (logs) => {
    for (const log of logs) {
      try {
        const { token, finalMcap } = log.args
        
        console.log(`🎓 Token graduated: ${token}`)
        
        await query(`
          UPDATE tokens SET
            graduated = true,
            graduated_at = NOW(),
            current_mcap = $1,
            updated_at = NOW()
          WHERE address = $2
        `, [formatEther(finalMcap ?? 0n), token])
        
      } catch (error) {
        console.error('Error processing Graduated event:', error)
      }
    }
  },
  pollingInterval: 1000
})

// ============================================================================
// POOL MANAGER SWAP EVENT — track price & mcap from sqrtPriceX96
// ============================================================================
const swapEventABI = parseAbiItem(
  'event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)'
)

client.watchEvent({
  address: POOL_MANAGER_ADDRESS,
  event: swapEventABI,
  onLogs: async (logs) => {
    for (const log of logs) {
      try {
        const { id: poolId, sender, sqrtPriceX96, amount0, amount1 } = log.args
        if (!poolId || !sqrtPriceX96) continue
        
        // Filter: only process swaps on our pools
        if (!knownPoolIds.has(poolId.toLowerCase())) continue
        
        const { price, mcap } = sqrtPriceToMcap(sqrtPriceX96)
        // ETH is currency0: amount0 > 0 means pool received ETH = user buying token
        const isBuy = (amount0 ?? 0n) > 0n
        
        // Compute amounts: absolute values in ETH terms
        const absAmount0 = (amount0 ?? 0n) < 0n ? -(amount0 ?? 0n) : (amount0 ?? 0n)
        const absAmount1 = (amount1 ?? 0n) < 0n ? -(amount1 ?? 0n) : (amount1 ?? 0n)
        
        const txHash = log.transactionHash || '0x'
        const blockNumber = log.blockNumber || 0n
        const logIndex = log.logIndex ?? 0
        
        console.log(`📈 Swap on pool ${poolId.slice(0, 10)}... | mcap: ${mcap} ETH | buy: ${isBuy}`)
        
        // Update token price & mcap
        await query(`
          UPDATE tokens SET
            current_price = $1,
            current_mcap = $2,
            sqrt_price_x96 = $3,
            updated_at = NOW()
          WHERE pool_id = $4
        `, [price, mcap, sqrtPriceX96.toString(), poolId])
        
        // Look up token address for this pool
        const tokenResult = await query(
          'SELECT address FROM tokens WHERE pool_id = $1', [poolId]
        )
        if (tokenResult.rows.length === 0) continue
        const tokenAddress = tokenResult.rows[0].address
        
        // Insert into swaps table
        await query(`
          INSERT INTO swaps (
            pool_id, token_address, trader,
            amount_in, amount_out, is_buy,
            tx_hash, log_index, block_number, timestamp
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          ON CONFLICT (tx_hash, log_index) DO NOTHING
        `, [
          poolId,
          tokenAddress,
          sender || '0x',
          formatEther(isBuy ? absAmount0 : absAmount1),  // what user spent
          formatEther(isBuy ? absAmount1 : absAmount0),  // what user received
          isBuy,
          txHash,
          logIndex,
          Number(blockNumber)
        ])
        
      } catch (error) {
        console.error('Error processing PoolManager Swap event:', error)
      }
    }
  },
  pollingInterval: 1000
})

// ============================================================================
// 24H STATS REFRESH — recompute from actual swap data every 5 minutes
// ============================================================================
async function refresh24hStats() {
  try {
    // Per-token 24h stats from swaps table
    await query(`
      UPDATE tokens t SET
        volume_24h = COALESCE(s.vol, 0),
        tx_count_24h = COALESCE(s.txs, 0),
        buys_24h = COALESCE(s.buys, 0),
        sells_24h = COALESCE(s.sells, 0)
      FROM (
        SELECT 
          token_address,
          SUM(amount_in) as vol,
          COUNT(*) as txs,
          COUNT(*) FILTER (WHERE is_buy = true) as buys,
          COUNT(*) FILTER (WHERE is_buy = false) as sells
        FROM swaps
        WHERE timestamp > NOW() - INTERVAL '24 hours'
        GROUP BY token_address
      ) s
      WHERE t.address = s.token_address
    `)
    
    // Zero out tokens with no swaps in 24h
    await query(`
      UPDATE tokens SET
        volume_24h = 0, tx_count_24h = 0, buys_24h = 0, sells_24h = 0
      WHERE address NOT IN (
        SELECT DISTINCT token_address FROM swaps
        WHERE timestamp > NOW() - INTERVAL '24 hours'
      )
    `)
    
    // Platform-wide 24h stats
    await query(`
      UPDATE stats SET
        total_volume_24h = COALESCE((SELECT SUM(amount_in) FROM swaps WHERE timestamp > NOW() - INTERVAL '24 hours'), 0),
        total_txs_24h = COALESCE((SELECT COUNT(*) FROM swaps WHERE timestamp > NOW() - INTERVAL '24 hours'), 0),
        updated_at = NOW()
      WHERE id = 1
    `)
    
    console.log('🔄 24h stats refreshed from swap data')
  } catch (error) {
    console.error('Error refreshing 24h stats:', error)
  }
}

// Run every 5 minutes
setInterval(refresh24hStats, 5 * 60 * 1000)
// Run once on startup after a short delay (let DB connect first)
setTimeout(refresh24hStats, 10_000)

console.log('✅ Event indexer is running!')
console.log('📊 Watching for events...')

// Keep process alive
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down indexer...')
  process.exit(0)
})
