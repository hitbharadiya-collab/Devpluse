import path from 'node:path'
import fs from 'node:fs'
import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'

import { env } from './config/env.js'
import pool from './config/database.js'
import healthRouter from './routes/health.routes.js'
import authRouter from './routes/auth.routes.js'
import projectsRouter from './routes/projects.routes.js'
import teamsRouter from './routes/teams.routes.js'
import pipelinesRouter from './routes/pipelines.routes.js'
import passkeysRouter from './routes/passkeys.routes.js'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'

const app = express()
const PgSessionStore = connectPgSimple(session)
const isProd = env.NODE_ENV === 'production'

app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use(helmet({ contentSecurityPolicy: false }))

const allowedOrigins = [
  env.CLIENT_ORIGIN,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.onrender.com')) {
        callback(null, true)
      } else {
        callback(null, true)
      }
    },
    credentials: true,
  }),
)

app.use(express.json({ limit: '10kb' }))

app.use(
  session({
    name: 'devpulse.sid',
    store: new PgSessionStore({
      pool,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'devpulse-enterprise-session-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
)

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    res.status(401).json({
      success: false,
      message: 'Authentication required. Please sign in.',
    })
    return
  }
  next()
}

app.use('/api', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/projects', requireAuth, projectsRouter)
app.use('/api/teams', requireAuth, teamsRouter)
app.use('/api/pipelines', pipelinesRouter)
app.use('/api/passkeys', passkeysRouter)

// Serve built React frontend in production
const distPath = path.resolve(process.cwd(), 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('/{*splat}', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.use(notFoundHandler)
app.use(errorHandler)

export default app
