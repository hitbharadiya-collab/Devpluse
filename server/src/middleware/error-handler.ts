import type { ErrorRequestHandler, RequestHandler } from 'express'

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({
    success: false,
    message: 'The requested resource was not found.',
  })
}

export const errorHandler: ErrorRequestHandler = (
  _error,
  _req,
  res,
  _next,
) => {
  res.status(500).json({
    success: false,
    message: 'An unexpected server error occurred.',
  })
}
