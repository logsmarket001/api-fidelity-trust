import mongoose, { type Document, Schema } from "mongoose";

export interface IStock extends Document {
  symbol: string;
  name: string;
  price: number;
  previousPrice: number;
  change: number;
  changePercent: number;
  description?: string;
  sector?: string;
  marketCap?: number;
  volume?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StockSchema: Schema = new Schema(
  {
    symbol: {
      type: String,
      required: [true, "Stock symbol is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Stock name is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Stock price is required"],
      min: [0, "Price must be positive"],
    },
    previousPrice: {
      type: Number,
      default: 0,
    },
    change: {
      type: Number,
      default: 0,
    },
    changePercent: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      trim: true,
    },
    sector: {
      type: String,
      trim: true,
    },
    marketCap: {
      type: Number,
      min: 0,
    },
    volume: {
      type: Number,
      min: 0,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate change and changePercent before saving
StockSchema.pre("save", function (next) {
  const stock = this as unknown as IStock;

  if (stock.isModified("price") && stock.previousPrice > 0) {
    stock.change = stock.price - stock.previousPrice;
    stock.changePercent = (stock.change / stock.previousPrice) * 100;
  }

  next();
});

export default mongoose.model<IStock>("Stock", StockSchema);
