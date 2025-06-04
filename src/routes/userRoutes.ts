import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateProfile,
  verifyPin,
  getUserBalances,
  seedUsers,
  getUsersForTransfer,
  getCurrentUserDetails,
} from "../controllers/userController";
import { protect, admin } from "../middlewares/authMiddleware";

const router = Router();

// Protected routes
router.use(protect);

// User routes
router.get("/me", getCurrentUserDetails);
router.get("/balances", getUserBalances);
router.put("/profile", updateProfile);
router.post("/verify-pin", verifyPin);
router.get("/transfer-list", getUsersForTransfer);

// Admin routes
router.use(admin);
router.get("/admin/get-all-users", getAllUsers);
router.get("/admin/get-single-user/:id", getUserById);
router.post("/admin/create-user", createUser);
router.put("/admin/update-user/:id", updateUser);
router.delete("admin/delete-user/:id", deleteUser);
router.post("/seed", seedUsers);

export default router;
