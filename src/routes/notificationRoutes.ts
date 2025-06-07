import express from "express";
import {
  getUserNotifications,
  getAdminNotifications,
  markNotificationsAsRead,
} from "../controllers/notificationController";
import { protect, admin } from "../middlewares/authMiddleware";

const router = express.Router();

// Protected routes
router.use(protect);

// User routes
router.get("/user/:userId", getUserNotifications);
router.post("/user/mark-read", markNotificationsAsRead);

// Admin routes
router.use(admin);
router.get("/admin", getAdminNotifications);
router.post("/admin/mark-read", markNotificationsAsRead);

export default router;
