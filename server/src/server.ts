import app from './app.js'
import { env } from './config/env.js'

const server = app.listen(env.PORT, '127.0.0.1', () => {
  console.log(`DevPulse API is running at http://localhost:${env.PORT}`)
  console.log(`Environment: ${env.NODE_ENV}`)
})

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${env.PORT} is already in use.`)
  } else {
    console.error('Failed to start the DevPulse API server.')
  }

  process.exit(1)
})
