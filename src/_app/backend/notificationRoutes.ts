import express from "express";
import {
  getUserNotifications,
  getAdminNotifications,
  markNotificationsAsRead,
} from "../controllers/notificationController";
import { authenticateToken, isAdmin } from "../middleware/auth";

const router = express.Router();

// User routes
router.get("/user", authenticateToken, getUserNotifications);
router.post("/user/mark-read", authenticateToken, markNotificationsAsRead);

// Admin routes
router.get("/admin", authenticateToken, isAdmin, getAdminNotifications);
router.post("/admin/mark-read", authenticateToken, isAdmin, markNotificationsAsRead);

export default router; 