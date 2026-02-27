import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // Heroku Postgres requires SSL but uses self-signed certs
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : undefined,
})

pool.on('error', (err) => {
  console.error('Unexpected database error:', err)
  process.exit(-1)
})

export async function query(text: string, params?: any[]) {
  const start = Date.now()
  const res = await pool.query(text, params)
  const duration = Date.now() - start
  // console.log('Executed query', { text: text.slice(0, 100), duration, rows: res.rowCount })
  return res
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
