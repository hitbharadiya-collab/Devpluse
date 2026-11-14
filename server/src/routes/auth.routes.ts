import crypto from 'node:crypto'
import { Router, type Request, type Response } from 'express'
import 'express-session'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import nodemailer from 'nodemailer'
import { z } from 'zod'
import pool from '../config/database.js'

const authRouter = Router()

declare module 'express-session' {
  interface SessionData {
    userId?: string
    email?: string
    pendingUserId?: string
    pendingEmail?: string
    oauthState?: string
  }
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
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

/* ==================== RFC-6238 TOTP (2FA AUTHENTICATOR) HELPERS ==================== */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function generateBase32Secret(bytesLength = 20): string {
  const buf = crypto.randomBytes(bytesLength)
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }
  return output
}

function base32ToBuffer(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

function generateTotpAtCounter(secret: string, counter: number): string {
  const key = base32ToBuffer(secret)
  const counterBuf = Buffer.alloc(8)
  counterBuf.writeBigUInt64BE(BigInt(counter))
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest()
  const offset = hmac[hmac.length - 1]! & 0x0f
  const code =
    (((hmac[offset]! & 0x7f) << 24) |
      ((hmac[offset + 1]! & 0xff) << 16) |
      ((hmac[offset + 2]! & 0xff) << 8) |
      (hmac[offset + 3]! & 0xff)) %
    1_000_000
  return code.toString().padStart(6, '0')
}

function verifyTotpCode(secret: string, token: string): boolean {
  const cleanToken = token.replace(/\s+/g, '')
  if (!/^\d{6}$/.test(cleanToken)) return false
  const currentCounter = Math.floor(Date.now() / 1000 / 30)
  for (let window = -1; window <= 1; window++) {
    if (generateTotpAtCounter(secret, currentCounter + window) === cleanToken) {
      return true
    }
  }
  return false
}

/* ==================== EMAIL OTP DISPATCHER ==================== */
async function sendOtpEmail(toEmail: string, otpCode: string): Promise<boolean> {
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  if (!smtpUser || !smtpPass) {
    console.log(`[DevPulse OTP] Generated 6-digit OTP for ${toEmail}: ${otpCode}`)
    return false
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: smtpUser, pass: smtpPass },
    })

    await transporter.sendMail({
      from: `"DevPulse Security" <${smtpUser}>`,
      to: toEmail,
      subject: `${otpCode} is your DevPulse Security Verification OTP`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;background:#070d19;color:#f8fafc;padding:28px;border-radius:12px;max-width:460px;">
          <h2 style="margin:0 0 8px;color:#38bdf8;">DevPulse Zero-Trust Verification</h2>
          <p style="color:#94a3b8;font-size:14px;margin:0 0 20px;">Use the 6-digit one-time verification code below to unlock your DevSecOps workspace. Expires in 5 minutes.</p>
          <div style="background:#0f172a;border:1px solid #1e293b;padding:16px;text-align:center;border-radius:10px;font-size:28px;font-weight:700;letter-spacing:8px;color:#22d3ee;">
            ${otpCode}
          </div>
          <p style="color:#64748b;font-size:12px;margin-top:20px;">If you did not initiate this sign-in, secure your credentials immediately.</p>
        </div>
      `,
    })
    return true
  } catch (err) {
    console.error('[DevPulse OTP] SMTP dispatch error:', err)
    console.log(`[DevPulse OTP Fallback] Code for ${toEmail}: ${otpCode}`)
    return false
  }
}

async function issueLoginOtp(userId: string, email: string): Promise<{ otpCode: string; emailSent: boolean }> {
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
  await pool.query(
    `UPDATE users
     SET otp_code = $1, otp_expires_at = NOW() + INTERVAL '5 minutes'
     WHERE id = $2`,
    [otpCode, userId],
  )
  const emailSent = await sendOtpEmail(email, otpCode)
  return { otpCode, emailSent }
}

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

/* ==================== GOOGLE OAUTH 2.0 ENDPOINTS ==================== */
function getGoogleRedirectUri(req: Request): string {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https'
  const host = req.get('host') || 'localhost:10000'
  return `${proto}://${host}/api/auth/google/callback`
}

authRouter.get('/google', (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    res.redirect('/?authError=' + encodeURIComponent('Google OAuth is not configured yet (missing GOOGLE_CLIENT_ID on Render).'))
    return
  }

  const state = crypto.randomBytes(16).toString('hex')
  req.session.oauthState = state

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleRedirectUri(req),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  })

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
})

authRouter.get('/google/callback', async (req: Request, res: Response) => {
  const clientIp = req.ip || '127.0.0.1'
  const code = String(req.query.code || '')
  const state = String(req.query.state || '')
  const clientId = process.env.GOOGLE_CLIENT_ID || ''
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''

  if (!code || !clientId || !clientSecret) {
    res.redirect('/?authError=' + encodeURIComponent('Google sign-in cancelled or OAuth keys missing.'))
    return
  }

  if (req.session.oauthState && state !== req.session.oauthState) {
    res.redirect('/?authError=' + encodeURIComponent('Invalid OAuth security state. Please retry.'))
    return
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getGoogleRedirectUri(req),
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string }
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error || 'Failed to exchange Google OAuth token.')
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = (await profileRes.json()) as {
      sub?: string
      email?: string
      name?: string
      picture?: string
    }

    if (!profile.email) {
      throw new Error('Google account did not return a verified email address.')
    }

    const email = profile.email.trim().toLowerCase()
    const existing = await pool.query(
      'SELECT id, email, disabled_at, totp_enabled FROM users WHERE LOWER(email) = LOWER($1)',
      [email],
    )

    let userId: string
    if (existing.rowCount && existing.rowCount > 0) {
      const row = existing.rows[0]
      if (row.disabled_at) {
        await recordSecurityLog(`Disabled Google user blocked: ${email}`, clientIp, 'blocked')
        res.redirect('/?authError=' + encodeURIComponent('This workspace account has been disabled.'))
        return
      }
      userId = row.id
      await pool.query(
        `UPDATE users SET google_id = COALESCE(google_id, $1), full_name = COALESCE($2, full_name), avatar_url = COALESCE($3, avatar_url) WHERE id = $4`,
        [profile.sub || null, profile.name || null, profile.picture || null, userId],
      )
    } else {
      const randomPasswordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10)
      const webauthnUserId = crypto.randomBytes(32)
      const inserted = await pool.query(
        `INSERT INTO users (email, password_hash, webauthn_user_id, email_verified_at, google_id, full_name, avatar_url)
         VALUES ($1, $2, $3, NOW(), $4, $5, $6)
         RETURNING id`,
        [email, randomPasswordHash, webauthnUserId, profile.sub || null, profile.name || null, profile.picture || null],
      )
      userId = inserted.rows[0].id
      await recordSecurityLog(`New Google SSO account provisioned for ${email}`, clientIp, 'verified')
    }

    const { otpCode, emailSent } = await issueLoginOtp(userId, email)
    req.session.pendingUserId = userId
    req.session.pendingEmail = email
    delete req.session.oauthState

    await recordSecurityLog(`Google SSO verified for ${email}; backend OTP challenge issued`, clientIp, 'monitored')

    const redirectParams = new URLSearchParams({
      otpPending: '1',
      email,
      emailSent: emailSent ? '1' : '0',
    })
    if (!emailSent) {
      redirectParams.set('demoOtp', otpCode)
    }
    res.redirect(`/?${redirectParams.toString()}`)
  } catch (err) {
    console.error('Google OAuth callback error:', err)
    res.redirect('/?authError=' + encodeURIComponent('Google authentication failed. Please try again.'))
  }
})

/* ==================== REGISTER & LOGIN (TRIGGERS BACKEND OTP) ==================== */
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

  const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email])
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
  const { otpCode, emailSent } = await issueLoginOtp(user.id, user.email)

  req.session.pendingUserId = user.id
  req.session.pendingEmail = user.email

  await recordSecurityLog(`Account created for ${user.email}; OTP verification required`, clientIp, 'monitored')

  res.status(201).json({
    success: true,
    requiresOtp: true,
    email: user.email,
    totpEnabled: false,
    emailSent,
    devOtpHint: emailSent ? undefined : otpCode,
    message: emailSent
      ? `6-digit verification OTP sent to ${user.email}.`
      : `SMTP not configured on server — use generated backend OTP: ${otpCode}`,
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
    'SELECT id, email, password_hash, disabled_at, totp_enabled FROM users WHERE LOWER(email) = LOWER($1)',
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

  const { otpCode, emailSent } = await issueLoginOtp(user.id, user.email)
  req.session.pendingUserId = user.id
  req.session.pendingEmail = user.email

  await recordSecurityLog(`Password verified for ${user.email}; backend OTP challenge issued`, clientIp, 'monitored')

  res.status(200).json({
    success: true,
    requiresOtp: true,
    email: user.email,
    totpEnabled: Boolean(user.totp_enabled),
    emailSent,
    devOtpHint: emailSent ? undefined : otpCode,
    message: emailSent
      ? `6-digit verification OTP sent to ${user.email}.`
      : `SMTP not configured on server — use generated backend OTP: ${otpCode}`,
  })
})

/* ==================== VERIFY BACKEND OTP + OPTIONAL 2FA TOTP ==================== */
authRouter.post('/verify-otp', authLimiter, async (req: Request, res: Response) => {
  const clientIp = req.ip || '127.0.0.1'
  const otp = String(req.body?.otp || '').trim()
  const totpCode = String(req.body?.totpCode || '').trim()
  const emailInput = String(req.body?.email || req.session.pendingEmail || '').trim().toLowerCase()

  if (!/^\d{6}$/.test(otp)) {
    res.status(400).json({ success: false, message: 'Please enter the valid 6-digit OTP.' })
    return
  }

  const query = req.session.pendingUserId
    ? await pool.query(
        'SELECT id, email, full_name, avatar_url, otp_code, otp_expires_at, totp_enabled, totp_secret, created_at FROM users WHERE id = $1',
        [req.session.pendingUserId],
      )
    : await pool.query(
        'SELECT id, email, full_name, avatar_url, otp_code, otp_expires_at, totp_enabled, totp_secret, created_at FROM users WHERE LOWER(email) = LOWER($1)',
        [emailInput],
      )

  if (query.rowCount === 0) {
    res.status(401).json({ success: false, message: 'Verification session expired. Please sign in again.' })
    return
  }

  const user = query.rows[0]
  if (!user.otp_code || user.otp_code !== otp) {
    await recordSecurityLog(`Invalid backend OTP entered for ${user.email}`, clientIp, 'blocked')
    res.status(401).json({ success: false, message: 'Incorrect OTP code. Check your email and try again.' })
    return
  }

  if (user.otp_expires_at && new Date(user.otp_expires_at).getTime() < Date.now()) {
    await recordSecurityLog(`Expired backend OTP rejected for ${user.email}`, clientIp, 'blocked')
    res.status(401).json({ success: false, message: 'OTP has expired. Click Resend OTP.' })
    return
  }

  if (user.totp_enabled && user.totp_secret) {
    if (!totpCode || !verifyTotpCode(user.totp_secret, totpCode)) {
      await recordSecurityLog(`2FA Authenticator code failed for ${user.email}`, clientIp, 'blocked')
      res.status(401).json({
        success: false,
        requiresTotp: true,
        message: 'Invalid 6-digit Google Authenticator (2FA) code.',
      })
      return
    }
  }

  await pool.query('UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = $1', [user.id])

  req.session.userId = user.id
  req.session.email = user.email
  delete req.session.pendingUserId
  delete req.session.pendingEmail

  await recordSecurityLog(
    `Multi-factor authentication (OTP${user.totp_enabled ? ' + 2FA TOTP' : ''}) verified for ${user.email}`,
    clientIp,
    'verified',
  )

  res.status(200).json({
    success: true,
    message: 'Security verification complete.',
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      totpEnabled: Boolean(user.totp_enabled),
      createdAt: user.created_at,
    },
  })
})

authRouter.post('/resend-otp', authLimiter, async (req: Request, res: Response) => {
  const email = String(req.body?.email || req.session.pendingEmail || '').trim().toLowerCase()
  if (!email) {
    res.status(400).json({ success: false, message: 'Missing email for OTP resend.' })
    return
  }

  const result = await pool.query('SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)', [email])
  if (result.rowCount === 0) {
    res.status(404).json({ success: false, message: 'User account not found.' })
    return
  }

  const user = result.rows[0]
  req.session.pendingUserId = user.id
  req.session.pendingEmail = user.email

  const { otpCode, emailSent } = await issueLoginOtp(user.id, user.email)
  res.status(200).json({
    success: true,
    emailSent,
    devOtpHint: emailSent ? undefined : otpCode,
    message: emailSent ? `New OTP sent to ${user.email}.` : `New backend OTP generated: ${otpCode}`,
  })
})

/* ==================== 2FA AUTHENTICATOR SETUP & VERIFY ==================== */
authRouter.post('/2fa/setup', async (req: Request, res: Response) => {
  if (!req.session.userId) {
    res.status(401).json({ success: false, message: 'Sign in first to configure 2FA.' })
    return
  }

  const secret = generateBase32Secret(20)
  const email = req.session.email || 'user@devpulse.io'
  const issuer = 'DevPulse'
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`

  await pool.query('UPDATE users SET totp_secret = $1 WHERE id = $2', [secret, req.session.userId])

  res.status(200).json({
    success: true,
    secret,
    otpauthUrl,
    qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`,
  })
})

authRouter.post('/2fa/enable', async (req: Request, res: Response) => {
  if (!req.session.userId) {
    res.status(401).json({ success: false, message: 'Authentication required.' })
    return
  }

  const code = String(req.body?.code || '').trim()
  const result = await pool.query('SELECT email, totp_secret FROM users WHERE id = $1', [req.session.userId])
  const user = result.rows[0]

  if (!user?.totp_secret || !verifyTotpCode(user.totp_secret, code)) {
    res.status(400).json({ success: false, message: 'Invalid 6-digit code from Authenticator app.' })
    return
  }

  await pool.query('UPDATE users SET totp_enabled = TRUE WHERE id = $1', [req.session.userId])
  await recordSecurityLog(`2FA Authenticator (TOTP) enabled for ${user.email}`, req.ip || '127.0.0.1', 'verified')

  res.status(200).json({ success: true, totpEnabled: true, message: '2-Factor Authentication enabled!' })
})

authRouter.post('/2fa/disable', async (req: Request, res: Response) => {
  if (!req.session.userId) {
    res.status(401).json({ success: false, message: 'Authentication required.' })
    return
  }

  await pool.query('UPDATE users SET totp_enabled = FALSE, totp_secret = NULL WHERE id = $1', [req.session.userId])
  await recordSecurityLog(`2FA Authenticator disabled for ${req.session.email}`, req.ip || '127.0.0.1', 'monitored')

  res.status(200).json({ success: true, totpEnabled: false, message: '2-Factor Authentication disabled.' })
})

authRouter.get('/me', async (req: Request, res: Response) => {
  if (!req.session.userId) {
    res.status(401).json({
      success: false,
      authenticated: false,
      pendingEmail: req.session.pendingEmail || null,
      message: 'No active session.',
    })
    return
  }

  const result = await pool.query(
    'SELECT id, email, full_name, avatar_url, totp_enabled, created_at FROM users WHERE id = $1 AND disabled_at IS NULL',
    [req.session.userId],
  )

  if (result.rowCount === 0) {
    req.session.destroy(() => {})
    res.status(401).json({ success: false, authenticated: false, message: 'Session invalid.' })
    return
  }

  const u = result.rows[0]
  res.status(200).json({
    success: true,
    authenticated: true,
    user: {
      id: u.id,
      email: u.email,
      fullName: u.full_name,
      avatarUrl: u.avatar_url,
      totpEnabled: Boolean(u.totp_enabled),
      createdAt: u.created_at,
    },
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

