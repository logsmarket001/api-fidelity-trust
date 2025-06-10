import type { Request, Response, NextFunction } from "express";
import UserStock from "../models/UserStock";
import User from "../models/User";
import { AppError } from "../utils/appError";
import { asyncHandler } from "../utils/asyncHandler";
import StockPurchase from "../models/StockPurchase";
import Transaction, {
  TransactionType,
  TransactionAction,
  TransactionStatus,
} from "../models/Transaction";
import mongoose from "mongoose";
import { notificationService } from "../services/notificationService";

// @desc    Get all stocks
// @route   GET /api/stocks
// @access  Public
// export const getAllStocks = asyncHandler(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const stocks = await Stock.find({ isActive: true }).sort({ symbol: 1 });

//     res.status(200).json({
//       success: true,
//       count: stocks.length,
//       data: stocks,
//     });
//   }
// );

// // @desc    Get stock by symbol
// // @route   GET /api/stocks/:symbol
// // @access  Public
// export const getStockBySymbol = asyncHandler(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const stock = await Stock.findOne({
//       symbol: req.params.symbol.toUpperCase(),
//       isActive: true,
//     });

//     if (!stock) {
//       return next(new AppError("Stock not found", 404));
//     }

//     res.status(200).json({
//       success: true,
//       data: stock,
//     });
//   }
// );

// @desc    Create stock
// @route   POST /api/stocks
// @access  Private/Admin
// export const createStock = asyncHandler(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const { symbol, name, price, description, sector, marketCap } = req.body;

//     // Check if stock already exists
//     const existingStock = await Stock.findOne({ symbol: symbol.toUpperCase() });
//     if (existingStock) {
//       return next(new AppError("Stock with this symbol already exists", 400));
//     }

//     const stock = await Stock.create({
//       symbol: symbol.toUpperCase(),
//       name,
//       price,
//       previousPrice: price,
//       description,
//       sector,
//       marketCap,
//     });

//     res.status(201).json({
//       success: true,
//       data: stock,
//     });
//   }
// );

// @desc    Update stock
// @route   PUT /api/stocks/:id
// @access  Private/Admin
// export const updateStock = asyncHandler(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const { name, price, description, sector, marketCap, isActive } = req.body;

//     const stock = await Stock.findById(req.params.id);

//     if (!stock) {
//       return next(new AppError("Stock not found", 404));
//     }

//     // Store previous price before updating
//     if (price && price !== stock.price) {
//       stock.previousPrice = stock.price;
//     }

//     const updatedStock = await Stock.findByIdAndUpdate(
//       req.params.id,
//       {
//         name: name || stock.name,
//         price: price || stock.price,
//         description: description || stock.description,
//         sector: sector || stock.sector,
//         marketCap: marketCap || stock.marketCap,
//         isActive: isActive !== undefined ? isActive : stock.isActive,
//       },
//       {
//         new: true,
//         runValidators: true,
//       }
//     );

//     res.status(200).json({
//       success: true,
//       data: updatedStock,
//     });
//   }
// );

// @desc    Buy stock
// @route   POST /api/stocks/:symbol/buy
// @access  Private
// export const buyStock = asyncHandler(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const { quantity, pin } = req.body;
//     const userId = (req as any).user._id;
//     const symbol = req.params.symbol.toUpperCase();

//     // Verify PIN
//     const user = await User.findById(userId).select("+pin");
//     if (!user) {
//       return next(new AppError("User not found", 404));
//     }

//     if (!user.pin || !(await user.comparePin(pin))) {
//       return next(new AppError("Invalid PIN", 401));
//     }

//     // Get stock
//     const stock = await Stock.findOne({ symbol, isActive: true });
//     if (!stock) {
//       return next(new AppError("Stock not found", 404));
//     }

//     const totalCost = stock.price * quantity;

//     // Check if user has sufficient balance
//     if (user.availableBalance < totalCost) {
//       return next(new AppError("Insufficient balance", 400));
//     }

//     // Check if user already owns this stock
//     let userStock = await UserStock.findOne({ userId, stockId: stock._id });

//     if (userStock) {
//       // Update existing position
//       const newTotalInvested = userStock.totalInvested + totalCost;
//       const newQuantity = userStock.quantity + quantity;
//       const newAveragePrice = newTotalInvested / newQuantity;

//       userStock.quantity = newQuantity;
//       userStock.averagePrice = newAveragePrice;
//       userStock.totalInvested = newTotalInvested;
//       userStock.currentValue = newQuantity * stock.price;
//       userStock.profitLoss = userStock.currentValue - userStock.totalInvested;
//       userStock.profitLossPercent =
//         (userStock.profitLoss / userStock.totalInvested) * 100;

//       await userStock.save();
//     } else {
//       // Create new position
//       userStock = await UserStock.create({
//         userId,
//         stockId: stock._id,
//         symbol,
//         quantity,
//         averagePrice: stock.price,
//         totalInvested: totalCost,
//         currentValue: totalCost,
//         profitLoss: 0,
//         profitLossPercent: 0,
//       });
//     }

//     // Update user balance
//     user.availableBalance -= totalCost;
//     user.currentBalance -= totalCost;
//     await user.save();

//     res.status(200).json({
//       success: true,
//       data: userStock,
//     });
//   }
// );

// @desc    Purchase stocks
// @route   POST /api/stocks/purchase
// @access  Private
export const purchaseStocks = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { stockId, quantity, purchasePrice, totalCost } = req.body;
    const userId = (req as any).user._id;

    // Validate required fields
    if (!stockId || !quantity || !purchasePrice || !totalCost) {
      return next(new AppError("Missing required fields", 400));
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Check if user has sufficient available balance
    if (user.availableBalance < totalCost) {
      return next(new AppError("Insufficient available balance", 400));
    }

    // Create transaction first
    const transaction = await Transaction.create({
      userId,
      type: TransactionType.STOCKS,
      subtype: "stock",
      action: TransactionAction.DEBIT,
      amount: totalCost,
      status: TransactionStatus.PENDING,
      data: {
        stockId,
        quantity,
        purchasePrice,
        description: "Stock purchase",
      },
    });

    // Create stock purchase record
    const purchase = await StockPurchase.create({
      userId,
      stockId,
      quantity,
      purchasePrice,
      totalCost,
      status: "active",
    });

    // Update transaction with purchase ID
    transaction.data.purchaseId = purchase._id;
    await transaction.save();

    // Update user balances
    user.availableBalance -= totalCost;
    user.currentBalance += totalCost;
    await user.save();

    res.status(201).json({
      success: true,
      data: {
        transaction: {
          id: transaction._id,
          type: transaction.type,
          subtype: transaction.subtype,
          action: transaction.action,
          amount: transaction.amount,
          status: transaction.status,
          data: transaction.data,
          createdAt: transaction.createdAt,
        },
        purchase: {
          id: purchase._id,
          userId: purchase.userId,
          stockId: purchase.stockId,
          quantity: purchase.quantity,
          purchasePrice: purchase.purchasePrice,
          totalCost: purchase.totalCost,
          purchaseDate: purchase.purchaseDate,
          status: purchase.status,
        },
      },
    });
  }
);

// @desc    Get user's stock portfolio
// @route   GET /api/stocks/portfolio/:userId
// @access  Private
export const getUserPortfolio = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.params.userId;

    // Get all purchases for the user
    const purchases = await StockPurchase.find({ userId }).sort({
      purchaseDate: -1,
    });

    console.log(purchases[0]._id);
    res.status(200).json({
      success: true,
      data: purchases.map((purchase) => ({
        id: purchase._id,
        userId: purchase.userId,
        stockId: purchase.stockId,
        quantity: purchase.quantity,
        purchasePrice: purchase.purchasePrice,
        totalCost: purchase.totalCost,
        purchaseDate: purchase.purchaseDate,
        status: purchase.status,
        createdAt: purchase.createdAt,
        updatedAt: purchase.updatedAt,
      })),
    });
  }
);

// @desc    Sell stocks
// @route   POST /api/stocks/sell
// @access  Private
export const sellStock = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("the reqbody", req.body);
    const { stockId, quantity, salePrice, totalValue } = req.body;
    const userId = (req as any).user._id;

    // Validate required fields - allow 0 values but ensure fields exist
    if (
      stockId === undefined ||
      quantity === undefined ||
      salePrice === undefined ||
      totalValue === undefined
    ) {
      return next(new AppError("Missing required fields", 400));
    }

    // Validate numeric fields are not negative
    if (quantity < 0 || salePrice < 0 || totalValue < 0) {
      return next(new AppError("Values cannot be negative", 400));
    }

    // Get the user's stock purchase
    const stockPurchase = await StockPurchase.findOne({
      _id: stockId,
      status: "active",
    });

    console.log("Found stock purchase:", stockPurchase);
    console.log("Looking for stockId:", stockId);

    if (!stockPurchase) {
      return next(new AppError("Stock not found in portfolio", 404));
    }

    // Start a transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create transaction record first
      const transaction = await Transaction.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId() },
        {
          userId,
          type: TransactionType.STOCKS,
          subtype: "stock_sale",
          action: TransactionAction.CREDIT,
          amount: totalValue,
          status: TransactionStatus.SUCCESS,
          data: {
            stockId,
            quantity,
            salePrice,
            totalValue,
            description: "Stock sale",
          },
        },
        { upsert: true, new: true, session }
      );

      // Update the stock purchase
      if (quantity === stockPurchase.quantity) {
        // If selling all shares, delete the record
        await StockPurchase.findByIdAndDelete(stockPurchase._id, { session });
      } else {
        // Otherwise update the quantity
        stockPurchase.quantity -= quantity;
        await stockPurchase.save({ session });
      }

      // Update user's balance
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      user.availableBalance += totalValue;
      user.currentBalance += totalValue;
      await user.save({ session });

      // Commit the transaction
      await session.commitTransaction();

      // Send notification

      notificationService.sendTransactionNotification(
        userId,
        transaction,
        "create"
      );

      // Return success response
      res.status(200).json({
        success: true,
        message: "Stock sold successfully",
      });
    } catch (error) {
      // Rollback on error
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
);
