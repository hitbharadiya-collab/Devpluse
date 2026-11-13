import { Router, type Request, type Response } from 'express'
import 'express-session'
import { z } from 'zod'
import pool from '../config/database.js'
import { recordSecurityLog } from './auth.routes.js'
import { ensureUserWorkspace } from './teams.routes.js'

const projectsRouter = Router()

const projectFields = {
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000),
  status: z.enum(['active', 'completed', 'archived']),
  priority: z.enum(['low', 'medium', 'high']),
}

const createProjectSchema = z.object({
  name: projectFields.name,
  description: projectFields.description.default(''),
  status: projectFields.status.default('active'),
  priority: projectFields.priority.default('medium'),
})

const updateProjectSchema = z
  .object({
    name: projectFields.name.optional(),
    description: projectFields.description.optional(),
    status: projectFields.status.optional(),
    priority: projectFields.priority.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required.',
  })

const listQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: projectFields.status.optional(),
  priority: projectFields.priority.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.enum(['created_at', 'updated_at', 'name']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

const projectColumns =
  'id, name, description, status, priority, owner_id, created_at, updated_at'

function validateProjectId(id: unknown) {
  return z.string().uuid().safeParse(id)
}

projectsRouter.get('/', async (req: Request, res: Response) => {
  const userId = req.session.userId!

  const parsed = listQuerySchema.safeParse({
    search: typeof req.query.search === 'string' ? req.query.search : undefined,
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    priority: typeof req.query.priority === 'string' ? req.query.priority : undefined,
    page: typeof req.query.page === 'string' ? req.query.page : '1',
    limit: typeof req.query.limit === 'string' ? req.query.limit : '50',
    sortBy: typeof req.query.sortBy === 'string' ? req.query.sortBy : 'created_at',
    sortOrder: typeof req.query.sortOrder === 'string' ? req.query.sortOrder : 'desc',
  })

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid project query parameters.',
      errors: parsed.error.issues,
    })
    return
  }

  const { search, status, priority, page, limit, sortBy, sortOrder } = parsed.data
  const conditions: string[] = ['(owner_id = $1 OR owner_id IS NULL)']
  const values: unknown[] = [userId]

  if (search) {
    values.push(`%${search}%`)
    conditions.push(`(name ILIKE $${values.length} OR description ILIKE $${values.length})`)
  }

  if (status) {
    values.push(status)
    conditions.push(`status = $${values.length}`)
  }

  if (priority) {
    values.push(priority)
    conditions.push(`priority = $${values.length}`)
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM projects ${whereClause}`,
    values,
  )

  const total = countResult.rows[0].total as number
  const offset = (page - 1) * limit
  const sortColumn = {
    created_at: 'created_at',
    updated_at: 'updated_at',
    name: 'name',
  }[sortBy]

  const dataValues = [...values, limit, offset]

  const result = await pool.query(
    `SELECT ${projectColumns}
     FROM projects
     ${whereClause}
     ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
     LIMIT $${values.length + 1}
     OFFSET $${values.length + 2}`,
    dataValues,
  )

  res.status(200).json({
    success: true,
    data: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
})

projectsRouter.post('/', async (req: Request, res: Response) => {
  const userId = req.session.userId!
  const userEmail = req.session.email!
  const clientIp = req.ip || '127.0.0.1'

  const workspace = await ensureUserWorkspace(userId, userEmail)
  if (workspace.currentRole === 'Viewer') {
    await recordSecurityLog(
      `Read-only Viewer ${userEmail} blocked from creating project`,
      clientIp,
      'blocked',
    )
    res.status(403).json({
      success: false,
      message: 'Viewer role does not have permission to create projects.',
    })
    return
  }

  const parsed = createProjectSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid project details.',
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    })
    return
  }

  const { name, description, status, priority } = parsed.data

  const result = await pool.query(
    `INSERT INTO projects (name, description, status, priority, owner_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${projectColumns}`,
    [name, description, status, priority, userId],
  )

  await recordSecurityLog(
    `Project "${name}" (${priority.toUpperCase()} SLA) created by ${userEmail}`,
    clientIp,
    'verified',
  )

  res.status(201).json({
    success: true,
    message: 'Project created successfully.',
    data: result.rows[0],
  })
})

projectsRouter.patch('/:id', async (req: Request, res: Response) => {
  const idResult = validateProjectId(req.params.id)
  if (!idResult.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid project ID.',
    })
    return
  }

  const userId = req.session.userId!
  const userEmail = req.session.email!
  const clientIp = req.ip || '127.0.0.1'

  const workspace = await ensureUserWorkspace(userId, userEmail)
  if (workspace.currentRole === 'Viewer') {
    res.status(403).json({
      success: false,
      message: 'Viewer role cannot modify projects.',
    })
    return
  }

  const parsed = updateProjectSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid project update.',
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    })
    return
  }

  const fields = Object.entries(parsed.data)
  const values = fields.map(([, value]) => value)
  values.push(idResult.data, userId)

  const setClause = fields
    .map(([field], index) => `${field} = $${index + 1}`)
    .join(', ')

  const result = await pool.query(
    `UPDATE projects
     SET ${setClause}, updated_at = NOW()
     WHERE id = $${values.length - 1} AND (owner_id = $${values.length} OR owner_id IS NULL)
     RETURNING ${projectColumns}`,
    values,
  )

  if (result.rowCount === 0) {
    res.status(404).json({
      success: false,
      message: 'Project not found or access denied.',
    })
    return
  }

  await recordSecurityLog(
    `Project "${result.rows[0].name}" updated by ${userEmail}`,
    clientIp,
    'verified',
  )

  res.status(200).json({
    success: true,
    message: 'Project updated successfully.',
    data: result.rows[0],
  })
})

projectsRouter.delete('/:id', async (req: Request, res: Response) => {
  const idResult = validateProjectId(req.params.id)
  if (!idResult.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid project ID.',
    })
    return
  }

  const userId = req.session.userId!
  const userEmail = req.session.email!
  const clientIp = req.ip || '127.0.0.1'

  const workspace = await ensureUserWorkspace(userId, userEmail)
  if (workspace.currentRole === 'Viewer') {
    res.status(403).json({
      success: false,
      message: 'Viewer role cannot delete projects.',
    })
    return
  }

  const result = await pool.query(
    `DELETE FROM projects
     WHERE id = $1 AND (owner_id = $2 OR owner_id IS NULL)
     RETURNING id, name`,
    [idResult.data, userId],
  )

  if (result.rowCount === 0) {
    res.status(404).json({
      success: false,
      message: 'Project not found or access denied.',
    })
    return
  }

  await recordSecurityLog(
    `Project "${result.rows[0].name}" permanently deleted by ${userEmail}`,
    clientIp,
    'monitored',
  )

  res.status(200).json({
    success: true,
    message: 'Project deleted successfully.',
    data: {
      id: result.rows[0].id,
    },
  })
})

export default projectsRouter
