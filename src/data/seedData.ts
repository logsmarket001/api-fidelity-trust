import bcrypt from "bcryptjs"
import dotenv from "dotenv"
import User, { UserRole } from "../models/User"
import Bank from "../models/Bank"
import { connectDB } from "../config/database"
import config from "../config/config"
import logger from "../utils/logger"

// Load environment variables
dotenv.config()

// Seed data
const seedData = async () => {
  try {
    // Connect to database
    await connectDB()

    // Clear existing data
    await User.deleteMany({})
    await Bank.deleteMany({})

    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", config.bcrypt.saltRounds)
    await User.create({
      firstName: "Admin",
      lastName: "User",
      email: "admin@fidelitytrust.com",
      password: adminPassword,
      role: UserRole.ADMIN,
      balance: 1000000,
      isEmailVerified: true,
    })

    // Create regular user
    const userPassword = await bcrypt.hash("password123", config.bcrypt.saltRounds)
    await User.create({
      firstName: "John",
      lastName: "Doe",
      email: "user@example.com",
      password: userPassword,
      role: UserRole.USER,
      balance: 5000,
      isEmailVerified: true,
    })

    // Create banks
    const banks = [
      { name: "Bank of America", code: "BOA", logoUrl: "https://via.placeholder.com/150?text=BOA", country: "USA" },
      { name: "Chase Bank", code: "CHASE", logoUrl: "https://via.placeholder.com/150?text=CHASE", country: "USA" },
      { name: "Wells Fargo", code: "WF", logoUrl: "https://via.placeholder.com/150?text=WF", country: "USA" },
      { name: "Citibank", code: "CITI", logoUrl: "https://via.placeholder.com/150?text=CITI", country: "USA" },
      { name: "Capital One", code: "CAP1", logoUrl: "https://via.placeholder.com/150?text=CAP1", country: "USA" },
    ]

    await Bank.insertMany(banks)

    logger.info("Data seeded successfully")
    process.exit()
  } catch (error) {
    logger.error(`Error seeding data: ${error}`)
    process.exit(1)
  }
}

// Run seed function
seedData()
