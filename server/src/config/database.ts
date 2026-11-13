import './env.js'
import { Pool } from 'pg'

const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.DATABASE_URL)

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  : new Pool({
      host: process.env.PGHOST ?? '127.0.0.1',
      port: Number(process.env.PGPORT ?? 5432),
      database: process.env.PGDATABASE ?? 'devpulse',
      user: process.env.PGUSER ?? 'postgres',
      password: process.env.PGPASSWORD,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message)
})

export default pool
