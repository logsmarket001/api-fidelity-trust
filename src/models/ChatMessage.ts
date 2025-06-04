import mongoose, { type Document, Schema } from "mongoose"

export interface IChatMessage extends Document {
  userId: mongoose.Types.ObjectId
  message: string
  isUser: boolean
  isRead: boolean
  createdAt: Date
  updatedAt: Date
}

const ChatMessageSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
    },
    isUser: {
      type: Boolean,
      default: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

// Create index for efficient querying
ChatMessageSchema.index({ userId: 1, createdAt: 1 })

export default mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema)
