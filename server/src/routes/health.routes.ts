import { Router } from 'express'

const healthRouter = Router()

healthRouter.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'DevPulse API is running.',
    timestamp: new Date().toISOString(),
  })
})

export default healthRouter
