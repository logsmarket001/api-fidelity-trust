import { Router } from "express"
import { getAllBanks, getBankById, createBank, updateBank, deleteBank, syncBanks } from "../controllers/bankController"
import { protect, admin } from "../middlewares/authMiddleware"

const router = Router()

// Public routes
router.get("/", getAllBanks)
router.get("/:id", getBankById)

// Admin routes
router.use(protect, admin)
router.post("/", createBank)
router.post("/sync", syncBanks)
router.route("/:id").put(updateBank).delete(deleteBank)

export default router
