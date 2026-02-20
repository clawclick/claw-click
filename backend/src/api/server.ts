import express from 'express'
import cors from 'cors'
import { query } from '../db/client'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// ============================================================================
// PLATFORM STATS
// ============================================================================
app.get('/api/stats', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        total_tokens,
        total_volume_eth,
        total_volume_24h,
        total_txs,
        total_txs_24h,
        updated_at
      FROM stats
      WHERE id = 1
    `)
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching stats:', error)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// ============================================================================
// TOKENS LIST
// ============================================================================
app.get('/api/tokens', async (req, res) => {
  try {
    const { 
      sort = 'new',
      limit = 20,
      offset = 0,
      search = ''
    } = req.query
    
    let orderBy = 'launched_at DESC'
    if (sort === 'hot') orderBy = 'volume_24h DESC'
    if (sort === 'mcap') orderBy = 'current_mcap DESC NULLS LAST'
    if (sort === 'volume') orderBy = 'volume_total DESC'
    
    let whereClause = 'WHERE 1=1'
    const params: any[] = []
    
    if (search) {
      whereClause += ` AND (LOWER(name) LIKE $${params.length + 1} OR LOWER(symbol) LIKE $${params.length + 1} OR LOWER(address) LIKE $${params.length + 1})`
      params.push(`%${search.toString().toLowerCase()}%`)
    }
    
    params.push(limit, offset)
    
    const result = await query(`
      SELECT 
        address, name, symbol, creator, beneficiary,
        current_price, current_mcap, target_mcap,
        volume_24h, volume_total,
        price_change_24h,
        tx_count_24h, tx_count_total,
        buys_24h, sells_24h,
        graduated, launched_at,
        current_epoch, current_position
      FROM tokens
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params)
    
    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total FROM tokens ${whereClause}
    `, params.slice(0, -2))
    
    res.json({
      tokens: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    })
  } catch (error) {
    console.error('Error fetching tokens:', error)
    res.status(500).json({ error: 'Failed to fetch tokens' })
  }
})

// ============================================================================
// SINGLE TOKEN DETAILS
// ============================================================================
app.get('/api/token/:address', async (req, res) => {
  try {
    const { address } = req.params
    
    const tokenResult = await query(`
      SELECT * FROM tokens WHERE LOWER(address) = LOWER($1)
    `, [address])
    
    if (tokenResult.rows.length === 0) {
      return res.status(404).json({ error: 'Token not found' })
    }
    
    // Get recent swaps
    const swapsResult = await query(`
      SELECT 
        trader, amount_in, amount_out, is_buy,
        fee_amount, tax_bps, tx_hash, block_number, timestamp
      FROM swaps
      WHERE LOWER(token_address) = LOWER($1)
      ORDER BY timestamp DESC
      LIMIT 50
    `, [address])
    
    res.json({
      token: tokenResult.rows[0],
      recentSwaps: swapsResult.rows
    })
  } catch (error) {
    console.error('Error fetching token:', error)
    res.status(500).json({ error: 'Failed to fetch token details' })
  }
})

// ============================================================================
// TRENDING TOKENS
// ============================================================================
app.get('/api/tokens/trending', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        address, name, symbol, current_price, current_mcap,
        volume_24h, price_change_24h, tx_count_24h
      FROM tokens
      WHERE launched_at > NOW() - INTERVAL '7 days'
      ORDER BY volume_24h DESC
      LIMIT 10
    `)
    
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching trending:', error)
    res.status(500).json({ error: 'Failed to fetch trending tokens' })
  }
})

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get('/health', async (req, res) => {
  try {
    await query('SELECT 1')
    res.json({ status: 'healthy', timestamp: new Date().toISOString() })
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: String(error) })
  }
})

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
  console.log(`📡 Stats endpoint: http://localhost:${PORT}/api/stats`)
})

export default app
