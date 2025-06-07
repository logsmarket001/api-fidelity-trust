import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import Notification from "../models/Notification";

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

export const sendUserNotification = (userId: string, notification: any) => {
  io.of("/user-notifications")
    .to(userId)
    .emit("new_notification", notification);
};

export const sendAdminNotification = (notification: any) => {
  io.of("/admin-notifications")
    .to("admin-notifications")
    .emit("new_notification", notification);
};
