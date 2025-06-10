import { Router } from "express";
import {
  register,
  login,
  adminLogin,
  refreshToken,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  getCurrentUser,
  logout,
  updateUserInfo,
  changePin,
  seedAdmin,
  verifyUserForReset,
} from "../controllers/authController";
import { protect } from "../middlewares/authMiddleware";

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/admin-login", adminLogin);
router.post("/refresh-token", refreshToken);
router.post("/verify-user", verifyUserForReset);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/verify-email/:token", verifyEmail);
router.get("/seed-admin", seedAdmin);

// Protected routes
router.use(protect);
router.get("/me", getCurrentUser);
router.post("/logout", logout);
router.put("/change-password", changePassword);
router.put("/update-info", updateUserInfo);
router.put("/change-pin", changePin);

export default router;
