import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { verifyMessage } from 'viem'
import { query } from '../db/client'
import { uploadImage } from '../lib/supabase'
import { getETHPriceSync } from '../lib/ethPrice'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

/** Extract chain_id from query params. Returns null if not specified (= all chains). */
function getChainId(req: express.Request): number | null {
  const qParam = req.query.chain_id
  if (qParam) {
    const parsed = parseInt(qParam as string)
    if (!isNaN(parsed)) return parsed
  }
  return null
}

// Multer: accept logo (max 2MB) and banner (max 5MB) in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per file
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  },
})

// ============================================================================
// PLATFORM STATS
// ============================================================================
app.get('/api/stats', async (req, res) => {
  try {
    const chainId = getChainId(req)
    let result
    if (chainId !== null) {
      result = await query(`
        SELECT 
          s.total_tokens,
          s.total_volume_eth,
          s.total_volume_24h,
          s.total_txs,
          s.total_txs_24h,
          COALESCE(s.total_fees_eth, 0) as total_fees_eth,
          s.updated_at,
          COALESCE(m.total_mcap, 0) as total_market_cap_eth
        FROM stats s
        CROSS JOIN (
          SELECT COALESCE(SUM(current_mcap), 0) as total_mcap FROM tokens WHERE graduated = false AND chain_id = $1
        ) m
        WHERE s.chain_id = $1
      `, [chainId])
    } else {
      result = await query(`
        SELECT 
          COALESCE(SUM(s.total_tokens), 0) as total_tokens,
          COALESCE(SUM(s.total_volume_eth), 0) as total_volume_eth,
          COALESCE(SUM(s.total_volume_24h), 0) as total_volume_24h,
          COALESCE(SUM(s.total_txs), 0) as total_txs,
          COALESCE(SUM(s.total_txs_24h), 0) as total_txs_24h,
          COALESCE(SUM(s.total_fees_eth), 0) as total_fees_eth,
          MAX(s.updated_at) as updated_at,
          COALESCE(m.total_mcap, 0) as total_market_cap_eth
        FROM stats s
        CROSS JOIN (
          SELECT COALESCE(SUM(current_mcap), 0) as total_mcap FROM tokens WHERE graduated = false
        ) m
      `)
    }
    
    res.json({ ...result.rows[0], eth_price_usd: getETHPriceSync() })
  } catch (error) {
    console.error('Error fetching stats:', error)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// ============================================================================
// AGENT-SPECIFIC STATS (for claws.fun)
// ============================================================================
app.get('/api/stats/agents', async (req, res) => {
  try {
    const chainId = getChainId(req)
    const chainFilter = chainId !== null ? 'AND chain_id = $1' : ''
    const params = chainId !== null ? [chainId] : []
    const result = await query(`
      SELECT 
        COUNT(*) as total_agents,
        COALESCE(SUM(current_mcap), 0) as agent_mcap_total,
        COALESCE(SUM(volume_24h), 0) as agent_volume_24h,
        COALESCE(SUM(volume_total), 0) as agent_volume_total
      FROM tokens
      WHERE is_agent = TRUE ${chainFilter}
    `, params)
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching agent stats:', error)
    res.status(500).json({ error: 'Failed to fetch agent stats' })
  }
})

// ============================================================================
// GRADUATED AGENTS COUNT
// ============================================================================
app.get('/api/stats/agents/graduated', async (req, res) => {
  try {
    const chainId = getChainId(req)
    const chainFilter = chainId !== null ? 'AND chain_id = $1' : ''
    const params = chainId !== null ? [chainId] : []
    const result = await query(`
      SELECT COUNT(*) as graduated_agents
      FROM tokens
      WHERE is_agent = TRUE AND graduated = TRUE ${chainFilter}
    `, params)
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching graduated agents:', error)
    res.status(500).json({ error: 'Failed to fetch graduated agents' })
  }
})

// ============================================================================
// AGENT FEED (recent agent tokenizations for claws.fun homepage)
// ============================================================================
app.get('/api/agents/recent', async (req, res) => {
  try {
    const { limit = 10 } = req.query
    const chainId = getChainId(req)
    const chainFilter = chainId !== null ? 'AND chain_id = $2' : ''
    const params = chainId !== null ? [limit, chainId] : [limit]
    
    const result = await query(`
      SELECT 
        address,
        name,
        symbol,
        creator,
        agent_wallet,
        target_mcap,
        current_mcap,
        current_price,
        volume_24h,
        graduated,
        current_epoch,
        logo_url,
        launch_type,
        launched_at
      FROM tokens
      WHERE is_agent = TRUE ${chainFilter}
      ORDER BY launched_at DESC
      LIMIT $1
    `, params)
    
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching recent agents:', error)
    res.status(500).json({ error: 'Failed to fetch recent agents' })
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
      search = '',
      graduated,
      launch_type,
    } = req.query
    const chainId = getChainId(req)
    
    let orderBy = 'launched_at DESC'
    if (sort === 'hot') orderBy = 'volume_24h DESC'
    if (sort === 'mcap') orderBy = 'current_mcap DESC NULLS LAST'
    if (sort === 'volume') orderBy = 'volume_24h DESC'
    if (sort === 'volume_total') orderBy = 'volume_total DESC'
    
    let whereClause = 'WHERE 1=1'
    const params: any[] = []
    if (chainId !== null) {
      params.push(chainId)
      whereClause += ` AND chain_id = $${params.length}`
    }
    
    if (search) {
      whereClause += ` AND (LOWER(name) LIKE $${params.length + 1} OR LOWER(symbol) LIKE $${params.length + 1} OR LOWER(address) LIKE $${params.length + 1})`
      params.push(`%${search.toString().toLowerCase()}%`)
    }

    if (graduated === 'true') {
      whereClause += ' AND graduated = true'
    } else if (graduated === 'false') {
      whereClause += ' AND graduated = false'
    }

    // Filter by launch type: 'direct' or 'agent'
    if (launch_type === 'direct' || launch_type === 'agent') {
      whereClause += ` AND launch_type = $${params.length + 1}`
      params.push(launch_type)
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
        current_epoch, current_position,
        logo_url, banner_url,
        launch_type
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
      offset: parseInt(offset as string),
      eth_price_usd: getETHPriceSync()
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
    const chainId = getChainId(req)
    const chainFilter = chainId !== null ? 'AND chain_id = $2' : ''
    const tokenParams = chainId !== null ? [address, chainId] : [address]
    
    const tokenResult = await query(`
      SELECT * FROM tokens WHERE LOWER(address) = LOWER($1) ${chainFilter}
    `, tokenParams)
    
    if (tokenResult.rows.length === 0) {
      return res.status(404).json({ error: 'Token not found' })
    }
    
    // Get recent swaps
    const swapsResult = await query(`
      SELECT 
        trader, amount_in, amount_out, is_buy,
        fee_amount, tax_bps, tx_hash, block_number, timestamp
      FROM swaps
      WHERE LOWER(token_address) = LOWER($1) ${chainFilter}
      ORDER BY timestamp DESC
      LIMIT 50
    `, tokenParams)
    
    res.json({
      token: tokenResult.rows[0],
      recentSwaps: swapsResult.rows,
      eth_price_usd: getETHPriceSync()
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
    const chainId = getChainId(req)
    const chainFilter = chainId !== null ? 'AND chain_id = $1' : ''
    const params = chainId !== null ? [chainId] : []
    const result = await query(`
      SELECT 
        address, name, symbol, current_price, current_mcap,
        volume_24h, price_change_24h, tx_count_24h,
        logo_url, banner_url, launch_type
      FROM tokens
      WHERE launched_at > NOW() - INTERVAL '7 days' ${chainFilter}
      ORDER BY volume_24h DESC
      LIMIT 10
    `, params)
    
    res.json({ tokens: result.rows, eth_price_usd: getETHPriceSync() })
  } catch (error) {
    console.error('Error fetching trending:', error)
    res.status(500).json({ error: 'Failed to fetch trending tokens' })
  }
})

// ============================================================================
// TOKEN IMAGE UPLOAD (auth via wallet signature)
// ============================================================================

// The agent signs: "clawclick:upload:<tokenAddress>:<timestamp>"
// Timestamp must be within 10 minutes to prevent replay attacks
const SIGNATURE_MAX_AGE_MS = 10 * 60 * 1000

app.post(
  '/api/token/:address/images',
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const tokenAddress = req.params.address
      const { signature, timestamp } = req.body

      // --- Validate inputs ---
      if (!signature || !timestamp) {
        return res.status(400).json({ error: 'Missing signature or timestamp' })
      }

      const ts = parseInt(timestamp)
      if (isNaN(ts) || Math.abs(Date.now() - ts) > SIGNATURE_MAX_AGE_MS) {
        return res.status(401).json({ error: 'Signature expired or invalid timestamp' })
      }

      const files = req.files as { [field: string]: { buffer: Buffer; mimetype: string }[] } | undefined
      if (!files || (!files.logo && !files.banner)) {
        return res.status(400).json({ error: 'No image files provided (logo and/or banner)' })
      }

      // --- Verify token exists and get owner info ---
      const tokenResult = await query(
        'SELECT creator, agent_wallet, beneficiary FROM tokens WHERE LOWER(address) = LOWER($1)',
        [tokenAddress]
      )
      if (tokenResult.rows.length === 0) {
        return res.status(404).json({ error: 'Token not found' })
      }

      const { creator, agent_wallet, beneficiary } = tokenResult.rows[0]

      // --- Verify signature: signer must be creator, agent_wallet, or beneficiary ---
      const message = `clawclick:upload:${tokenAddress.toLowerCase()}:${timestamp}`
      let signer: string
      try {
        const valid = await verifyMessage({
          address: creator as `0x${string}`,
          message,
          signature: signature as `0x${string}`,
        })
        if (valid) {
          signer = creator
        } else {
          throw new Error('not creator')
        }
      } catch {
        // Try agent_wallet
        if (agent_wallet) {
          try {
            const valid = await verifyMessage({
              address: agent_wallet as `0x${string}`,
              message,
              signature: signature as `0x${string}`,
            })
            if (valid) {
              signer = agent_wallet
            } else {
              throw new Error('not agent')
            }
          } catch {
            // Try beneficiary
            try {
              const valid = await verifyMessage({
                address: beneficiary as `0x${string}`,
                message,
                signature: signature as `0x${string}`,
              })
              if (valid) {
                signer = beneficiary
              } else {
                return res.status(403).json({ error: 'Signature does not match token owner' })
              }
            } catch {
              return res.status(403).json({ error: 'Signature does not match token owner' })
            }
          }
        } else {
          // Try beneficiary as fallback
          try {
            const valid = await verifyMessage({
              address: beneficiary as `0x${string}`,
              message,
              signature: signature as `0x${string}`,
            })
            if (valid) {
              signer = beneficiary
            } else {
              return res.status(403).json({ error: 'Signature does not match token owner' })
            }
          } catch {
            return res.status(403).json({ error: 'Signature does not match token owner' })
          }
        }
      }

      // --- Upload to Supabase and save URLs ---
      const updates: string[] = []
      const values: any[] = []
      let paramIdx = 1

      if (files.logo?.[0]) {
        const logoUrl = await uploadImage(
          tokenAddress,
          'logo',
          files.logo[0].buffer,
          files.logo[0].mimetype
        )
        updates.push(`logo_url = $${paramIdx++}`)
        values.push(logoUrl)
      }

      if (files.banner?.[0]) {
        const bannerUrl = await uploadImage(
          tokenAddress,
          'banner',
          files.banner[0].buffer,
          files.banner[0].mimetype
        )
        updates.push(`banner_url = $${paramIdx++}`)
        values.push(bannerUrl)
      }

      if (updates.length > 0) {
        values.push(tokenAddress)
        await query(
          `UPDATE tokens SET ${updates.join(', ')}, updated_at = NOW() WHERE LOWER(address) = LOWER($${paramIdx})`,
          values
        )
      }

      const result = await query(
        'SELECT logo_url, banner_url FROM tokens WHERE LOWER(address) = LOWER($1)',
        [tokenAddress]
      )

      res.json({
        success: true,
        logo_url: result.rows[0]?.logo_url || null,
        banner_url: result.rows[0]?.banner_url || null,
      })
    } catch (error) {
      console.error('Error uploading images:', error)
      res.status(500).json({ error: 'Failed to upload images' })
    }
  }
)

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
