import dotenv from "dotenv"

// Load environment variables
dotenv.config()

const config = {
  server: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || "development",
  },
  database: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/fidelitytrust",
    testUri: process.env.MONGODB_URI_TEST || "mongodb://localhost:27017/fidelitytrust_test",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "default_jwt_secret",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "default_refresh_secret",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },
  bcrypt: {
    saltRounds: Number.parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10),
  },
  rateLimit: {
    windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minutes
    max: Number.parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || "info",
  },
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  },
  bankApi: {
    url: process.env.BANK_API_URL || "https://api.example.com/banks",
    key: process.env.BANK_API_KEY || "",
  },
}

export default config
