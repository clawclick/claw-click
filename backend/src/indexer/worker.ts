import { createPublicClient, webSocket, http, parseAbiItem, formatEther } from 'viem'
import { sepolia } from 'viem/chains'
import { query } from '../db/client'
import dotenv from 'dotenv'

dotenv.config()

const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS as `0x${string}`
const HOOK_ADDRESS = process.env.HOOK_ADDRESS as `0x${string}`

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
          formatEther(targetMcapETH),
          formatEther(targetMcapETH), // Start at target MCAP
          sqrtPriceX96?.toString() || '0',
        ])
        
        // Update total tokens count
        await query(`
          UPDATE stats SET 
            total_tokens = total_tokens + 1,
            updated_at = NOW()
          WHERE id = 1
        `)
        
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
        const feeInEth = isETH ? formatEther(totalFee) : '0'
        
        console.log(`💰 Swap detected on ${tokenAddress}: ${feeInEth} ETH fee`)
        
        // Update token volume (fees * 100 to get swap amount at 1% fee)
        const swapVolume = parseFloat(feeInEth) * 100
        
        await query(`
          UPDATE tokens SET
            volume_24h = volume_24h + $1,
            volume_total = volume_total + $1,
            tx_count_24h = tx_count_24h + 1,
            tx_count_total = tx_count_total + 1,
            updated_at = NOW()
          WHERE address = $2
        `, [swapVolume, tokenAddress])
        
        // Update platform stats
        await query(`
          UPDATE stats SET
            total_volume_eth = total_volume_eth + $1,
            total_volume_24h = total_volume_24h + $1,
            total_txs = total_txs + 1,
            total_txs_24h = total_txs_24h + 1,
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
        `, [formatEther(finalMcap), token])
        
      } catch (error) {
        console.error('Error processing Graduated event:', error)
      }
    }
  },
  pollingInterval: 1000
})

console.log('✅ Event indexer is running!')
console.log('📊 Watching for events...')

// Keep process alive
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down indexer...')
  process.exit(0)
})
