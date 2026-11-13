import dotenv from 'dotenv'

dotenv.config({ path: 'server/.env' })

const port = Number(process.env.PORT ?? 5000)
const nodeEnv = process.env.NODE_ENV ?? 'development'
const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'
const databaseUrl = process.env.DATABASE_URL ?? ''

const pgHost = process.env.PGHOST ?? '127.0.0.1'
const pgPort = Number(process.env.PGPORT ?? 5432)
const pgDatabase = process.env.PGDATABASE ?? 'devpulse'
const pgUser = process.env.PGUSER ?? 'postgres'
const pgPassword = process.env.PGPASSWORD ?? ''

if (!databaseUrl && (!pgDatabase || !pgUser || !pgPassword)) {
  throw new Error('PostgreSQL environment configuration is incomplete.')
}

export const env = Object.freeze({
  NODE_ENV: nodeEnv,
  PORT: port,
  CLIENT_ORIGIN: clientOrigin,
  DATABASE_URL: databaseUrl,
  PGHOST: pgHost,
  PGPORT: pgPort,
  PGDATABASE: pgDatabase,
  PGUSER: pgUser,
  PGPASSWORD: pgPassword,
})
