import app from './app.js'
import { env } from './config/env.js'
import { initializeDatabase } from './init-db.js'

async function start() {
  await initializeDatabase()

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`DevPulse Full-Stack Server running on port ${env.PORT} (${env.NODE_ENV})`)
  })

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${env.PORT} is already in use.`)
    } else {
      console.error('Failed to start the DevPulse server:', error)
    }
    process.exit(1)
  })
}

start()
