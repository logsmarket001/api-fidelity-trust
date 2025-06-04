import mongoose from "mongoose";

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/fidelitytrust";

    console.log("Attempting to connect to MongoDB...", mongoURI);

    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 5, // Maintain at least 5 socket connections
      retryWrites: true,
      retryReads: true,
    });

    // Check if the connection is actually established
    if (mongoose.connection.readyState === 1) {
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } else {
      throw new Error("MongoDB connection not fully established");
    }
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);

    // Handle specific DNS resolution errors
    if (error instanceof Error && error.message.includes("querySrv")) {
      console.error(
        "DNS resolution failed. Please check your MongoDB Atlas connection string and network connectivity."
      );
    }

    // If MongoDB is not available, continue without it for development
    if (process.env.NODE_ENV === "development") {
      console.warn("⚠️  Continuing without MongoDB in development mode");
      return;
    }

    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  } catch (error) {
    console.error("Error disconnecting from MongoDB:", error);
  }
};
