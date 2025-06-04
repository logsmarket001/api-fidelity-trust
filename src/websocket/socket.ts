import { Server as SocketIOServer } from "socket.io"
import type { Server as HTTPServer } from "http"

let io: SocketIOServer

export const initializeSocketIO = (httpServer: HTTPServer): SocketIOServer => {
  try {
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
    })

    io.on("connection", (socket) => {
      console.log(`✅ User connected: ${socket.id}`)

      // Join user to their room
      socket.on("join", (userId: string) => {
        socket.join(userId)
        console.log(`User ${userId} joined room`)
      })

      // Handle chat messages
      socket.on("message", (data) => {
        console.log("Message received:", data)
        // Broadcast to all connected clients for now
        io.emit("message", data)
      })

      socket.on("disconnect", () => {
        console.log(`❌ User disconnected: ${socket.id}`)
      })
    })

    console.log("✅ Socket.IO initialized successfully")
    return io
  } catch (error) {
    console.error("❌ Failed to initialize Socket.IO:", error)
    throw error
  }
}

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error("Socket.IO not initialized")
  }
  return io
}
