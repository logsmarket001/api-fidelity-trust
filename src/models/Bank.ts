import mongoose, { type Document, Schema } from "mongoose"

export interface IBank extends Document {
  name: string
  code: string
  logoUrl: string
  country: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const BankSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Bank name is required"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Bank code is required"],
      unique: true,
      trim: true,
    },
    logoUrl: {
      type: String,
      required: [true, "Logo URL is required"],
    },
    country: {
      type: String,
      default: "USA",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
)

// Create index for efficient querying
BankSchema.index({ country: 1, name: 1 })

export default mongoose.model<IBank>("Bank", BankSchema)
