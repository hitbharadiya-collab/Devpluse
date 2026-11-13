import { Router, type Request, type Response } from 'express'
import 'express-session'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import pool from '../config/database.js'
import { recordSecurityLog } from './auth.routes.js'

declare module 'express-session' {
  interface SessionData {
    userId?: string
    email?: string
    webauthnChallenge?: string
    webauthnAuthUserId?: string
  }
}

const passkeysRouter = Router()
const RP_NAME = 'DevPulse Enterprise'
const RP_ID = 'localhost'
const EXPECTED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

export async function ensurePasskeyTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_passkeys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credential_id TEXT NOT NULL UNIQUE,
      public_key TEXT NOT NULL,
      counter BIGINT NOT NULL DEFAULT 0,
      device_type VARCHAR(32) NOT NULL DEFAULT 'singleDevice',
      backed_up BOOLEAN NOT NULL DEFAULT FALSE,
      transports TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      label VARCHAR(120) NOT NULL DEFAULT 'Hardware Passkey',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
}

// GET /api/passkeys - List user's registered hardware passkeys
passkeysRouter.get('/', async (req: Request, res: Response) => {
  if (!req.session.userId) {
    res.status(401).json({ success: false, message: 'Authentication required.' })
    return
  }

  await ensurePasskeyTables()

  const result = await pool.query(
    `SELECT id, credential_id, device_type, backed_up, label, created_at
     FROM user_passkeys
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [req.session.userId],
  )

  res.status(200).json({
    success: true,
    data: result.rows,
  })
})

// POST /api/passkeys/register/options
passkeysRouter.post('/register/options', async (req: Request, res: Response) => {
  if (!req.session.userId || !req.session.email) {
    res.status(401).json({ success: false, message: 'Authentication required.' })
    return
  }

  await ensurePasskeyTables()

  const existing = await pool.query<{ credential_id: string }>(
    'SELECT credential_id FROM user_passkeys WHERE user_id = $1',
    [req.session.userId],
  )

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: req.session.email,
    userID: new TextEncoder().encode(req.session.userId),
    attestationType: 'none',
    excludeCredentials: existing.rows.map((row) => ({
      id: row.credential_id,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  })

  req.session.webauthnChallenge = options.challenge

  res.status(200).json({
    success: true,
    options,
  })
})

// POST /api/passkeys/register/verify
passkeysRouter.post('/register/verify', async (req: Request, res: Response) => {
  if (!req.session.userId || !req.session.email) {
    res.status(401).json({ success: false, message: 'Authentication required.' })
    return
  }

  const expectedChallenge = req.session.webauthnChallenge
  if (!expectedChallenge) {
    res.status(400).json({
      success: false,
      message: 'No active WebAuthn registration challenge found.',
    })
    return
  }

  const clientIp = req.ip || '127.0.0.1'

  try {
    const verification = await verifyRegistrationResponse({
      response: req.body.credential,
      expectedChallenge,
      expectedOrigin: EXPECTED_ORIGINS,
      expectedRPID: RP_ID,
    })

    if (!verification.verified || !verification.registrationInfo) {
      await recordSecurityLog(
        `WebAuthn Passkey verification failed for ${req.session.email}`,
        clientIp,
        'blocked',
      )
      res.status(400).json({
        success: false,
        message: 'Passkey verification failed.',
      })
      return
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo

    const publicKeyBase64 = Buffer.from(credential.publicKey).toString('base64url')
    const label =
      typeof req.body.label === 'string' && req.body.label.trim()
        ? req.body.label.trim().slice(0, 100)
        : 'Windows Hello / Security Key'

    await ensurePasskeyTables()

    const inserted = await pool.query(
      `INSERT INTO user_passkeys (user_id, credential_id, public_key, counter, device_type, backed_up, transports, label)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, credential_id, device_type, backed_up, label, created_at`,
      [
        req.session.userId,
        credential.id,
        publicKeyBase64,
        credential.counter,
        credentialDeviceType,
        credentialBackedUp,
        credential.transports || [],
        label,
      ],
    )

    req.session.webauthnChallenge = undefined

    await recordSecurityLog(
      `Hardware WebAuthn Passkey (${label}) enrolled by ${req.session.email}`,
      clientIp,
      'verified',
    )

    res.status(201).json({
      success: true,
      message: 'Hardware Passkey registered in PostgreSQL.',
      data: inserted.rows[0],
    })
  } catch (err) {
    await recordSecurityLog(
      `WebAuthn Passkey error for ${req.session.email}`,
      clientIp,
      'blocked',
    )
    res.status(400).json({
      success: false,
      message:
        err instanceof Error ? err.message : 'Unable to verify passkey credential.',
    })
  }
})

// POST /api/passkeys/login/options (Passwordless Sign-In Challenge)
passkeysRouter.post('/login/options', async (req: Request, res: Response) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  if (!email) {
    res.status(400).json({ success: false, message: 'Enter your work email first.' })
    return
  }

  await ensurePasskeyTables()

  const userRes = await pool.query<{ id: string }>(
    'SELECT id FROM users WHERE email = $1',
    [email],
  )
  const user = userRes.rows[0]
  if (!user) {
    res.status(404).json({ success: false, message: 'No account found with this email.' })
    return
  }

  const keysRes = await pool.query<{ credential_id: string }>(
    'SELECT credential_id FROM user_passkeys WHERE user_id = $1',
    [user.id],
  )

  if (keysRes.rows.length === 0) {
    res.status(400).json({
      success: false,
      message: 'No Passkey registered for this account yet. Sign in with password and enroll one in Settings.',
    })
    return
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: keysRes.rows.map((k) => ({ id: k.credential_id })),
    userVerification: 'preferred',
  })

  req.session.webauthnChallenge = options.challenge
  req.session.webauthnAuthUserId = user.id

  res.status(200).json({
    success: true,
    options,
  })
})

// POST /api/passkeys/login/verify
passkeysRouter.post('/login/verify', async (req: Request, res: Response) => {
  const challenge = req.session.webauthnChallenge
  const targetUserId = req.session.webauthnAuthUserId
  const clientIp = req.ip || '127.0.0.1'

  if (!challenge || !targetUserId) {
    res.status(400).json({ success: false, message: 'Passkey login session expired.' })
    return
  }

  const credId = req.body.credential?.id
  const storedRes = await pool.query<{
    id: string
    credential_id: string
    public_key: string
    counter: string
  }>(
    'SELECT id, credential_id, public_key, counter FROM user_passkeys WHERE user_id = $1 AND credential_id = $2',
    [targetUserId, credId],
  )

  const stored = storedRes.rows[0]
  if (!stored) {
    res.status(404).json({ success: false, message: 'Passkey credential not recognized.' })
    return
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response: req.body.credential,
      expectedChallenge: challenge,
      expectedOrigin: EXPECTED_ORIGINS,
      expectedRPID: RP_ID,
      credential: {
        id: stored.credential_id,
        publicKey: new Uint8Array(Buffer.from(stored.public_key, 'base64url')),
        counter: Number(stored.counter),
      },
    })

    if (!verification.verified) {
      await recordSecurityLog(
        `Failed Passkey sign-in attempt for user ID ${targetUserId}`,
        clientIp,
        'blocked',
      )
      res.status(401).json({ success: false, message: 'Passkey authentication failed.' })
      return
    }

    await pool.query(
      'UPDATE user_passkeys SET counter = $1 WHERE id = $2',
      [verification.authenticationInfo.newCounter, stored.id],
    )

    const userRes = await pool.query<{ id: string; email: string; created_at: string }>(
      'SELECT id, email, created_at FROM users WHERE id = $1',
      [targetUserId],
    )
    const user = userRes.rows[0]

    req.session.userId = user.id
    req.session.email = user.email
    req.session.webauthnChallenge = undefined
    req.session.webauthnAuthUserId = undefined

    await recordSecurityLog(
      `Passwordless WebAuthn Passkey login verified for ${user.email}`,
      clientIp,
      'verified',
    )

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
    })
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : 'Passkey verification error.',
    })
  }
})

// DELETE /api/passkeys/:id
passkeysRouter.delete('/:id', async (req: Request, res: Response) => {
  if (!req.session.userId || !req.session.email) {
    res.status(401).json({ success: false, message: 'Authentication required.' })
    return
  }

  const deleted = await pool.query(
    'DELETE FROM user_passkeys WHERE id = $1 AND user_id = $2 RETURNING label',
    [req.params.id, req.session.userId],
  )

  if (deleted.rowCount && deleted.rowCount > 0) {
    await recordSecurityLog(
      `Hardware Passkey (${deleted.rows[0].label}) removed by ${req.session.email}`,
      req.ip || '127.0.0.1',
      'monitored',
    )
  }

  res.status(200).json({ success: true })
})

export default passkeysRouter
