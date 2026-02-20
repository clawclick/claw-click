import { readFileSync } from 'fs'
import { join } from 'path'
import { pool } from './client'

async function migrate() {
  console.log('🔄 Running database migrations...')
  
  try {
    const schema = readFileSync(join(__dirname, '../../db/schema.sql'), 'utf-8')
    await pool.query(schema)
    console.log('✅ Database schema created successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

migrate()
