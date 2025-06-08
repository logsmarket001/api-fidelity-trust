import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import User from "../models/User";
import Notification from "../models/Notification";
import mongoose from "mongoose";

let io: SocketIOServer;
//const ORIGIN = "http://localhost:3000";
const ORIGIN = "https://fidelitytrust.org";

// Store online users
const onlineUsers = new Map<string, string>(); // userId -> socketId
const notificationUsers = new Map<string, string>(); // userId -> socketId

export const initializeSocketIO = (httpServer: HTTPServer): SocketIOServer => {
  try {
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: ORIGIN,
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // USER NAMESPACE
    const userNamespace = io.of("/user");
    userNamespace.on("connection", (socket) => {
      socket.on("join", async (userId: string) => {
        socket.join(userId);
        onlineUsers.set(userId, socket.id);
        userNamespace.to("/admin").emit("user_status", {
          userId,
          status: "online",
        });

        const user = await User.findById(userId).select(
          "firstName lastName email"
        );
        if (user) {
          io.of("/admin").emit("user_joined", {
            userId,
            user: {
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
            },
          });
        }
      });

      socket.on("typing", ({ userId, isTyping }) => {
        io.of("/admin").emit(isTyping ? "user_typing" : "user_stopped_typing", {
          userId,
        });
      });

      socket.on("message", ({ userId, message }) => {
        const transformedMessage = {
          _id: message._id,
          content: message.content || message.message,
          sender: "customer",
          timestamp: message.timestamp || message.createdAt,
          isRead: message.isRead || false,
          userId: message.userId || userId,
        };

        io.of("/admin").emit("new_message", transformedMessage);
      });

      socket.on("mark_read", ({ userId, messageIds }) => {
        io.of("/admin").emit("messages_read", { userId, messageIds });
      });

      socket.on("disconnect", () => {
        for (const [userId, socketId] of onlineUsers.entries()) {
          if (socketId === socket.id) {
            onlineUsers.delete(userId);
            io.of("/admin").emit("user_status", {
              userId,
              status: "offline",
            });
            break;
          }
        }
      });
    });

    // ADMIN NAMESPACE
    const adminNamespace = io.of("/admin");
    adminNamespace.on("connection", (socket) => {
      socket.on("admin_typing", ({ userId, isTyping }) => {
        io.of("/user")
          .to(userId)
          .emit(isTyping ? "admin_typing" : "admin_stopped_typing");
      });

      socket.on("message", ({ userId, message }) => {
        const transformedMessage = {
          _id: message._id,
          content: message.content || message.message,
          sender: "admin",
          timestamp: message.timestamp || message.createdAt,
          isRead: message.isRead || false,
          userId: message.userId || userId,
        };

        io.of("/user").to(userId).emit("new_message", transformedMessage);
      });

      socket.on("admin_mark_read", ({ userId, messageIds }) => {
        io.of("/user").to(userId).emit("admin_read_messages", { messageIds });
      });
    });

    // USER NOTIFICATION NAMESPACE
    const userNotificationNamespace = io.of("/user-notifications");
    userNotificationNamespace.on("connection", (socket) => {
      socket.on("join", (userId: string) => {
        socket.join(userId);
        notificationUsers.set(userId, socket.id);
      });

      socket.on("mark_read", async ({ notificationIds }) => {
        try {
          await Notification.updateMany(
            { _id: { $in: notificationIds } },
            { $set: { isRead: true } }
          );
        } catch (error) {
          console.error("Error marking notifications as read:", error);
        }
      });

      socket.on("disconnect", () => {
        for (const [userId, socketId] of notificationUsers.entries()) {
          if (socketId === socket.id) {
            notificationUsers.delete(userId);
            break;
          }
        }
      });
    });

    // ADMIN NOTIFICATION NAMESPACE
    const adminNotificationNamespace = io.of("/admin-notifications");
    adminNotificationNamespace.on("connection", (socket) => {
      socket.on("join", () => {
        socket.join("admin-notifications");
      });

      socket.on("mark_read", async ({ notificationIds }) => {
        try {
          await Notification.updateMany(
            { _id: { $in: notificationIds } },
            { $set: { isRead: true } }
          );
        } catch (error) {
          console.error("Error marking admin notifications as read:", error);
        }
      });
    });

    console.log("✅ Socket.IO initialized successfully with all namespaces");
    return io;
  } catch (error) {
    console.error("❌ Failed to initialize Socket.IO:", error);
    throw error;
  }
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};

export const isUserOnline = (userId: string): boolean => {
  return onlineUsers.has(userId);
};

// Notification helper functions
export const sendUserNotification = (
  userId: string | mongoose.Types.ObjectId,
  notification: any
) => {
  const io = getIO();
  io.of("/user-notifications")
    .to(`user_${userId}`)
    .emit("new_notification", notification);
};

export const sendAdminNotification = (notification: any) => {
  const io = getIO();
  io.of("/admin-notifications")
    .to("admin")
    .emit("new_notification", notification);
};

export const joinNotificationRoom = (
  userId: string | mongoose.Types.ObjectId
) => {
  const io = getIO();
  io.of("/user-notifications").socketsJoin(`user_${userId}`);
};

export const joinAdminNotificationRoom = () => {
  const io = getIO();
  io.of("/admin-notifications").socketsJoin("admin");
};

export const leaveNotificationRoom = (
  userId: string | mongoose.Types.ObjectId
) => {
  const io = getIO();
  io.of("/user-notifications").socketsLeave(`user_${userId}`);
};

export const leaveAdminNotificationRoom = () => {
  const io = getIO();
  io.of("/admin-notifications").socketsLeave("admin");
};
