import { Router } from "express";
import {
  getAllTransactions,
  getTransactionById,
  getUserTransactions,
  createTransaction,
  fundWallet,
  withdraw,
  sendMoney,
  updateTransaction,
  getAdminTransactionById,
} from "../controllers/transactionController";
import { protect, admin } from "../middlewares/authMiddleware";

const router = Router();

// Protected routes
router.use(protect);

// User routes
router.get("/user", getUserTransactions);
router.post("/fund", fundWallet);
router.post("/withdraw", withdraw);
router.post("/send", sendMoney);
router.get("/:id", getTransactionById);

// Admin routes
router.use(admin);
router.get("/admin/get-all-transactions", getAllTransactions);
router.get("/admin/get-transaction-by-id/:id", getAdminTransactionById);
router.post("/admin/create-transaction", createTransaction);
router.put("/admin/update-transaction-by-id/:id", updateTransaction);

export default router;
