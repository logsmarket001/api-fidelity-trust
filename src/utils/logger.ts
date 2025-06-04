import winston from "winston"
import path from "path"
import fs from "fs"

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), "logs")
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true })
  } catch (error) {
    console.warn("Could not create logs directory:", error)
  }
}

// Define log format
const logFormat = winston.format.printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`
})

// Create logger with error handling
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    logFormat,
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false,
})

// Add file transports only if logs directory exists
if (fs.existsSync(logsDir)) {
  try {
    logger.add(
      new winston.transports.File({
        filename: path.join(logsDir, "error.log"),
        level: "error",
        handleExceptions: true,
      }),
    )
    logger.add(
      new winston.transports.File({
        filename: path.join(logsDir, "combined.log"),
        handleExceptions: true,
      }),
    )
  } catch (error) {
    console.warn("Could not add file transports to logger:", error)
  }
}

// Fallback console logging if winston fails
const safeLogger = {
  info: (message: string, ...args: any[]) => {
    try {
      logger.info(message, ...args)
    } catch (error) {
      console.log(`INFO: ${message}`, ...args)
    }
  },
  error: (message: string, ...args: any[]) => {
    try {
      logger.error(message, ...args)
    } catch (error) {
      console.error(`ERROR: ${message}`, ...args)
    }
  },
  warn: (message: string, ...args: any[]) => {
    try {
      logger.warn(message, ...args)
    } catch (error) {
      console.warn(`WARN: ${message}`, ...args)
    }
  },
  debug: (message: string, ...args: any[]) => {
    try {
      logger.debug(message, ...args)
    } catch (error) {
      console.debug(`DEBUG: ${message}`, ...args)
    }
  },
}

export default safeLogger
