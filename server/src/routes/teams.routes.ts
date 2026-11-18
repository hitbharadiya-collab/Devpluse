import { Router, type Request, type Response } from 'express'
import 'express-session'
import { z } from 'zod'
import pool from '../config/database.js'
import { recordSecurityLog } from './auth.routes.js'

declare module 'express-session' {
  interface SessionData {
    userId?: string
    email?: string
  }
}

const teamsRouter = Router()

export type WorkspaceRole = 'Admin' | 'DevSecOps' | 'Engineer' | 'Viewer' | 'Security Lead' | 'DevOps Engineer' | 'Developer' | 'Auditor'

const roleEnum = z.enum(['Admin', 'DevSecOps', 'Engineer', 'Viewer', 'Security Lead', 'DevOps Engineer', 'Developer', 'Auditor'])

const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254),
  role: roleEnum.default('Engineer'),
})

const updateRoleSchema = z.object({
  role: roleEnum,
})

export async function ensureRbacTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(120) NOT NULL,
      owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS organization_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      member_email VARCHAR(254) NOT NULL,
      role VARCHAR(24) NOT NULL DEFAULT 'Engineer'
        CHECK (role IN ('Admin', 'DevSecOps', 'Engineer', 'Viewer', 'Security Lead', 'DevOps Engineer', 'Developer', 'Auditor')),
      status VARCHAR(24) NOT NULL DEFAULT 'Active',
      added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (org_id, member_email)
    );
  `)
  await pool.query("ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_role_check");
  await pool.query("ALTER TABLE organization_members ADD CONSTRAINT organization_members_role_check CHECK (role IN ('Admin', 'DevSecOps', 'Engineer', 'Viewer', 'Security Lead', 'DevOps Engineer', 'Developer', 'Auditor'))");
}

export async function ensureUserWorkspace(
  userId: string,
  userEmail: string,
): Promise<{ orgId: string; orgName: string; currentRole: WorkspaceRole }> {
  await ensureRbacTables()

  let orgResult = await pool.query(
    'SELECT id, name FROM organizations WHERE owner_id = $1 LIMIT 1',
    [userId],
  )

  if (orgResult.rowCount === 0) {
    const workspaceName = `${userEmail.split('@')[0].toUpperCase()} Enterprise Workspace`
    orgResult = await pool.query(
      `INSERT INTO organizations (name, owner_id)
       VALUES ($1, $2)
       RETURNING id, name`,
      [workspaceName, userId],
    )
  }

  const org = orgResult.rows[0]

  await pool.query(
    `INSERT INTO organization_members (org_id, member_email, role, status)
     VALUES ($1, $2, 'Admin', 'Online')
     ON CONFLICT (org_id, member_email) DO NOTHING`,
    [org.id, userEmail.toLowerCase()],
  )

  const roleRes = await pool.query(
    `SELECT role FROM organization_members
     WHERE org_id = $1 AND LOWER(member_email) = LOWER($2)
     LIMIT 1`,
    [org.id, userEmail],
  )

  return {
    orgId: org.id,
    orgName: org.name,
    currentRole: (roleRes.rows[0]?.role as WorkspaceRole) || 'Admin',
  }
}

teamsRouter.get('/', async (req: Request, res: Response) => {
  const userId = req.session.userId!
  const userEmail = req.session.email!

  const workspace = await ensureUserWorkspace(userId, userEmail)

  const members = await pool.query(
    `SELECT id, member_email, role, status, added_at
     FROM organization_members
     WHERE org_id = $1
     ORDER BY added_at ASC`,
    [workspace.orgId],
  )

  res.status(200).json({
    success: true,
    organization: {
      id: workspace.orgId,
      name: workspace.orgName,
      currentRole: workspace.currentRole,
    },
    members: members.rows,
  })
})

teamsRouter.post('/members', async (req: Request, res: Response) => {
  const userId = req.session.userId!
  const userEmail = req.session.email!
  const clientIp = req.ip || '127.0.0.1'

  const workspace = await ensureUserWorkspace(userId, userEmail)

  if (workspace.currentRole !== 'Admin' && workspace.currentRole !== 'DevSecOps') {
    await recordSecurityLog(
      `Unauthorized member invite blocked for ${userEmail} (${workspace.currentRole})`,
      clientIp,
      'blocked',
    )
    res.status(403).json({
      success: false,
      message: 'Only Admin or DevSecOps roles can invite workspace members.',
    })
    return
  }

  const parsed = addMemberSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || 'Invalid member details.',
    })
    return
  }

  const { email, role } = parsed.data

  const inserted = await pool.query(
    `INSERT INTO organization_members (org_id, member_email, role, status)
     VALUES ($1, $2, $3, 'Invited')
     ON CONFLICT (org_id, member_email)
     DO UPDATE SET role = EXCLUDED.role
     RETURNING id, member_email, role, status, added_at`,
    [workspace.orgId, email, role],
  )

  await recordSecurityLog(
    `RBAC member ${email} assigned role ${role} by ${userEmail}`,
    clientIp,
    'verified',
  )

  res.status(201).json({
    success: true,
    message: 'Team member added to workspace.',
    member: inserted.rows[0],
  })
})

teamsRouter.patch('/members/:id', async (req: Request, res: Response) => {
  const idCheck = z.string().uuid().safeParse(req.params.id)
  if (!idCheck.success) {
    res.status(400).json({ success: false, message: 'Invalid member ID.' })
    return
  }

  const parsed = updateRoleSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid role selected.' })
    return
  }

  const userId = req.session.userId!
  const userEmail = req.session.email!
  const clientIp = req.ip || '127.0.0.1'
  const workspace = await ensureUserWorkspace(userId, userEmail)

  if (workspace.currentRole !== 'Admin') {
    res.status(403).json({
      success: false,
      message: 'Only workspace Admins can modify member roles.',
    })
    return
  }

  const updated = await pool.query(
    `UPDATE organization_members
     SET role = $1
     WHERE id = $2 AND org_id = $3
     RETURNING id, member_email, role, status, added_at`,
    [parsed.data.role, idCheck.data, workspace.orgId],
  )

  if (updated.rowCount === 0) {
    res.status(404).json({ success: false, message: 'Member not found.' })
    return
  }

  await recordSecurityLog(
    `RBAC role updated to ${parsed.data.role} for ${updated.rows[0].member_email}`,
    clientIp,
    'verified',
  )

  res.status(200).json({ success: true, member: updated.rows[0] })
})

teamsRouter.delete('/members/:id', async (req: Request, res: Response) => {
  const idCheck = z.string().uuid().safeParse(req.params.id)
  if (!idCheck.success) {
    res.status(400).json({ success: false, message: 'Invalid member ID.' })
    return
  }

  const userId = req.session.userId!
  const userEmail = req.session.email!
  const clientIp = req.ip || '127.0.0.1'
  const workspace = await ensureUserWorkspace(userId, userEmail)

  if (workspace.currentRole !== 'Admin') {
    res.status(403).json({
      success: false,
      message: 'Only workspace Admins can remove members.',
    })
    return
  }

  const target = await pool.query(
    'SELECT member_email FROM organization_members WHERE id = $1 AND org_id = $2',
    [idCheck.data, workspace.orgId],
  )

  if (target.rowCount === 0) {
    res.status(404).json({ success: false, message: 'Member not found.' })
    return
  }

  if (target.rows[0].member_email.toLowerCase() === userEmail.toLowerCase()) {
    res.status(400).json({
      success: false,
      message: 'You cannot remove your own Admin account from the workspace.',
    })
    return
  }

  await pool.query('DELETE FROM organization_members WHERE id = $1', [idCheck.data])

  await recordSecurityLog(
    `Member ${target.rows[0].member_email} revoked from workspace by ${userEmail}`,
    clientIp,
    'monitored',
  )

  res.status(200).json({ success: true, data: { id: idCheck.data } })
})

export default teamsRouter
