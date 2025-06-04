import { Router } from "express"
import {
  getAllStocks,
  getStockBySymbol,
  createStock,
  updateStock,
  buyStock,
  getUserPortfolio,
  deleteStock,
} from "../controllers/stockController"
import { protect, admin } from "../middlewares/authMiddleware"

const router = Router()

// Public routes
router.get("/", getAllStocks)
router.get("/:symbol", getStockBySymbol)

// Protected routes
router.use(protect)
router.get("/portfolio/user", getUserPortfolio)
router.post("/:symbol/buy", buyStock)

// Admin routes
router.use(admin)
router.post("/", createStock)
router.put("/:id", updateStock)
router.delete("/:id", deleteStock)

export default router
