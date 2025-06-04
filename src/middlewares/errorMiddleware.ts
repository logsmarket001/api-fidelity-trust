import type { Request, Response, NextFunction } from "express"

interface AppError extends Error {
  statusCode?: number
  status?: string
  isOperational?: boolean
}

export const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction): void => {
  const error = { ...err }
  error.message = err.message

  // Log error
  console.error("Error:", err)

  // Default error
  if (!error.statusCode) {
    error.statusCode = 500
    error.message = "Internal Server Error"
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  })
}

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new Error(`Not found - ${req.originalUrl}`) as AppError
  error.statusCode = 404
  next(error)
}
