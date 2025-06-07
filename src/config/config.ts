import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const config = {
  server: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || "development",
  },
  database: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/fidelitytrust",
    testUri:
      process.env.MONGODB_URI_TEST ||
      "mongodb://localhost:27017/fidelitytrust_test",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "your-super-secret-jwt-key-here",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || "your-super-secret-refresh-key-here",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },
  bcrypt: {
    saltRounds: Number.parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10),
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
    key: process.env.BANK_API_KEY || "your-bank-api-key-here",
  },
  email: {
    smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
    smtpPort: parseInt(process.env.SMTP_PORT || "587"),
    smtpUser: process.env.SMTP_USER || "",
    smtpPass: process.env.SMTP_PASS || "",
    from:
      process.env.EMAIL_FROM || "Fidelity Trust <noreply@fidelitytrust.com>",
    fromName: process.env.EMAIL_FROM_NAME || "Fidelity Trust",
    appUrl: process.env.APP_URL || "http://localhost:3000",
  },
  app: {
    appStoreLink:
      process.env.APP_STORE_LINK || "https://apps.apple.com/app/fidelity-trust",
    playStoreLink:
      process.env.PLAY_STORE_LINK ||
      "https://play.google.com/store/apps/details?id=com.fidelitytrust.app",
  },
};

export default config;
