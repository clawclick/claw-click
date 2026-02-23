import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { pool } from './client'

async function migrate() {
  console.log('🔄 Running database migrations...')
  
  try {
    // 1. Run base schema (CREATE IF NOT EXISTS — safe to re-run)
    const schema = readFileSync(join(__dirname, '../../db/schema.sql'), 'utf-8')
    await pool.query(schema)
    console.log('✅ Base schema applied')

    // 2. Run incremental migrations in order
    const migrationsDir = join(__dirname, '../../db/migrations')
    try {
      const files = readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort()
      
      for (const file of files) {
        const sql = readFileSync(join(migrationsDir, file), 'utf-8')
        await pool.query(sql)
        console.log(`✅ Migration applied: ${file}`)
      }
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        console.log('ℹ️  No migrations directory found, skipping')
      } else {
        throw err
      }
    }

    console.log('✅ All migrations complete!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

migrate()
