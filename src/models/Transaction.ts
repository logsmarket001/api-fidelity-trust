import mongoose, { type Document, Schema } from "mongoose";

export enum TransactionType {
  FUND_WALLET = "fundWallet",
  SEND_MONEY = "sendMoney",
  WITHDRAW = "withdraw",
  CREDIT = "credit",
  DEBIT = "debit",
  STOCKS = "stocks",
}

export enum TransactionAction {
  CREDIT = "credit",
  DEBIT = "debit",
}

export enum TransactionStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
}

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: TransactionType;
  subtype: string;
  action: TransactionAction;
  status: TransactionStatus;
  amount: number;
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: [true, "Transaction type is required"],
    },
    subtype: {
      type: String,
      required: [true, "Transaction subtype is required"],
    },
    action: {
      type: String,
      enum: Object.values(TransactionAction),
      required: [true, "Transaction action is required"],
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
      required: [true, "Transaction status is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    data: {
      type: Schema.Types.Mixed,
      required: [true, "Transaction data is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for efficient querying
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ type: 1 });
TransactionSchema.index({ action: 1 });
TransactionSchema.index({ status: 1 });

export default mongoose.model<ITransaction>("Transaction", TransactionSchema);
