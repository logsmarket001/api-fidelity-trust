import type { Request, Response, NextFunction } from "express"
import Stock from "../models/Stock"
import UserStock from "../models/UserStock"
import User from "../models/User"
import { AppError } from "../utils/appError"
import { asyncHandler } from "../utils/asyncHandler"

// @desc    Get all stocks
// @route   GET /api/stocks
// @access  Public
export const getAllStocks = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const stocks = await Stock.find({ isActive: true }).sort({ symbol: 1 })

  res.status(200).json({
    success: true,
    count: stocks.length,
    data: stocks,
  })
})

// @desc    Get stock by symbol
// @route   GET /api/stocks/:symbol
// @access  Public
export const getStockBySymbol = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const stock = await Stock.findOne({ symbol: req.params.symbol.toUpperCase(), isActive: true })

  if (!stock) {
    return next(new AppError("Stock not found", 404))
  }

  res.status(200).json({
    success: true,
    data: stock,
  })
})

// @desc    Create stock
// @route   POST /api/stocks
// @access  Private/Admin
export const createStock = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { symbol, name, price, description, sector, marketCap } = req.body

  // Check if stock already exists
  const existingStock = await Stock.findOne({ symbol: symbol.toUpperCase() })
  if (existingStock) {
    return next(new AppError("Stock with this symbol already exists", 400))
  }

  const stock = await Stock.create({
    symbol: symbol.toUpperCase(),
    name,
    price,
    previousPrice: price,
    description,
    sector,
    marketCap,
  })

  res.status(201).json({
    success: true,
    data: stock,
  })
})

// @desc    Update stock
// @route   PUT /api/stocks/:id
// @access  Private/Admin
export const updateStock = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { name, price, description, sector, marketCap, isActive } = req.body

  const stock = await Stock.findById(req.params.id)

  if (!stock) {
    return next(new AppError("Stock not found", 404))
  }

  // Store previous price before updating
  if (price && price !== stock.price) {
    stock.previousPrice = stock.price
  }

  const updatedStock = await Stock.findByIdAndUpdate(
    req.params.id,
    {
      name: name || stock.name,
      price: price || stock.price,
      description: description || stock.description,
      sector: sector || stock.sector,
      marketCap: marketCap || stock.marketCap,
      isActive: isActive !== undefined ? isActive : stock.isActive,
    },
    {
      new: true,
      runValidators: true,
    },
  )

  res.status(200).json({
    success: true,
    data: updatedStock,
  })
})

// @desc    Buy stock
// @route   POST /api/stocks/:symbol/buy
// @access  Private
export const buyStock = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { quantity, pin } = req.body
  const userId = (req as any).user._id
  const symbol = req.params.symbol.toUpperCase()

  // Verify PIN
  const user = await User.findById(userId).select("+pin")
  if (!user) {
    return next(new AppError("User not found", 404))
  }

  if (!user.pin || !(await user.comparePin(pin))) {
    return next(new AppError("Invalid PIN", 401))
  }

  // Get stock
  const stock = await Stock.findOne({ symbol, isActive: true })
  if (!stock) {
    return next(new AppError("Stock not found", 404))
  }

  const totalCost = stock.price * quantity

  // Check if user has sufficient balance
  if (user.availableBalance < totalCost) {
    return next(new AppError("Insufficient balance", 400))
  }

  // Check if user already owns this stock
  let userStock = await UserStock.findOne({ userId, stockId: stock._id })

  if (userStock) {
    // Update existing position
    const newTotalInvested = userStock.totalInvested + totalCost
    const newQuantity = userStock.quantity + quantity
    const newAveragePrice = newTotalInvested / newQuantity

    userStock.quantity = newQuantity
    userStock.averagePrice = newAveragePrice
    userStock.totalInvested = newTotalInvested
    userStock.currentValue = newQuantity * stock.price
    userStock.profitLoss = userStock.currentValue - userStock.totalInvested
    userStock.profitLossPercent = (userStock.profitLoss / userStock.totalInvested) * 100

    await userStock.save()
  } else {
    // Create new position
    userStock = await UserStock.create({
      userId,
      stockId: stock._id,
      symbol,
      quantity,
      averagePrice: stock.price,
      totalInvested: totalCost,
      currentValue: totalCost,
      profitLoss: 0,
      profitLossPercent: 0,
    })
  }

  // Update user balance
  user.availableBalance -= totalCost
  user.currentBalance -= totalCost
  await user.save()

  res.status(200).json({
    success: true,
    data: userStock,
  })
})

// @desc    Get user portfolio
// @route   GET /api/stocks/portfolio
// @access  Private
export const getUserPortfolio = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user._id

  const portfolio = await UserStock.find({ userId, quantity: { $gt: 0 } })
    .populate("stockId", "name price change changePercent")
    .sort({ symbol: 1 })

  // Update current values
  for (const position of portfolio) {
    const stock = position.stockId as any
    position.currentValue = position.quantity * stock.price
    position.profitLoss = position.currentValue - position.totalInvested
    position.profitLossPercent = (position.profitLoss / position.totalInvested) * 100
    await position.save()
  }

  res.status(200).json({
    success: true,
    count: portfolio.length,
    data: portfolio,
  })
})

// @desc    Delete stock
// @route   DELETE /api/stocks/:id
// @access  Private/Admin
export const deleteStock = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const stock = await Stock.findById(req.params.id)

  if (!stock) {
    return next(new AppError("Stock not found", 404))
  }

  // Soft delete by setting isActive to false
  stock.isActive = false
  await stock.save()

  res.status(200).json({
    success: true,
    message: "Stock deactivated successfully",
  })
})
