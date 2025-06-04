import mongoose, { type Document, Schema } from "mongoose"
import bcrypt from "bcryptjs"
import config from "../config/config"

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId
  firstName: string
  lastName: string
  email: string
  password: string
  role: UserRole
  balance: number
  availableBalance: number
  currentBalance: number
  accountNumber: string
  isEmailVerified: boolean
  kycVerified: boolean
  pin?: string
  balanceVisibility: {
    available: boolean
    current: boolean
  }
  personalInfo?: {
    phone?: string
    address?: string
    city?: string
    state?: string
    zipCode?: string
    ssn?: string
    driverLicense?: string
  }
  lastLogin: Date
  createdAt: Date
  updatedAt: Date
  comparePassword(candidatePassword: string): Promise<boolean>
  comparePin(candidatePin: string): Promise<boolean>
}

const UserSchema: Schema = new Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
    balance: {
      type: Number,
      default: 0,
    },
    availableBalance: {
      type: Number,
      default: 0,
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    accountNumber: {
      type: String,
      unique: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    kycVerified: {
      type: Boolean,
      default: false,
    },
    pin: {
      type: String,
      select: false,
    },
    balanceVisibility: {
      available: {
        type: Boolean,
        default: true,
      },
      current: {
        type: Boolean,
        default: true,
      },
    },
    personalInfo: {
      phone: String,
      address: String,
      city: String,
      state: String,
      zipCode: String,
      ssn: {
        type: String,
        select: false,
      },
      driverLicense: {
        type: String,
        select: false,
      },
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

// Generate account number before saving
UserSchema.pre("save", async function (next) {
  if (!this.accountNumber) {
    // Generate a random 10-digit account number
    this.accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString()
  }
  next()
})

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next()
  }

  try {
    const salt = await bcrypt.genSalt(config.bcrypt.saltRounds)
    this.password = await bcrypt.hash(this.password as string, salt)
    next()
  } catch (error: any) {
    next(error)
  }
})

// Hash PIN before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("pin") || !this.pin) {
    return next()
  }

  try {
    const salt = await bcrypt.genSalt(config.bcrypt.saltRounds)
    this.pin = await bcrypt.hash(this.pin as string, salt)
    next()
  } catch (error: any) {
    next(error)
  }
})

// Method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password)
}

// Method to compare PIN
UserSchema.methods.comparePin = async function (candidatePin: string): Promise<boolean> {
  if (!this.pin) return false
  return bcrypt.compare(candidatePin, this.pin)
}

export default mongoose.model<IUser>("User", UserSchema)
