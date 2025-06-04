import mongoose, { type Document, Schema } from "mongoose"

export interface IUserStock extends Document {
  userId: mongoose.Types.ObjectId
  stockId: mongoose.Types.ObjectId
  symbol: string
  quantity: number
  averagePrice: number
  totalInvested: number
  currentValue: number
  profitLoss: number
  profitLossPercent: number
  createdAt: Date
  updatedAt: Date
}

const UserStockSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    stockId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stock",
      required: [true, "Stock ID is required"],
    },
    symbol: {
      type: String,
      required: [true, "Stock symbol is required"],
      uppercase: true,
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity must be positive"],
    },
    averagePrice: {
      type: Number,
      required: [true, "Average price is required"],
      min: [0, "Average price must be positive"],
    },
    totalInvested: {
      type: Number,
      required: [true, "Total invested is required"],
      min: [0, "Total invested must be positive"],
    },
    currentValue: {
      type: Number,
      default: 0,
    },
    profitLoss: {
      type: Number,
      default: 0,
    },
    profitLossPercent: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
)

// Create compound index for efficient querying
UserStockSchema.index({ userId: 1, stockId: 1 }, { unique: true })
UserStockSchema.index({ userId: 1 })
UserStockSchema.index({ symbol: 1 })

export default mongoose.model<IUserStock>("UserStock", UserStockSchema)
