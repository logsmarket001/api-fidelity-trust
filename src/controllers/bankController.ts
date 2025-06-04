import type { Request, Response, NextFunction } from "express"
import axios from "axios"
import Bank from "../models/Bank"
import { AppError } from "../utils/appError"
import { asyncHandler } from "../utils/asyncHandler"
import config from "../config/config"

// @desc    Get all banks
// @route   GET /api/banks
// @access  Public
export const getAllBanks = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const banks = await Bank.find({ isActive: true }).sort({ name: 1 })

  res.status(200).json({
    success: true,
    count: banks.length,
    data: banks,
  })
})

// @desc    Get bank by ID
// @route   GET /api/banks/:id
// @access  Public
export const getBankById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const bank = await Bank.findById(req.params.id)

  if (!bank) {
    return next(new AppError("Bank not found", 404))
  }

  res.status(200).json({
    success: true,
    data: bank,
  })
})

// @desc    Create bank
// @route   POST /api/banks
// @access  Private/Admin
export const createBank = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { name, code, logoUrl, country } = req.body

  // Check if bank already exists
  const bankExists = await Bank.findOne({ code })
  if (bankExists) {
    return next(new AppError("Bank already exists", 400))
  }

  // Create new bank
  const bank = await Bank.create({
    name,
    code,
    logoUrl,
    country: country || "USA",
    isActive: true,
  })

  res.status(201).json({
    success: true,
    data: bank,
  })
})

// @desc    Update bank
// @route   PUT /api/banks/:id
// @access  Private/Admin
export const updateBank = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { name, code, logoUrl, country, isActive } = req.body

  // Find bank by id
  let bank = await Bank.findById(req.params.id)

  if (!bank) {
    return next(new AppError("Bank not found", 404))
  }

  // Update bank
  bank = await Bank.findByIdAndUpdate(
    req.params.id,
    {
      name: name || bank.name,
      code: code || bank.code,
      logoUrl: logoUrl || bank.logoUrl,
      country: country || bank.country,
      isActive: isActive !== undefined ? isActive : bank.isActive,
    },
    {
      new: true,
      runValidators: true,
    },
  )

  res.status(200).json({
    success: true,
    data: bank,
  })
})

// @desc    Delete bank
// @route   DELETE /api/banks/:id
// @access  Private/Admin
export const deleteBank = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const bank = await Bank.findById(req.params.id)

  if (!bank) {
    return next(new AppError("Bank not found", 404))
  }

  await bank.deleteOne()

  res.status(200).json({
    success: true,
    message: "Bank deleted successfully",
  })
})

// @desc    Sync banks from external API
// @route   POST /api/banks/sync
// @access  Private/Admin
export const syncBanks = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Fetch banks from external API
    const response = await axios.get(config.bankApi.url, {
      headers: {
        Authorization: `Bearer ${config.bankApi.key}`,
      },
    })

    const externalBanks = response.data.data || []

    // Process each bank
    let addedCount = 0
    let updatedCount = 0

    for (const externalBank of externalBanks) {
      const existingBank = await Bank.findOne({ code: externalBank.code })

      if (existingBank) {
        // Update existing bank
        await Bank.findByIdAndUpdate(existingBank._id, {
          name: externalBank.name,
          logoUrl: externalBank.logo || existingBank.logoUrl,
          country: externalBank.country || "USA",
        })
        updatedCount++
      } else {
        // Create new bank
        await Bank.create({
          name: externalBank.name,
          code: externalBank.code,
          logoUrl: externalBank.logo || "https://via.placeholder.com/150",
          country: externalBank.country || "USA",
          isActive: true,
        })
        addedCount++
      }
    }

    res.status(200).json({
      success: true,
      message: `Banks synced successfully. Added: ${addedCount}, Updated: ${updatedCount}`,
    })
  } catch (error) {
    // If external API fails, return mock banks
    const mockBanks = [
      { name: "Bank of America", code: "BOA", logoUrl: "https://via.placeholder.com/150?text=BOA", country: "USA" },
      { name: "Chase Bank", code: "CHASE", logoUrl: "https://via.placeholder.com/150?text=CHASE", country: "USA" },
      { name: "Wells Fargo", code: "WF", logoUrl: "https://via.placeholder.com/150?text=WF", country: "USA" },
      { name: "Citibank", code: "CITI", logoUrl: "https://via.placeholder.com/150?text=CITI", country: "USA" },
      { name: "Capital One", code: "CAP1", logoUrl: "https://via.placeholder.com/150?text=CAP1", country: "USA" },
    ]

    let addedCount = 0
    let updatedCount = 0

    for (const mockBank of mockBanks) {
      const existingBank = await Bank.findOne({ code: mockBank.code })

      if (existingBank) {
        updatedCount++
      } else {
        await Bank.create({
          ...mockBank,
          isActive: true,
        })
        addedCount++
      }
    }

    res.status(200).json({
      success: true,
      message: `Mock banks added. Added: ${addedCount}, Updated: ${updatedCount}`,
    })
  }
})
