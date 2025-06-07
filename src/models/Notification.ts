import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: "transaction" | "system" | "alert";
  isRead: boolean;
  metadata?: {
    transactionId?: mongoose.Types.ObjectId;
    action?: string;
    amount?: number;
    currency?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["transaction", "system", "alert"],
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    metadata: {
      transactionId: {
        type: Schema.Types.ObjectId,
        ref: "Transaction",
      },
      action: String,
      amount: Number,
      currency: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ isRead: 1 });

export default mongoose.model<INotification>(
  "Notification",
  NotificationSchema
);
