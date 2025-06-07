import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import Notification from "../models/Notification";
import mongoose from "mongoose";

let io: SocketIOServer;

// Store online users for notifications
const notificationUsers = new Map<string, string>(); // userId -> socketId

export const initializeNotificationSocket = (
  httpServer: HTTPServer
): SocketIOServer => {
  try {
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
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

    console.log("connected notification socket")
    return io;
  } catch (error) {
    console.error("Failed to initialize notification socket:", error);
    throw error;
  }
};

export const getNotificationIO = (): SocketIOServer => {
  if (!io) {
    throw new Error("Notification Socket.IO not initialized");
  }
  return io;
};

// Send notification to a specific user
export const sendUserNotification = (
  userId: string | mongoose.Types.ObjectId,
  notification: any
) => {
  const io = getNotificationIO();
  io.to(`user_${userId}`).emit("new_notification", notification);
};

// Send notification to all admin users
export const sendAdminNotification = (notification: any) => {
  const io = getNotificationIO();
  io.to("admin").emit("new_notification", notification);
};

// Join user to their notification room
export const joinNotificationRoom = (
  userId: string | mongoose.Types.ObjectId
) => {
  const io = getNotificationIO();
  io.socketsJoin(`user_${userId}`);
};

// Join admin to notification room
export const joinAdminNotificationRoom = () => {
  const io = getNotificationIO();
  io.socketsJoin("admin");
};

// Leave user from their notification room
export const leaveNotificationRoom = (
  userId: string | mongoose.Types.ObjectId
) => {
  const io = getNotificationIO();
  io.socketsLeave(`user_${userId}`);
};

// Leave admin from notification room
export const leaveAdminNotificationRoom = () => {
  const io = getNotificationIO();
  io.socketsLeave("admin");
};
