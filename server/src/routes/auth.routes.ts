import crypto from 'node:crypto'
import { Router, type Request, type Response } from 'express'
import 'express-session'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import pool from '../config/database.js'

const authRouter = Router()

declare module 'express-session' {
  interface SessionData {
    userId?: string
    email?: string
  }
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
  },
})

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254),
  password: z.string().min(6, 'Password must be at least 6 characters.').max(128),
})

async function ensureSecurityLogsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS security_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_code VARCHAR(32) NOT NULL,
      event_message TEXT NOT NULL,
      source_ip VARCHAR(100) NOT NULL,
      status VARCHAR(24) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
}

export async function recordSecurityLog(
  eventMessage: string,
  sourceIp: string,
  status: 'verified' | 'blocked' | 'monitored',
): Promise<void> {
  try {
    await ensureSecurityLogsTable()
    const code = `SEC-${Math.floor(100 + Math.random() * 899)}`
    await pool.query(
      `INSERT INTO security_logs (event_code, event_message, source_ip, status)
       VALUES ($1, $2, $3, $4)`,
      [code, eventMessage, sourceIp || '127.0.0.1', status],
    )
  } catch {
    // Non-blocking audit logging
  }
}

authRouter.post('/register', authLimiter, async (req: Request, res: Response) => {
  const parsed = credentialsSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || 'Invalid registration data.',
    })
    return
  }

  const { email, password } = parsed.data
  const clientIp = req.ip || '127.0.0.1'

  const existing = await pool.query(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
    [email],
  )

  if (existing.rowCount && existing.rowCount > 0) {
    await recordSecurityLog(`Duplicate registration blocked for ${email}`, clientIp, 'blocked')
    res.status(409).json({
      success: false,
      message: 'An account with this email already exists. Please sign in.',
    })
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const webauthnUserId = crypto.randomBytes(32)

  const created = await pool.query(
    `INSERT INTO users (email, password_hash, webauthn_user_id, email_verified_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING id, email, created_at`,
    [email, passwordHash, webauthnUserId],
  )

  const user = created.rows[0]
  req.session.userId = user.id
  req.session.email = user.email

  await recordSecurityLog(`New workspace account provisioned for ${user.email}`, clientIp, 'verified')

  res.status(201).json({
    success: true,
    message: 'Account registered and session established.',
    user: { id: user.id, email: user.email, createdAt: user.created_at },
  })
})

authRouter.post('/login', authLimiter, async (req: Request, res: Response) => {
  const parsed = credentialsSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || 'Invalid login credentials.',
    })
    return
  }

  const { email, password } = parsed.data
  const clientIp = req.ip || '127.0.0.1'

  const result = await pool.query(
    'SELECT id, email, password_hash, disabled_at, created_at FROM users WHERE LOWER(email) = LOWER($1)',
    [email],
  )

  if (result.rowCount === 0) {
    await recordSecurityLog(`Failed login attempt for unregistered email: ${email}`, clientIp, 'blocked')
    res.status(401).json({ success: false, message: 'Invalid email or password.' })
    return
  }

  const user = result.rows[0]

  if (user.disabled_at) {
    await recordSecurityLog(`Disabled account login blocked: ${email}`, clientIp, 'blocked')
    res.status(403).json({ success: false, message: 'This account has been disabled.' })
    return
  }

  const passwordValid = await bcrypt.compare(password, user.password_hash)

  if (!passwordValid) {
    await recordSecurityLog(`Invalid password attempt blocked for ${email}`, clientIp, 'blocked')
    res.status(401).json({ success: false, message: 'Invalid email or password.' })
    return
  }

  req.session.userId = user.id
  req.session.email = user.email

  await recordSecurityLog(`Authenticated session established for ${user.email}`, clientIp, 'verified')

  res.status(200).json({
    success: true,
    message: 'Signed in successfully.',
    user: { id: user.id, email: user.email, createdAt: user.created_at },
  })
})

authRouter.get('/me', async (req: Request, res: Response) => {
  if (!req.session.userId) {
    res.status(401).json({ success: false, authenticated: false, message: 'No active session.' })
    return
  }

  const result = await pool.query(
    'SELECT id, email, created_at FROM users WHERE id = $1 AND disabled_at IS NULL',
    [req.session.userId],
  )

  if (result.rowCount === 0) {
    req.session.destroy(() => {})
    res.status(401).json({ success: false, authenticated: false, message: 'Session invalid.' })
    return
  }

  res.status(200).json({
    success: true,
    authenticated: true,
    user: { id: result.rows[0].id, email: result.rows[0].email, createdAt: result.rows[0].created_at },
  })
})

authRouter.post('/logout', (req: Request, res: Response) => {
  const email = req.session.email || 'Unknown user'
  const clientIp = req.ip || '127.0.0.1'

  req.session.destroy((err: unknown) => {
    if (err) {
      res.status(500).json({ success: false, message: 'Unable to terminate session.' })
      return
    }

    res.clearCookie('devpulse.sid')
    void recordSecurityLog(`Session terminated cleanly for ${email}`, clientIp, 'monitored')
    res.status(200).json({ success: true, message: 'Logged out successfully.' })
  })
})

authRouter.get('/security-logs', async (_req: Request, res: Response) => {
  await ensureSecurityLogsTable()
  const logs = await pool.query(
    `SELECT id, event_code, event_message, source_ip, status, created_at
     FROM security_logs
     ORDER BY created_at DESC
     LIMIT 20`,
  )

  res.status(200).json({ success: true, data: logs.rows })
})

export default authRouter
