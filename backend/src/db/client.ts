import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Heroku Postgres requires SSL but uses self-signed certs
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : undefined,
})

// Log pool errors but don't crash — let the pool recover
pool.on('error', (err) => {
  console.error('Pool background error (non-fatal):', err.message)
})

async function queryWithRetry(text: string, params?: any[], retries = 2): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const start = Date.now()
      const res = await pool.query(text, params)
      return res
    } catch (err: any) {
      const isConnectionError = err.message?.includes('Connection terminated') ||
        err.message?.includes('connection timeout') ||
        err.message?.includes('ECONNREFUSED') ||
        err.code === 'ECONNRESET'
      
      if (isConnectionError && attempt < retries) {
        console.warn(`DB query retry ${attempt + 1}/${retries} after: ${err.message}`)
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
        continue
      }
      throw err
    }
  }
}

export async function query(text: string, params?: any[]) {
  return queryWithRetry(text, params)
}

export async function getClient() {
  const client = await pool.connect()
  const query = client.query
  const release = client.release
  
  // Set timeout
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!')
  }, 5000)
  
  // Monkey patch to clear timeout
  client.release = () => {
    clearTimeout(timeout)
    client.query = query
    client.release = release
    return release.apply(client)
  }
  
  return client
}
