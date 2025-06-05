import { Router } from "express"
import authRoutes from "./authRoutes"
import bankRoutes from "./bankRoutes"
import transactionRoutes from "./transactionRoutes"
import chatRoutes from "./chatRoutes"
import userRoutes from "./userRoutes"
import stockRoutes from "./stockRoutes"

const router = Router()

// Root route
router.get("/", (req, res) => {
  res.json({
    message: "FidelityTrust API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  })
})

// Test route
router.get("/test", (req, res) => {
  res.json({
    message: "API test successful",
    environment: process.env.NODE_ENV || "development",
  })
})

// Static route usage
router.use("/auth", authRoutes)
router.use("/banks", bankRoutes)
router.use("/transaction", transactionRoutes)
router.use("/chat", chatRoutes)
router.use("/user", userRoutes)
router.use("/stocks", stockRoutes)

export default router
