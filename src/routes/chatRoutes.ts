import { Router } from "express"
import {
  getUserMessages,
  getAllMessages,
  getUserMessagesByUserId,
  sendMessage,
  sendAdminMessage,
  markMessagesAsRead,
  markAdminMessagesAsRead,
} from "../controllers/chatController"
import { protect, admin } from "../middlewares/authMiddleware"

const router = Router()

// Protected routes
router.use(protect)

// User routes
router.get("/messages", getUserMessages)
router.post("/messages", sendMessage)
router.put("/messages/read", markMessagesAsRead)

// Admin routes
router.use(admin)
router.get("/admin/messages", getAllMessages)
router.get("/admin/messages/:userId", getUserMessagesByUserId)
router.post("/admin/messages", sendAdminMessage)
router.put("/admin/messages/:userId/read", markAdminMessagesAsRead)

export default router
