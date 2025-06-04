import mongoose, { type Document, Schema } from "mongoose"

export enum CardType {
  VISA = "visa",
  MASTERCARD = "mastercard",
}

export enum CardStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  BLOCKED = "blocked",
}

export interface ICard extends Document {
  userId: mongoose.Types.ObjectId
  cardNumber: string
  cardType: CardType
  expiryDate: string
  cvv: string
  status: CardStatus
  createdAt: Date
  updatedAt: Date
}

const CardSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    cardNumber: {
      type: String,
      required: [true, "Card number is required"],
      unique: true,
    },
    cardType: {
      type: String,
      enum: Object.values(CardType),
      required: [true, "Card type is required"],
    },
    expiryDate: {
      type: String,
      required: [true, "Expiry date is required"],
      match: [/^(0[1-9]|1[0-2])\/([0-9]{2})$/, "Please provide a valid expiry date (MM/YY)"],
    },
    cvv: {
      type: String,
      required: [true, "CVV is required"],
      match: [/^[0-9]{3,4}$/, "Please provide a valid CVV"],
      select: false,
    },
    status: {
      type: String,
      enum: Object.values(CardStatus),
      default: CardStatus.ACTIVE,
    },
  },
  {
    timestamps: true,
  },
)

// Create index for efficient querying
CardSchema.index({ userId: 1 })

export default mongoose.model<ICard>("Card", CardSchema)
