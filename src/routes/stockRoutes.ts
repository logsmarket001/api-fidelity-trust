import { Router } from "express";
import {
  purchaseStocks,
  getUserPortfolio,
  sellStock,
} from "../controllers/stockController";
import { protect } from "../middlewares/authMiddleware";

const router = Router();

// Protected routes
router.use(protect);

// Stock routes
router.post("/purchase", purchaseStocks);
router.post("/sell", sellStock);
router.get("/portfolio/:userId", getUserPortfolio);

export default router;
