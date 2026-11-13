import './env.js'
import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.PGHOST ?? '127.0.0.1',
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE ?? 'devpulse',
  user: process.env.PGUSER ?? 'postgres',
  password: process.env.PGPASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

pool.on('error', () => {
  console.error('Unexpected PostgreSQL pool error.')
})

export default pool
