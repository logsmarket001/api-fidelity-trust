import express, { type Express } from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";

// Load environment variables first
dotenv.config();

console.log("Starting FidelityTrust Backend...");

// Initialize Express app
const app: Express = express();
const httpServer = createServer(app);

// Basic middleware first
// app.use(helmet()) // Security headers
app.use(express.json({ limit: "10mb" })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: "10mb" })); // Parse URL-encoded bodies
app.use(morgan("dev")); // HTTP request logger

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

    // Import and initialize Socket.IO
    const { initializeSocketIO } = await import("./websocket/socket");
    initializeSocketIO(httpServer);

    console.log("Socket.IO initialized");

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
