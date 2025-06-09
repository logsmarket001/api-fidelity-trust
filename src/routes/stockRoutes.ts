import { Router } from "express";
import {
  purchaseStocks,
  getUserPortfolio,
} from "../controllers/stockController";
import { protect } from "../middlewares/authMiddleware";

const router = Router();

// Protected routes
router.use(protect);

// Stock routes
router.post("/purchase", purchaseStocks);
router.get("/portfolio/:userId", getUserPortfolio);

export default router;
