import dotenv from 'dotenv'

dotenv.config({ path: 'server/.env' })

const port = Number(process.env.PORT ?? 5000)

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('Invalid PORT configuration.')
}

const nodeEnv = process.env.NODE_ENV ?? 'development'

if (!['development', 'production', 'test'].includes(nodeEnv)) {
  throw new Error('Invalid NODE_ENV configuration.')
}

const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'

const pgHost = process.env.PGHOST ?? '127.0.0.1'
const pgPort = Number(process.env.PGPORT ?? 5432)
const pgDatabase = process.env.PGDATABASE ?? ''
const pgUser = process.env.PGUSER ?? ''
const pgPassword = process.env.PGPASSWORD ?? ''

if (!Number.isInteger(pgPort) || pgPort < 1 || pgPort > 65535) {
  throw new Error('Invalid PostgreSQL port configuration.')
}

if (!pgDatabase || !pgUser || !pgPassword) {
  throw new Error('PostgreSQL environment configuration is incomplete.')
}

export const env = Object.freeze({
  NODE_ENV: nodeEnv,
  PORT: port,
  CLIENT_ORIGIN: clientOrigin,
  PGHOST: pgHost,
  PGPORT: pgPort,
  PGDATABASE: pgDatabase,
  PGUSER: pgUser,
  PGPASSWORD: pgPassword,
})