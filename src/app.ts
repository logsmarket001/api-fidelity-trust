import express, { type Express } from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";
import { initializeSocketIO } from "./websocket/socket";

dotenv.config();

console.log("Starting FidelityTrust Backend...");

const app: Express = express();
const httpServer = createServer(app);

// CORS configuration
app.use(
  cors({
    origin: [
      "https://fidelitytrusts.org", // your custom domain
      "https://fidelity-trust-frontend-testing.vercel.app",
      "https://localhost:3000",
    ],
    credentials: true,
    methods: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  })
);

// Middleware
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (early)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Initialize database and other services
async function initializeServer() {
  try {
    console.log("Initializing database connection...");

    // Import and connect to database
    const { connectDB } = await import("./config/database");
    await connectDB();

    console.log("Database connected successfully");

    // Initialize Socket.IO with all namespaces
    initializeSocketIO(httpServer);
    console.log("Socket.IO initialized with all namespaces");

    // Import and setup routes
    const routes = await import("./routes");
    app.use("/api", routes.default);

    console.log("Routes initialized");

    // Error handling middleware (must be last)
    const { errorHandler } = await import("./middlewares/errorMiddleware");
    app.use(errorHandler);

    console.log("Error handlers initialized");
  } catch (error) {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  }
}

// Initialize server
initializeServer();

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err: Error) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  // Close server & exit process
  httpServer.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on("uncaughtException", (err: Error) => {
  console.error(`❌ Uncaught Exception: ${err.message}`);
  process.exit(1);
});

export default httpServer;

// POST /api/auth/admin-login
// {
//   "email": "admin@fidelitytrust.com",
//   "password": "admin123"
// }
