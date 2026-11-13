import crypto from 'node:crypto'
import { Router, type Request, type Response } from 'express'
import 'express-session'
import { z } from 'zod'
import pool from '../config/database.js'
import { recordSecurityLog } from './auth.routes.js'
import { ensureUserWorkspace } from './teams.routes.js'

declare module 'express-session' {
  interface SessionData {
    userId?: string
    email?: string
  }
}

const pipelinesRouter = Router()

const triggerSchema = z.object({
  service: z.string().trim().min(2).max(120).default('devpulse-core-service'),
  branch: z.string().trim().min(1).max(80).default('main'),
})

const webhookSchema = z.object({
  service: z.string().trim().min(2).max(120),
  branch: z.string().trim().min(1).max(80).default('main'),
  commit: z.string().trim().min(4).max(40).optional(),
  status: z.enum(['passed', 'running', 'failed']).default('passed'),
  duration: z.string().trim().max(32).default('52s'),
})

export async function ensurePipelineTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      run_code VARCHAR(24) NOT NULL,
      owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
      service VARCHAR(120) NOT NULL,
      branch VARCHAR(80) NOT NULL DEFAULT 'main',
      commit_sha VARCHAR(40) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'running'
        CHECK (status IN ('passed', 'running', 'failed')),
      duration VARCHAR(32) NOT NULL DEFAULT 'Running...',
      triggered_by VARCHAR(254) NOT NULL DEFAULT 'system',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
}

// GET /api/pipelines
pipelinesRouter.get('/', async (req: Request, res: Response) => {
  if (!req.session.userId) {
    res.status(401).json({ success: false, message: 'Authentication required.' })
    return
  }

  await ensurePipelineTables()

  const runs = await pool.query(
    `SELECT id, run_code, service, branch, commit_sha, status, duration, triggered_by, created_at
     FROM pipeline_runs
     WHERE owner_id = $1 OR owner_id IS NULL
     ORDER BY created_at DESC
     LIMIT 30`,
    [req.session.userId],
  )

  res.status(200).json({
    success: true,
    data: runs.rows,
  })
})

// POST /api/pipelines/trigger
pipelinesRouter.post('/trigger', async (req: Request, res: Response) => {
  if (!req.session.userId || !req.session.email) {
    res.status(401).json({ success: false, message: 'Authentication required.' })
    return
  }

  const userId = req.session.userId
  const userEmail = req.session.email
  const clientIp = req.ip || '127.0.0.1'

  const workspace = await ensureUserWorkspace(userId, userEmail)
  if (workspace.currentRole === 'Viewer') {
    await recordSecurityLog(
      `Read-only Viewer ${userEmail} blocked from triggering CI/CD pipeline`,
      clientIp,
      'blocked',
    )
    res.status(403).json({
      success: false,
      message: 'Viewer role cannot trigger CI/CD pipeline deployments.',
    })
    return
  }

  const parsed = triggerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || 'Invalid pipeline parameters.',
    })
    return
  }

  await ensurePipelineTables()

  const runCode = `RUN-${Math.floor(100 + Math.random() * 899)}`
  const commitSha = crypto.randomBytes(4).toString('hex').slice(0, 7)

  const inserted = await pool.query(
    `INSERT INTO pipeline_runs (run_code, owner_id, service, branch, commit_sha, status, duration, triggered_by)
     VALUES ($1, $2, $3, $4, $5, 'running', 'Running...', $6)
     RETURNING id, run_code, service, branch, commit_sha, status, duration, triggered_by, created_at`,
    [runCode, userId, parsed.data.service, parsed.data.branch, commitSha, userEmail],
  )

  const createdRun = inserted.rows[0]

  await recordSecurityLog(
    `CI/CD Pipeline ${runCode} triggered for ${parsed.data.service}@${parsed.data.branch} by ${userEmail}`,
    clientIp,
    'verified',
  )

  setTimeout(() => {
    const durationSec = `${Math.floor(35 + Math.random() * 45)}s`
    void pool.query(
      `UPDATE pipeline_runs
       SET status = 'passed', duration = $1
       WHERE id = $2`,
      [durationSec, createdRun.id],
    )
  }, 1500)

  res.status(201).json({
    success: true,
    message: 'CI/CD pipeline build started.',
    data: createdRun,
  })
})

// POST /api/pipelines/webhook
pipelinesRouter.post('/webhook', async (req: Request, res: Response) => {
  const clientIp = req.ip || '127.0.0.1'
  const parsed = webhookSchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid CI/CD webhook payload.',
    })
    return
  }

  await ensurePipelineTables()

  const runCode = `WHK-${Math.floor(100 + Math.random() * 899)}`
  const commitSha =
    parsed.data.commit || crypto.randomBytes(4).toString('hex').slice(0, 7)

  const inserted = await pool.query(
    `INSERT INTO pipeline_runs (run_code, owner_id, service, branch, commit_sha, status, duration, triggered_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'github-webhook')
     RETURNING id, run_code, service, branch, commit_sha, status, duration, triggered_by, created_at`,
    [
      runCode,
      req.session.userId || null,
      parsed.data.service,
      parsed.data.branch,
      commitSha,
      parsed.data.status,
      parsed.data.duration,
    ],
  )

  await recordSecurityLog(
    `Webhook build ${runCode} (${parsed.data.service}@${parsed.data.branch}) ingested [${parsed.data.status}]`,
    clientIp,
    parsed.data.status === 'failed' ? 'blocked' : 'verified',
  )

  res.status(201).json({
    success: true,
    data: inserted.rows[0],
  })
})

export default pipelinesRouter
