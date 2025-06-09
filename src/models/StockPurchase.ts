import mongoose, { type Document, Schema } from "mongoose";

export interface IStockPurchase extends Document {
  userId: mongoose.Types.ObjectId;
  stockId: string;
  quantity: number;
  purchasePrice: number;
  totalCost: number;
  purchaseDate: Date;
  status: "active" | "sold";
  createdAt: Date;
  updatedAt: Date;
}

const StockPurchaseSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    stockId: {
      type: String,
      required: [true, "Stock ID is required"],
      trim: true,
      uppercase: true,
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    purchasePrice: {
      type: Number,
      required: [true, "Purchase price is required"],
      min: [0.01, "Purchase price must be greater than 0"],
    },
    totalCost: {
      type: Number,
      required: [true, "Total cost is required"],
      min: [0.01, "Total cost must be greater than 0"],
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "sold"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for efficient querying
StockPurchaseSchema.index({ userId: 1 });
StockPurchaseSchema.index({ stockId: 1 });
StockPurchaseSchema.index({ status: 1 });

export default mongoose.model<IStockPurchase>(
  "StockPurchase",
  StockPurchaseSchema
);
