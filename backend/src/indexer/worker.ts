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
  
  // mcap = ethPerToken * totalSupply (ethPerToken already scaled by 1e18)
  const mcapWei = ethPerToken * TOTAL_SUPPLY
  
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
// ONE-TIME DATA FIXUP — correct mcap from stored sqrt_price_x96
// ============================================================================
async function fixupExistingData() {
  try {
    // Recalculate current_mcap from stored sqrt_price_x96 for all tokens
    const tokens = await query('SELECT address, sqrt_price_x96 FROM tokens WHERE sqrt_price_x96 IS NOT NULL AND sqrt_price_x96 != \'0\'')
    for (const row of tokens.rows) {
      const sqrtPriceX96 = BigInt(row.sqrt_price_x96)
      const { price, mcap } = sqrtPriceToMcap(sqrtPriceX96)
      await query('UPDATE tokens SET current_mcap = $1, current_price = $2 WHERE address = $3', [mcap, price, row.address])
    }
    console.log(`🔧 Fixup: recalculated mcap for ${tokens.rows.length} tokens`)
  } catch (error) {
    console.error('Fixup failed (non-fatal):', error)
  }
}

// Run fixup once on startup
fixupExistingData()

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
        
        // Read agentWallet from the deployed token contract
        // Then verify with claws.fun NFT check to determine if it's a real agent
        let agentWallet: string | null = null
        let isAgent = false
        try {
          const wallet = await client.readContract({
            address: token as `0x${string}`,
            abi: [{ name: 'agentWallet', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] }],
            functionName: 'agentWallet',
          }) as string
          if (wallet && wallet !== '0x0000000000000000000000000000000000000000') {
            agentWallet = wallet
            // Verify agent wallet holds a claws.fun NFT
            try {
              const nftRes = await fetch(`https://claws-fun-backend-764a4f25b49e.herokuapp.com/api/nft/${wallet}`)
              if (nftRes.ok) {
                const nftData = await nftRes.json() as { hasNFT: boolean; nftId: number }
                if (nftData.hasNFT) {
                  isAgent = true
                  console.log(`🤖 Agent token detected! agentWallet: ${wallet}, nftId: ${nftData.nftId}`)
                } else {
                  console.log(`👤 agentWallet ${wallet} has no NFT — not an agent`)
                }
              }
            } catch (nftErr) {
              console.error(`⚠️ NFT check failed for ${wallet}:`, nftErr)
            }
          }
        } catch { /* older tokens may not have agentWallet() */ }
        
        await query(`
          INSERT INTO tokens (
            address, name, symbol, creator, beneficiary, pool_id,
            target_mcap, current_mcap, sqrt_price_x96, agent_wallet, is_agent, launched_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
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
          agentWallet,
          isAgent,
        ])
        
        // Update total tokens count (and agent count if applicable)
        if (isAgent) {
          await query(`
            UPDATE stats SET 
              total_tokens = total_tokens + 1,
              total_agents = total_agents + 1,
              updated_at = NOW()
            WHERE id = 1
          `)
        } else {
          await query(`
            UPDATE stats SET 
              total_tokens = total_tokens + 1,
              updated_at = NOW()
            WHERE id = 1
          `)
        }
        
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
            total_fees_eth = total_fees_eth + $2,
            total_txs = total_txs + 1,
            updated_at = NOW()
          WHERE id = 1
        `, [swapVolume, feeInEth])
        
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
        // V4 Swap event: amounts are from the SWAPPER's perspective (negative = paid, positive = received)
        // amount0 < 0 means swapper PAID ETH (currency0) = BUY tokens
        // amount0 > 0 means swapper RECEIVED ETH (currency0) = SELL tokens
        const isBuy = (amount0 ?? 0n) < 0n
        
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
        
        // Insert into swaps table (with price snapshot for 24h change calc)
        await query(`
          INSERT INTO swaps (
            pool_id, token_address, trader,
            amount_in, amount_out, is_buy,
            price_at_swap,
            tx_hash, log_index, block_number, timestamp
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
          ON CONFLICT (tx_hash, log_index) DO NOTHING
        `, [
          poolId,
          tokenAddress,
          sender || '0x',
          formatEther(isBuy ? absAmount0 : absAmount1),  // what user spent
          formatEther(isBuy ? absAmount1 : absAmount0),  // what user received
          isBuy,
          price,  // snapshot price at this swap
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
          SUM(CASE WHEN is_buy THEN amount_in ELSE amount_out END) as vol,
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
        volume_24h = 0, tx_count_24h = 0, buys_24h = 0, sells_24h = 0,
        price_change_24h = 0
      WHERE address NOT IN (
        SELECT DISTINCT token_address FROM swaps
        WHERE timestamp > NOW() - INTERVAL '24 hours'
      )
    `)

    // Compute price_change_24h: compare current price to the earliest swap price within 24h window
    await query(`
      UPDATE tokens t SET
        price_change_24h = CASE
          WHEN p.old_price IS NULL OR p.old_price = 0 THEN 0
          ELSE ROUND(((t.current_price - p.old_price) / p.old_price) * 100, 2)
        END
      FROM (
        SELECT DISTINCT ON (token_address)
          token_address,
          price_at_swap as old_price
        FROM swaps
        WHERE timestamp > NOW() - INTERVAL '24 hours'
          AND price_at_swap IS NOT NULL
          AND price_at_swap > 0
        ORDER BY token_address, timestamp ASC
      ) p
      WHERE t.address = p.token_address
    `)
    
    // Platform-wide 24h stats
    await query(`
      UPDATE stats SET
        total_volume_24h = COALESCE((SELECT SUM(CASE WHEN is_buy THEN amount_in ELSE amount_out END) FROM swaps WHERE timestamp > NOW() - INTERVAL '24 hours'), 0),
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
